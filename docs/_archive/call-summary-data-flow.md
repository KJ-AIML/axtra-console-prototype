# Call Summary - Complete Data Flow Specification

## 📊 Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW: END CALL → SUMMARY                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │   FRONTEND   │      │   BACKEND    │      │  AI AGENT    │              │
│  │  (Browser)   │ ───> │   (Node.js)  │ ───> │  (LLM/AI)    │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│         │                    │                    │                        │
│         │ 1. endCallAndSave  │                    │                        │
│         │ 2. POST /complete  │                    │                        │
│         │───────────────────>│                    │                        │
│         │                    │ 3. Call            │                        │
│         │                    │    generateSummary │                        │
│         │                    │───────────────────>│                        │
│         │                    │                    │ 4. Process             │
│         │                    │                    │    + Return            │
│         │                    │<───────────────────│                        │
│         │                    │ 5. Save to DB      │                        │
│         │                    │ 6. Return response │                        │
│         │<───────────────────│                    │                        │
│         │ 7. Show modal      │                    │                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ FRONTEND INPUT (What exists in browser during call)

### LiveKit Store State (`useLiveKitStore.ts`)

```typescript
// State accumulated during the call:
interface LiveKitState {
  // Core identifiers
  callSessionId: "call-uuid-123",      // From backend when call starts
  scenarioId: "billing-dispute-01",    // Current training scenario
  
  // Call metrics
  callDuration: 172,                   // Seconds (2:52)
  
  // Transcript array (accumulated real-time)
  transcripts: [
    {
      id: "timestamp-0",
      speaker: "customer",             // 'customer' | 'operator'
      text: "นี่คือครั้งที่สองแล้วนะคะ! คุณจะมาเรียกเก็บเงินกันอีกแล้ว!",
      timestamp: "00:04",              // Formatted duration
      emotion?: "angry"
    },
    {
      id: "timestamp-1",
      speaker: "operator",
      text: "ขออภัยค่ะ ฉันจะช่วยดูเรื่องค่าใช้จ่ายให้ค่ะ...",
      timestamp: "00:09"
    },
    // ... more entries
  ],
  
  // Coaching history (from AXTRA Copilot real-time)
  coachingHistory: [
    {
      analysisId: 1,
      timestamp: 1234567890,
      cards: [
        {
          title: "ลูกค้าโกรธ",
          detail: "ลูกค้าแสดงอารมณ์โกรธและผิดหวัง...",
          action: "แสดงความเข้าใจและขอโทษ...",
          status: "danger"               // 'danger' | 'warning' | 'success' | 'info'
        },
        {
          title: "Gold Tier Benefits",
          detail: "ลูกค้าเป็น Gold Tier...",
          action: "เสนอสิทธิประโยชน์ระดับ Gold...",
          status: "success"
        },
        {
          title: "การยกเลิกบริการ",
          detail: "ลูกค้าแสดงความต้องการยกเลิก...",
          action: "ใช้กลยุทธ์การรักษาลูกค้า...",
          status: "warning"
        }
      ],
      script: {
        summary: "สรุปสถานการณ์...",
        suggestion: "ขอโทษที่คุณลูกค้าประสบปัญหานี้..."
      }
    }
  ]
}
```

---

## 2️⃣ FRONTEND → BACKEND REQUEST

### API Call: `POST /api/calls/complete`

```typescript
// From: endCallAndSave() in useLiveKitStore.ts
// Body sent to backend:

{
  "callId": "call-uuid-123",                    // string - session ID
  "durationSeconds": 172,                       // number - total seconds
  "totalTurns": 6,                              // number - transcript.length
  "customerSentiment": "angry",                 // string - derived from last coaching card
                                                // 'angry' | 'frustrated' | 'happy' | 'neutral'
  
  "transcripts": [                              // Array<TranscriptEntry>
    {
      "speaker": "customer",                    // 'customer' | 'operator'
      "text": "นี่คือครั้งที่สองแล้วนะคะ!...",
      "timestamp": "00:04"                      // string - formatted time
    },
    {
      "speaker": "operator",
      "text": "ขออภัยค่ะ ฉันจะช่วยดูเรื่อง...",
      "timestamp": "00:09"
    }
    // ... more entries
  ],
  
  "coachingHistory": [                          // Array<CoachingData>
    {
      "analysis_id": 1,                         // number - sequence number
      "cards": [                                // Array<CoachingCard> (always 3)
        {
          "title": "ลูกค้าโกรธ",
          "detail": "ลูกค้าแสดงอารมณ์โกรธ...",
          "action": "แสดงความเข้าใจและขอโทษ...",
          "status": "danger"                    // 'danger' | 'warning' | 'success' | 'info'
        },
        {
          "title": "Gold Tier Benefits",
          "detail": "ลูกค้าเป็น Gold Tier...",
          "action": "เสนอสิทธิประโยชน์...",
          "status": "success"
        },
        {
          "title": "การยกเลิกบริการ",
          "detail": "ลูกค้าแสดงความต้องการยกเลิก...",
          "action": "ใช้กลยุทธ์การรักษาลูกค้า...",
          "status": "warning"
        }
      ],
      "script": {                               // CoachingScript
        "summary": "สรุปสถานการณ์...",
        "suggestion": "ขอโทษที่คุณลูกค้าประสบปัญหานี้..."
      }
    }
  ]
}
```

---

## 3️⃣ BACKEND INPUT (What backend receives)

### CompleteCallRequest Type (`server/call-sessions.ts`)

```typescript
interface CompleteCallRequest {
  call_id: string;                              // "call-uuid-123"
  duration_seconds: number;                     // 172
  total_turns: number;                          // 6
  customer_sentiment: string;                   // "angry"
  transcripts: TranscriptEntry[];               // Full conversation
  coaching_history: CoachingData[];             // All coaching updates
  final_score?: number;                         // Optional - calculated by backend
}

interface TranscriptEntry {
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
}

interface CoachingData {
  analysis_id: number;
  cards: {
    title: string;
    detail: string;
    action: string;
    status: string;                              // 'danger' | 'warning' | 'success' | 'info'
  }[];
  script: {
    summary: string;
    suggestion: string;
  };
}
```

---

## 4️⃣ AI AGENT INPUT (What goes to LLM)

### Current: Mock Generator (`generateMockSummary`)

```typescript
// Currently uses simple keyword matching:
function generateMockSummary(
  transcripts: TranscriptEntry[],     // Full transcript array
  coachingHistory: CoachingData[]     // All coaching history
): CallSummary {
  // Simple analysis:
  // 1. Join all customer messages
  // 2. Count angry/happy keywords
  // 3. Check last messages for resolution
  // 4. Return structured summary
}
```

### Future: Real AI Agent Input

```typescript
// What to send to your LangGraph/LLM workflow:

const aiAgentInput = {
  // Call metadata
  duration_seconds: 172,
  total_turns: 6,
  customer_sentiment: "angry",
  
  // Full transcript (for short calls < 10 min)
  // OR section summaries (for long calls > 10 min)
  conversation: [
    { role: "customer", content: "นี่คือครั้งที่สองแล้วนะคะ!...", time: "00:04" },
    { role: "operator", content: "ขออภัยค่ะ ฉันจะช่วยดู...", time: "00:09" },
    // ...
  ],
  
  // Coaching guidance provided during call
  coaching_insights: [
    {
      timestamp: "00:45",
      emotion_detected: "angry",
      suggestions_used: [
        "แสดงความเข้าใจและขอโทษ",
        "เสนอสิทธิประโยชน์ Gold Tier"
      ]
    }
  ],
  
  // Scenario context (optional, for better analysis)
  scenario_type: "billing_dispute",
  persona: "angry_gold_tier_customer"
};
```

### LLM Prompt Template (Example)

```typescript
const summaryPrompt = `
You are a call center training analyst. Analyze this practice call transcript.

CALL METADATA:
- Duration: ${duration} seconds
- Total exchanges: ${turns}
- Customer sentiment: ${sentiment}

CONVERSATION TRANSCRIPT:
${formattedTranscript}

COACHING PROVIDED:
${formattedCoaching}

TASK:
Provide a summary of this training call with the following:

1. SUMMARY: 2-3 sentences describing what happened
2. KEY_POINTS: Array of 3-5 important facts from the call
3. STRENGTHS: What the trainee did well (2-3 points)
4. IMPROVEMENTS: Areas to improve (2-3 points)
5. CUSTOMER_SATISFACTION: Score 1-5 (1=very unhappy, 5=very satisfied)
6. RESOLUTION_STATUS: One of ['resolved', 'pending', 'escalated', 'unresolved']
7. COACHING_EFFECTIVENESS: Score 1-5 on how well trainee used coaching

Respond in JSON format matching this TypeScript interface:
{
  summary: string;
  key_points: string[];
  strengths: string[];
  improvements: string[];
  customer_satisfaction: number;  // 1-5
  resolution_status: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coaching_effectiveness: number;  // 1-5
}
`;
```

---

## 5️⃣ AI AGENT OUTPUT (What LLM returns)

### CallSummary Type (`server/call-sessions.ts`)

```typescript
interface CallSummary {
  summary: string;                              // 2-3 sentence overview
  key_points: string[];                         // 3-5 bullet points
  strengths: string[];                          // 2-3 things done well
  improvements: string[];                       // 2-3 areas to improve
  customer_satisfaction: number;                // 1-5 scale
  resolution_status: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coaching_effectiveness: number;               // 1-5 scale
}
```

### Example Output

```json
{
  "summary": "Operator handled an angry Gold Tier customer's billing dispute. Customer was charged $298.50 instead of $149.99. Operator acknowledged the issue and began investigation but call ended before resolution.",
  "key_points": [
    "Gold Tier customer (CUST-2847) angry about double billing",
    "Billing discrepancy: $298.50 vs $149.99",
    "Operator acknowledged problem within first minute",
    "Customer threatened service cancellation",
    "Call ended during investigation phase"
  ],
  "strengths": [
    "Used customer's name (Sarah) to personalize interaction",
    "Acknowledged billing error promptly",
    "Maintained professional tone despite customer anger"
  ],
  "improvements": [
    "Could acknowledge Gold Tier status earlier",
    "Should offer immediate goodwill credit",
    "Provide estimated resolution timeline"
  ],
  "customer_satisfaction": 2,
  "resolution_status": "pending",
  "coaching_effectiveness": 4
}
```

---

## 6️⃣ BACKEND → FRONTEND RESPONSE

### API Response: `POST /api/calls/complete`

```typescript
{
  "success": true,
  "data": {
    "session": {
      "id": "call-uuid-123",
      "user_id": "user-xyz-789",
      "scenario_id": "billing-dispute-01",
      "status": "completed",
      "duration_seconds": 172,
      "total_turns": 6,
      "customer_sentiment": "angry",
      "final_score": 75,                    // Calculated from satisfaction + coaching
      "started_at": "2026-02-09T09:00:00Z",
      "ended_at": "2026-02-09T09:02:52Z"
    },
    "summary": {
      "summary": "Operator handled an angry Gold Tier customer's billing dispute...",
      "key_points": [
        "Gold Tier customer (CUST-2847) angry about double billing",
        "Billing discrepancy: $298.50 vs $149.99",
        "Operator acknowledged problem within first minute"
      ],
      "strengths": [
        "Used customer's name (Sarah)",
        "Acknowledged billing error promptly",
        "Maintained professional tone"
      ],
      "improvements": [
        "Could acknowledge Gold Tier status earlier",
        "Should offer immediate goodwill credit"
      ],
      "customer_satisfaction": 2,
      "resolution_status": "pending",
      "coaching_effectiveness": 4
    }
  }
}
```

---

## 7️⃣ DATABASE STORAGE (What gets saved)

### Tables Updated

```sql
-- 1. call_sessions (1 record)
UPDATE call_sessions SET
  status = 'completed',
  ended_at = '2026-02-09T09:02:52Z',
  duration_seconds = 172,
  total_turns = 6,
  customer_sentiment = 'angry',
  final_score = 75
WHERE id = 'call-uuid-123';

-- 2. call_transcripts (N records - one per message)
INSERT INTO call_transcripts (call_id, speaker, text, timestamp, sequence_order)
VALUES 
  ('call-uuid-123', 'customer', 'นี่คือครั้งที่สองแล้ว...', '00:04', 0),
  ('call-uuid-123', 'operator', 'ขออภัยค่ะ...', '00:09', 1),
  -- ... more rows

-- 3. call_coaching (N records - one per coaching update)
INSERT INTO call_coaching (
  call_id, analysis_id,
  card_1_title, card_1_detail, card_1_action, card_1_status,
  card_2_title, card_2_detail, card_2_action, card_2_status,
  card_3_title, card_3_detail, card_3_action, card_3_status,
  script_summary, script_suggestion
) VALUES (
  'call-uuid-123', 1,
  'ลูกค้าโกรธ', 'ลูกค้าแสดงอารมณ์...', 'แสดงความเข้าใจ...', 'danger',
  'Gold Tier Benefits', 'ลูกค้าเป็น Gold Tier...', 'เสนอสิทธิ...', 'success',
  'การยกเลิกบริการ', 'ลูกค้าแสดงความต้องการ...', 'ใช้กลยุทธ์...', 'warning',
  'สรุปสถานการณ์...', 'ขอโทษที่คุณลูกค้าประสบ...'
);

-- 4. call_summaries (1 record)
INSERT INTO call_summaries (
  call_id, summary, key_points, strengths, improvements,
  customer_satisfaction, resolution_status, coaching_effectiveness, generated_by
) VALUES (
  'call-uuid-123',
  'Operator handled an angry Gold Tier customer...',
  '["Gold Tier customer...", "Billing discrepancy...", ...]',
  '["Used customer name...", "Acknowledged billing error...", ...]',
  '["Could acknowledge Gold Tier...", "Should offer goodwill...", ...]',
  2,
  'pending',
  4,
  'mock'  -- or 'ai' when using real AI
);

-- 5. user_scenarios (1 record - marks training complete)
UPDATE user_scenarios 
SET status = 'completed', score = 75, completed_at = NOW()
WHERE user_id = 'user-xyz-789' AND scenario_id = 'billing-dispute-01';
```

---

## 📋 Summary Table

| Step | Source | Destination | Data Type | Key Fields |
|------|--------|-------------|-----------|------------|
| 1 | Frontend State | Frontend Function | Internal | `transcripts[]`, `coachingHistory[]` |
| 2 | Frontend | Backend API | HTTP POST | `callId`, `duration`, `transcripts`, `coachingHistory` |
| 3 | Backend | AI Agent | Function Call | `transcripts[]`, `coachingHistory[]` |
| 4 | AI Agent | Backend | Return Object | `summary`, `key_points`, `strengths`, etc. |
| 5 | Backend | Frontend | HTTP Response | `session`, `summary` |
| 6 | Backend | Database | SQL | 4 tables updated |

---

## 🎯 Key Takeaways

1. **Frontend sends everything** - Full transcripts + coaching history
2. **Backend is orchestrator** - Receives data, calls AI, saves results
3. **AI input is simple** - Just transcripts + coaching (metadata optional)
4. **AI output is structured** - Fixed JSON format for consistent UI
5. **Database stores everything** - Full history for future QA analysis


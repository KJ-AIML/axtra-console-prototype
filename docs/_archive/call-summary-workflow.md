# Call Summary Workflow - Complete Visualization

*Based on your screenshot showing the Active Simulation (Billing Dispute scenario)*

---

## 📸 Current State (From Your Screenshot)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Sarah Thompson          Call in Progress          02:52       AXTRA Copilot   │
│  GOLD TIER                                   [🎙️][⏸️][🔴]    Real-time AI    │
│  CUST-2847                                                  Waiting...         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  👤 Customer: "นี่คือครั้งที่สองแล้วนะคะ! คุณจะมาเรียกเก็บเงินกันอีกแล้ว!"     │
│                                                                                 │
│  🎧 Operator: "ขออภัยค่ะ ฉันจะช่วยดูเรื่องค่าใช้จ่ายให้ค่ะ..."                   │
│                                                                                 │
│  👤 Customer: "ฉันชื่อ Sarah Thompson! Account ID CUST-2847..."                │
│                                                                                 │
│  🎧 Operator: "ขออนุญาตตรวจสอบยอดเงิน 2 รอบใน 3 เดือนที่ผ่านมา..."            │
│                                                                                 │
│  👤 Customer: "ใช่! $298.50 แทนที่จะเป็น $149.99..."                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow: From Call End to Summary

### Step 1: User Clicks "End Call" 🔴

```
User Action: Click 🔴 End Call Button
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: ActiveSimulation.tsx                             │
│  ─────────────────────────────                              │
│  handleEndCall() called                                     │
│  ├── setIsSaving(true)                                      │
│  │                                                          │
│  │   Show loading state: "Generating Summary..."            │
│  │                                                          │
│  └── await endCallAndSave()                                 │
│       │                                                     │
│       └── Collect all data from LiveKitStore:              │
│           ├── callSessionId: "call-uuid-123"               │
│           ├── callDuration: 172 (seconds)                  │
│           ├── totalTurns: 6 (exchanges)                    │
│           ├── transcripts: [Array of 6 messages]           │
│           └── coachingHistory: [Array of coaching data]    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
```

### Step 2: Frontend Prepares Data Package 📦

```
Data Package (JSON) sent to Backend:
{
  "callId": "call-abc-123",
  "durationSeconds": 172,
  "totalTurns": 6,
  "customerSentiment": "angry",  // From last emotion card
  "transcripts": [
    {
      "speaker": "customer",
      "text": "นี่คือครั้งที่สองแล้วนะคะ! คุณจะมาเรียกเก็บเงินกันอีกแล้ว!",
      "timestamp": "00:04"
    },
    {
      "speaker": "operator", 
      "text": "ขออภัยค่ะ ฉันจะช่วยดูเรื่องค่าใช้จ่ายให้ค่ะ...",
      "timestamp": "00:09"
    },
    {
      "speaker": "customer",
      "text": "ฉันชื่อ Sarah Thompson! Account ID CUST-2847...",
      "timestamp": "00:33"
    },
    {
      "speaker": "operator",
      "text": "ขออนุญาตตรวจสอบยอดเงิน 2 รอบใน 3 เดือนที่ผ่านมา...",
      "timestamp": "00:54"
    },
    {
      "speaker": "customer",
      "text": "ใช่! $298.50 แทนที่จะเป็น $149.99 ฉันไม่ได้...",
      "timestamp": "01:08"
    }
  ],
  "coachingHistory": [
    {
      "analysis_id": 1,
      "cards": [
        {
          "title": "ลูกค้าโกรธ",
          "detail": "ลูกค้าแสดงอารมณ์โกรธและผิดหวัง...",
          "action": "แสดงความเข้าใจและขอโทษ...",
          "status": "danger"
        },
        {
          "title": "Gold Tier Benefits",
          "detail": "ลูกค้าเป็น Gold Tier...",
          "action": "เสนอสิทธิประโยชน์ระดับ Gold...",
          "status": "success"
        },
        {
          "title": "การยกเลิกบริการ",
          "detail": "ลูกค้าแสดงความต้องการยกเลิก...",
          "action": "ใช้กลยุทธ์การรักษาลูกค้า...",
          "status": "warning"
        }
      ],
      "script": {
        "summary": "สรุปสถานการณ์...",
        "suggestion": "ขอโทษที่คุณลูกค้าประสบปัญหานี้..."
      }
    }
  ],
  "finalScore": null  // Calculated by backend
}
```

### Step 3: Backend Processing 🖥️

```
POST /api/calls/complete
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: server/call-sessions.ts                           │
│  ─────────────────────────────────                          │
│  completeCallSession(data)                                  │
│                                                             │
│  Step 1: Get session info                                   │
│  ├── user_id: "user-xyz-789"                               │
│  └── scenario_id: "billing-dispute-01"                     │
│                                                             │
│  Step 2: Generate Summary (MOCK AI)                        │
│  └── generateMockSummary(transcripts, coachingHistory)     │
│       │                                                     │
│       ├── Keyword Analysis:                                │
│       │   • "โกรธ", "ผิดหวัง" → Angry sentiment            │
│       │   • "ขออภัย", "ช่วยดู" → Apology attempt           │
│       │   • "CUST-2847", "$298.50" → Specific details      │
│       │                                                     │
│       ├── Resolution Detection:                            │
│       │   • Did agent resolve? → NO (conversation cut)     │
│       │   • Escalation? → NO                               │
│       │   • Pending? → YES                                 │
│       │                                                     │
│       └── Generate Output:                                 │
│           {                                                 │
│             "summary": "Operator attempted to handle...",  │
│             "key_points": [                                 │
│               "Billing dispute over $298.50 charge",       │
│               "Customer is Gold Tier member",              │
│               "Customer expressed anger and frustration"   │
│             ],                                              │
│             "strengths": [                                  │
│               "Used customer name (Sarah)",                │
│               "Attempted to investigate billing"           │
│             ],                                              │
│             "improvements": [                               │
│               "Could offer immediate credit",              │
│               "Should acknowledge Gold status earlier"     │
│             ],                                              │
│             "customer_satisfaction": 2,  // 1-5 scale      │
│             "resolution_status": "pending",                │
│             "coaching_effectiveness": 4   // Used cards    │
│           }                                                 │
│                                                             │
│  Step 3: Calculate Score                                   │
│  └── score = ((4 + 2) / 10) * 100 = 60%                   │
│                                                             │
│  Step 4: Save Everything                                   │
│  ├── UPDATE call_sessions → status='completed'             │
│  ├── INSERT call_transcripts (6 records)                   │
│  ├── INSERT call_coaching (1 record with 3 cards)          │
│  ├── INSERT call_summaries (1 record)                      │
│  └── UPDATE user_scenarios → status='completed', score=60  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
```

### Step 4: Backend Response to Frontend 📤

```
Response JSON:
{
  "success": true,
  "data": {
    "session": {
      "id": "call-abc-123",
      "user_id": "user-xyz-789",
      "scenario_id": "billing-dispute-01",
      "status": "completed",
      "duration_seconds": 172,
      "total_turns": 6,
      "customer_sentiment": "angry",
      "final_score": 60,
      "started_at": "2026-02-09T09:00:00Z",
      "ended_at": "2026-02-09T09:02:52Z"
    },
    "summary": {
      "summary": "The operator attempted to handle the customer's billing dispute but was interrupted before resolution. The customer (Sarah Thompson, Gold Tier) was angry about being charged $298.50 instead of $149.99.",
      "key_points": [
        "Billing dispute over duplicate charges ($298.50 vs $149.99)",
        "Customer is Gold Tier member (CUST-2847)",
        "Customer expressed anger about repeated billing issues",
        "Operator acknowledged the issue and started investigation"
      ],
      "strengths": [
        "Used customer's name (Sarah) to personalize",
        "Acknowledged the billing discrepancy promptly",
        "Attempted to investigate the issue"
      ],
      "improvements": [
        "Could offer immediate account credit as goodwill",
        "Should acknowledge Gold Tier status and benefits earlier",
        "Could provide timeline for resolution"
      ],
      "customer_satisfaction": 2,
      "resolution_status": "pending",
      "coaching_effectiveness": 4
    }
  }
}
```

### Step 5: Frontend Displays CallSummaryModal 🎯

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Call Summary                                                        [✕] [🔄]  │
│  Completed Feb 9, 2026 at 9:02 AM                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┬──────────────┬──────────────────┬────────────────────┐   │
│  │ ⏱️ Duration     │ 🗣️ Exchanges │ 🎯 Coaching      │ 📊 Resolution      │   │
│  │ 2:52            │ 6 turns       │ 3 suggestions    │ ⏳ Pending         │   │
│  └─────────────────┴──────────────┴──────────────────┴────────────────────┘   │
│                                                                                 │
│  [Overview] [Transcript] [Coaching History]                                     │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │  📊 SUMMARY                                                          │      │
│  │                                                                      │      │
│  │  The operator attempted to handle the customer's billing dispute    │      │
│  │  but was interrupted before resolution. The customer (Sarah         │      │
│  │  Thompson, Gold Tier) was angry about being charged $298.50         │      │
│  │  instead of $149.99.                                                │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│  ┌──────────────┬──────────────┬──────────────┐                                │
│  │ 😊 Satisfied │ 🎯 Effective │ 🏆 Score     │                                │
│  │ 2/5          │ 4/5          │ 60/100       │                                │
│  └──────────────┴──────────────┴──────────────┘                                │
│                                                                                 │
│  📋 KEY POINTS:                                                                 │
│  • Billing dispute over duplicate charges ($298.50 vs $149.99)                 │
│  • Customer is Gold Tier member (CUST-2847)                                    │
│  • Customer expressed anger about repeated billing issues                      │
│  • Operator acknowledged the issue and started investigation                   │
│                                                                                 │
│  💪 STRENGTHS (What you did well):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ ✅ Used customer's name (Sarah) to personalize                      │      │
│  │ ✅ Acknowledged the billing discrepancy promptly                    │      │
│  │ ✅ Attempted to investigate the issue                               │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│  🎯 AREAS FOR IMPROVEMENT:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ ⚠️ Could offer immediate account credit as goodwill                 │      │
│  │ ⚠️ Should acknowledge Gold Tier status and benefits earlier         │      │
│  │ ⚠️ Could provide timeline for resolution                            │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│  ┌─────────────────────────────────┬─────────────────────────────────────┐    │
│  │ [📥 Export Report]              │           [Done]                   │    │
│  └─────────────────────────────────┴─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌──────────────┐     Click      ┌──────────────────┐
│   USER       │ ─────────────> │  End Call Button │
│              │                │                  │
└──────────────┘                └────────┬─────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────┐
│  FRONTEND (React)                                     │
│  ─────────────────                                    │
│  • Collect: transcripts[], coachingHistory[]         │
│  • Calculate: duration, totalTurns                   │
│  • Determine: customerSentiment                      │
│  • POST /api/calls/complete                          │
└────────┬─────────────────────────────────────────────┘
         │ JSON Payload
         ▼
┌──────────────────────────────────────────────────────┐
│  BACKEND (Node.js)                                    │
│  ──────────────────                                   │
│  • Validate: callSessionId exists                    │
│  • Generate: Summary (AI/Mock)                       │
│  • Calculate: Score (0-100)                          │
│  • Save: 4 tables updated                            │
│  • Update: user_scenarios to 'completed'             │
└────────┬─────────────────────────────────────────────┘
         │ Response
         ▼
┌──────────────────────────────────────────────────────┐
│  FRONTEND (React)                                     │
│  ─────────────────                                    │
│  • Show: CallSummaryModal                            │
│  • 3 Tabs: Overview / Transcript / Coaching History  │
│  • Display: Score, Strengths, Improvements           │
└──────────────────────────────────────────────────────┘
```

---

## 🎭 What the AI Agent Expects to Return

### Current: Mock Summary Generator

```typescript
// server/call-sessions.ts
function generateMockSummary(transcripts, coachingHistory) {
  
  // INPUTS:
  // 1. transcripts: Array of {speaker, text, timestamp}
  // 2. coachingHistory: Array of {analysis_id, cards[], script}
  
  // PROCESSING:
  // 1. Join all customer text
  // 2. Count positive/negative keywords
  // 3. Check if resolution keywords present
  // 4. Count coaching cards used
  
  // OUTPUTS:
  return {
    summary: "String describing what happened",
    key_points: ["Array of 3-5 important facts"],
    strengths: ["What operator did well"],
    improvements: ["What to do better"],
    customer_satisfaction: 1-5,  // Based on sentiment
    resolution_status: "resolved|pending|escalated|unresolved",
    coaching_effectiveness: 1-5  // Based on cards used
  };
}
```

### Future: Your Real AI Node

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR AI NODE (Replace generateMockSummary)                │
│  ─────────────────────────────────────────                  │
│                                                             │
│  Input:                                                     │
│  ├── Full transcript (both sides)                          │
│  ├── Coaching cards shown during call                      │
│  ├── Scenario type (Billing Dispute)                       │
│  ├── Customer persona (Angry Gold Tier)                    │
│  └── Call metadata (duration, turns, etc)                  │
│                                                             │
│  Processing:                                                │
│  ├── Sentiment analysis (Thai language)                    │
│  ├── Conversation flow analysis                            │
│  ├── Compliance checking (did operator follow script?)     │
│  ├── Resolution evaluation                                 │
│  └── Coaching effectiveness (were tips helpful?)           │
│                                                             │
│  Output (Same structure, better quality):                  │
│  {                                                          │
│    "summary": "Detailed analysis...",                      │
│    "key_points": [...],                                    │
│    "strengths": [...],                                     │
│    "improvements": [...],                                  │
│    "customer_satisfaction": 2,                             │
│    "resolution_status": "pending",                         │
│    "coaching_effectiveness": 4                            │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Database Schema (What Gets Saved)

```
┌─────────────────────────────────────────────────────────────┐
│  call_sessions                                              │
│  ─────────────                                              │
│  id: "call-abc-123"                                         │
│  user_id: "user-xyz-789"                                    │
│  scenario_id: "billing-dispute-01"                         │
│  status: "completed"                                        │
│  duration_seconds: 172                                      │
│  total_turns: 6                                             │
│  customer_sentiment: "angry"                                │
│  final_score: 60                                            │
│  started_at: "2026-02-09T09:00:00Z"                        │
│  ended_at: "2026-02-09T09:02:52Z"                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├──>┌─────────────────────────┐
                              │   │ call_transcripts        │
                              │   │ (6 records)             │
                              │   │ • Customer messages     │
                              │   │ • Operator responses    │
                              │   │ • Timestamps            │
                              │   └─────────────────────────┘
                              │
                              ├──>┌─────────────────────────┐
                              │   │ call_coaching           │
                              │   │ (1 record)              │
                              │   │ • 3 card titles         │
                              │   │ • 3 card details        │
                              │   │ • 3 card actions        │
                              │   │ • script suggestion     │
                              │   └─────────────────────────┘
                              │
                              └──>┌─────────────────────────┐
                                  │ call_summaries          │
                                  │ (1 record)              │
                                  │ • summary text          │
                                  │ • key_points (JSON)     │
                                  │ • strengths (JSON)      │
                                  │ • improvements (JSON)   │
                                  │ • satisfaction: 2       │
                                  │ • resolution: pending   │
                                  │ • effectiveness: 4      │
                                  └─────────────────────────┘
```

---

## 🎬 Summary Modal - 3 Tabs Explained

### Tab 1: Overview 📊
Shows:
- Summary paragraph (AI-generated)
- Stats cards (Duration, Exchanges, Coaching, Resolution)
- Satisfaction scores (3 cards)
- Key points (bulleted list)
- Strengths (green badges)
- Improvements (amber badges)

### Tab 2: Transcript 🗣️
Shows:
- Full conversation history
- Color-coded by speaker (Customer = gray, Operator = blue)
- Timestamps
- Scrollable view

### Tab 3: Coaching History 🎯
Shows:
- Each coaching update (Analysis #1, #2, etc.)
- Expandable cards
- 3 cards per analysis (Emotion, Leverage, Strategy)
- Suggested script

---

## ✅ What Happens After Summary

```
User clicks "Done"
       │
       ▼
┌─────────────────────────────────────┐
│  1. resetState() clears LiveKit    │
│     - transcripts = []             │
│     - coachingHistory = []         │
│     - callSessionId = null         │
│                                    │
│  2. Return to Welcome Screen       │
│     - Show "Start Voice Call"      │
│                                    │
│  3. User can:                      │
│     a) Try Again (same scenario)  │
│     b) Exit to Simulations        │
│     c) Start new scenario         │
└─────────────────────────────────────┘
       │
       ▼
User navigates to Dashboard
       │
       ▼
Dashboard auto-refreshes
→ Shows new call in "Recent Calls"
→ Updates "Total Calls" count
→ Updates "Avg Score"
```

---

## 🎯 Key Takeaways

| Aspect | Details |
|--------|---------|
| **Trigger** | User clicks "End Call" |
| **Data Collected** | Transcripts, coaching cards, duration, sentiment |
| **Processing** | Backend generates summary (currently mock AI) |
| **Output** | Summary, scores, strengths, improvements |
| **Storage** | 4 tables updated (sessions, transcripts, coaching, summaries) |
| **UI** | 3-tab modal (Overview / Transcript / Coaching) |
| **After** | Data visible on Dashboard |

---

*This is the complete flow from the moment you click "End Call" to seeing the summary!* 🎉

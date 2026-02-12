# QA Implementation Summary

What's been built so far for the AI + Human QA system.

---

## ✅ Completed

### 1. Database Schema
**File:** `server/db.ts`

New tables created:
- `qa_config` - QA form configuration
- `qa_criteria` - 5 default criteria with AI prompts
- `ai_qa_results` - AI-generated QA scores
- `ai_qa_criteria_scores` - Detailed breakdown per criteria
- `human_qa_reviews` - Human reviewer scores
- `human_qa_criteria_scores` - Human scores per criteria
- `human_qa_comments` - Timestamped comments during audio review

**5 Default Criteria:**
1. Opening & Greeting
2. Empathy & Understanding
3. Problem Resolution
4. Professionalism
5. Closing & Next Steps

### 2. Python AI QA Agent
**Files:**
- `server/agent/python-livekit/agents/prompts/qa_prompts.py`
- `server/agent/python-livekit/agents/services/qa_analyzer.py`
- `server/agent/python-livekit/api/server.py` (updated)

**Features:**
- `/api/qa/analyze` endpoint on port 8001
- Gemini-powered analysis
- Scores each criteria 1-5
- Provides reasoning and evidence quotes
- Identifies timestamps
- Returns overall score (0-100)

### 3. Node.js QA Service
**Files:**
- `server/services/ai-qa-client.ts` - HTTP client to Python API
- `server/qa-review.ts` - Main QA service with DB operations
- `server/index.ts` (updated) - API routes

**API Endpoints:**
```
GET  /api/qa/queue           - Get pending review queue
GET  /api/qa/criteria        - Get QA criteria
GET  /api/qa/:callId         - Get complete QA data (AI + Human)
GET  /api/qa/ai/:callId      - Get AI QA result only
POST /api/qa/reviews         - Save human QA review
```

### 4. Auto-Trigger on Call Completion
**File:** `server/call-sessions.ts` (updated)

When a call ends:
1. ✅ Recording stops
2. ✅ Summary generated
3. ✅ Transcripts saved
4. ✅ Coaching history saved
5. ✅ **NEW: AI QA analysis triggered (async)**

The AI QA runs in the background after the call is saved.

---

## 🔄 Data Flow

```
User ends call
    │
    ▼
Complete call session
    │
    ├── Save recording
    ├── Generate summary ────► Python API (port 8001)
    ├── Save transcripts                │
    ├── Save coaching                   │
    │                                   ▼
    └── Trigger AI QA (async) ◄─── AI analyzes & scores
                │                           │
                ▼                           │
        Save to ai_qa_results             │
        Save criteria scores              │
        Status: pending_review            │
                │                           │
                ▼                           │
        QA Review Queue Page ◄────────────┘
                │
                ▼
        QA Review Detail Page
        - Audio player
        - AI results (reference)
        - Human scoring form
        - Submit review
                │
                ▼
        Save to human_qa_reviews
        Update ai_qa_results status: reviewed
```

---

## 📋 API Usage Examples

### Get QA Review Queue
```bash
GET /api/qa/queue
Authorization: Bearer {token}

Response:
[
  {
    "call_id": "uuid",
    "scenario_title": "Billing Dispute",
    "operator_name": "John Doe",
    "duration_seconds": 420,
    "ai_overall_score": 82,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Get Complete QA Data
```bash
GET /api/qa/{callId}
Authorization: Bearer {token}

Response:
{
  "ai_qa": {
    "overall_score": 82,
    "summary_feedback": "Good call overall...",
    "criteria_scores": [
      {
        "criteria_id": "qc_opening",
        "criteria_name": "Opening & Greeting",
        "score": 4,
        "reasoning": "Proper greeting...",
        "evidence_quote": "Hello, this is John...",
        "evidence_timestamp": 15
      }
    ]
  },
  "human_qa": null,  // Or review if exists
  "criteria": [...], // All criteria definitions
  "comparison": null // Or comparison if human review exists
}
```

### Submit Human QA Review
```bash
POST /api/qa/reviews
Authorization: Bearer {token}

Body:
{
  "call_id": "uuid",
  "overall_score": 85,
  "general_feedback": "Great job!",
  "status": "submitted",
  "criteria_scores": [
    {"criteria_id": "qc_opening", "score": 4, "comment": "Good"},
    {"criteria_id": "qc_empathy", "score": 5, "comment": "Excellent"}
  ],
  "comments": [
    {"timestamp_seconds": 120, "comment": "Good point here"}
  ]
}
```

---

## ⏳ Remaining: Frontend UI

### Pages to Build

1. **QA Review Queue Page** (`/qa-scoring`)
   - List calls with `status: pending_review`
   - Show AI preliminary scores
   - Click to review

2. **QA Review Detail Page** (`/qa-review/:callId`)
   - Audio player with transcript
   - AI QA results display (read-only reference)
   - Human QA scoring form (5 criteria)
   - Timestamped commenting
   - AI vs Human comparison
   - Submit/Draft actions

### Components Needed

```
src/
├── pages/
│   ├── QAReviewQueue.tsx      # List pending reviews
│   └── QAReviewDetail.tsx     # Review a specific call
├── components/
│   └── qa/
│       ├── AIQAResult.tsx     # Display AI analysis
│       ├── HumanQAForm.tsx    # Score input form
│       ├── QAScoreComparison.tsx  # AI vs Human
│       └── TimestampedComments.tsx # Audio-linked comments
└── stores/
    └── useQAStore.ts          # QA state management
```

---

## 🚀 Next Steps

1. **Build Frontend UI** (~4-5 hours)
   - QA Review Queue page
   - QA Review Detail page
   - Components
   - Store

2. **Test End-to-End**
   - Make a call
   - Verify AI QA generates
   - Review the call manually
   - Compare AI vs Human scores

---

## 🎯 Key Features Delivered

| Feature | Status |
|---------|--------|
| Database schema | ✅ Complete |
| 5 default criteria | ✅ Complete |
| Python AI QA agent | ✅ Complete |
| AI QA API endpoint | ✅ Complete |
| Node.js QA service | ✅ Complete |
| API routes | ✅ Complete |
| Auto-trigger on call end | ✅ Complete |
| Frontend UI | ⏳ Pending |

---

## 📊 Example AI QA Output

```json
{
  "overall_score": 82,
  "summary_feedback": "The operator demonstrated strong empathy and professionalism throughout the call. Opening was warm and set a positive tone. Problem resolution was effective, though could have been slightly faster. Closing was thorough with clear next steps.",
  "key_strengths": [
    "Excellent empathy and active listening",
    "Professional tone maintained throughout",
    "Clear resolution and next steps"
  ],
  "key_improvements": [
    "Could reduce hold time during research",
    "Offer proactive follow-up check"
  ],
  "criteria_scores": [
    {
      "criteria_id": "qc_opening",
      "criteria_name": "Opening & Greeting",
      "score": 5,
      "reasoning": "Warm greeting, introduced self clearly, set positive tone immediately",
      "evidence_quote": "Hello! Thank you for calling Axtra Support. This is Sarah. How may I help you today?",
      "evidence_timestamp": 8
    },
    {
      "criteria_id": "qc_empathy",
      "criteria_name": "Empathy & Understanding",
      "score": 5,
      "reasoning": "Demonstrated genuine empathy, acknowledged frustration, used emotional validation",
      "evidence_quote": "I completely understand how frustrating that must be. I'd feel the same way.",
      "evidence_timestamp": 45
    }
    // ... 3 more criteria
  ]
}
```

---

Ready to build the frontend UI?


---

## 🚀 Testing the QA System

### Terminal Setup (3 Terminals)

```bash
# Terminal 1: Frontend + Node.js Backend (auto-starts both)
npm run dev

# Terminal 2: Python Voice Agent + AXTRA Copilot
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev

# Terminal 3: Python AI Services (Summary + QA)
cd server/agent/python-livekit
uv run -m api.server
```

### Test Steps

1. **Open** http://localhost:3000 and login
2. **Start a voice call** and complete it
3. **Wait ~10-30 seconds** for AI QA to generate (happens automatically after call ends)
4. **Navigate to** http://localhost:3000/qa-scoring
5. **See your call** in the queue with AI preliminary score
6. **Click the call** to review
7. **Play audio** and add timestamped comments
8. **Adjust human scores** (defaults to AI scores)
9. **Add comments** per criteria
10. **Submit review**
11. **See AI vs Human comparison**

### What's Running on Each Port

| Port | Service | Started By |
|------|---------|------------|
| 3000 | Vite Frontend | `npm run dev` |
| 3001 | Node.js API | `npm run dev` (auto) |
| 8000 | Python Voice Agent | `uv run python livekit_agent_langchain.py dev` |
| 8001 | Python AI Services | `uv run -m api.server` |

> **Note:** `npm run dev` starts **both** the frontend (3000) and Node.js backend (3001) automatically via the Vite plugin!

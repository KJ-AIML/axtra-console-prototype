# QA Implementation Plan

AI QA Analyst + Human Review System

---

## 🎯 Design Decisions

### QA Form Configuration
- **One configurable QA form** with criteria
- Each criteria = a question/prompt for AI to evaluate
- AI scores 1-5 for each criteria with reasoning

### 5 Default Criteria (Customer Service)

| # | Criteria | Prompt for AI |
|---|----------|---------------|
| 1 | **Opening & Greeting** | Did the operator properly greet the customer, introduce themselves, and set a positive tone in the first 30 seconds? |
| 2 | **Empathy & Understanding** | Did the operator show genuine empathy, acknowledge the customer's feelings, and demonstrate understanding of their issue? |
| 3 | **Problem Resolution** | Did the operator effectively identify the problem, provide accurate information, and resolve the issue efficiently? |
| 4 | **Professionalism** | Did the operator maintain a professional demeanor, use appropriate language, and stay calm throughout the call? |
| 5 | **Closing & Next Steps** | Did the operator properly summarize the resolution, confirm customer satisfaction, and provide clear next steps if needed? |

---

## 🏗️ Architecture

### Same Python Service, New Endpoint

```
Existing: POST /api/summary/generate (port 8001)
New:      POST /api/qa/analyze    (port 8001)
```

### Data Flow

```
Call Ends
    │
    ▼
┌─────────────────┐
│ Save Recording  │
│ Save Summary    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Trigger AI QA Analysis  │
│ (async after summary)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AI QA Agent             │
│ - Parse transcript      │
│ - Score 5 criteria 1-5  │
│ - Find evidence quotes  │
│ - Identify timestamps   │
│ - Generate feedback     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Save AI QA Results      │
│ Status: pending_review  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ QA Review Queue Page    │
│ (shows pending calls)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Human QA Review         │
│ - Play audio            │
│ - See AI scores         │
│ - Score same criteria   │
│ - Add comments          │
│ - Submit review         │
└─────────────────────────┘
```

---

## 🗄️ Database Schema (Simplified)

```sql
-- QA Configuration (single row for now)
CREATE TABLE qa_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT DEFAULT 'Customer Service QA',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- QA Criteria (5 default rows)
CREATE TABLE qa_criteria (
  id TEXT PRIMARY KEY,
  config_id TEXT DEFAULT 'default',
  sort_order INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  ai_prompt TEXT NOT NULL,  -- The question for AI
  weight INTEGER DEFAULT 20  -- Each 20% = 100% total
);

-- AI QA Results (one per call)
CREATE TABLE ai_qa_results (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  overall_score INTEGER,  -- 0-100 (average of criteria)
  summary_feedback TEXT,  -- Overall AI feedback
  status TEXT DEFAULT 'pending_review',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id)
);

-- AI QA Criteria Scores (5 rows per call)
CREATE TABLE ai_qa_criteria_scores (
  id TEXT PRIMARY KEY,
  ai_qa_result_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  reasoning TEXT,
  evidence_quote TEXT,  -- Key quote from transcript
  evidence_timestamp INTEGER,  -- seconds
  FOREIGN KEY (ai_qa_result_id) REFERENCES ai_qa_results(id),
  FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
);

-- Human QA Reviews (one per call per reviewer)
CREATE TABLE human_qa_reviews (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  overall_score INTEGER,
  general_feedback TEXT,
  status TEXT DEFAULT 'draft',  -- draft, submitted
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Human QA Criteria Scores (5 rows per review)
CREATE TABLE human_qa_criteria_scores (
  id TEXT PRIMARY KEY,
  human_qa_review_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  FOREIGN KEY (human_qa_review_id) REFERENCES human_qa_reviews(id),
  FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
);

-- Human QA Comments (timestamped during audio playback)
CREATE TABLE human_qa_comments (
  id TEXT PRIMARY KEY,
  human_qa_review_id TEXT NOT NULL,
  timestamp_seconds INTEGER,  -- Position in audio when comment added
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (human_qa_review_id) REFERENCES human_qa_reviews(id)
);
```

---

## 🤖 AI QA Agent Prompt

```python
QA_ANALYSIS_PROMPT = """
You are an expert QA Analyst evaluating a customer service call.

CALL INFORMATION:
- Duration: {duration} seconds
- Total Turns: {turns}
- Scenario: {scenario_type}

TRANSCRIPT:
{transcript}

Evaluate this call on the following criteria. For each, provide:
1. Score (1-5): 1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent
2. Reasoning: Why you gave this score
3. Evidence: The most relevant quote from the transcript
4. Timestamp: Approximate time (in seconds) when this happened

CRITERIA 1 - Opening & Greeting:
Did the operator properly greet the customer, introduce themselves, and set a positive tone in the first 30 seconds?

CRITERIA 2 - Empathy & Understanding:
Did the operator show genuine empathy, acknowledge the customer's feelings, and demonstrate understanding of their issue?

CRITERIA 3 - Problem Resolution:
Did the operator effectively identify the problem, provide accurate information, and resolve the issue efficiently?

CRITERIA 4 - Professionalism:
Did the operator maintain a professional demeanor, use appropriate language, and stay calm throughout the call?

CRITERIA 5 - Closing & Next Steps:
Did the operator properly summarize the resolution, confirm customer satisfaction, and provide clear next steps if needed?

Respond in this JSON format:
{
  "overall_score": 85,
  "summary_feedback": "Overall, the operator handled the call well...",
  "criteria": [
    {
      "criteria_name": "Opening & Greeting",
      "score": 4,
      "reasoning": "Good greeting but could have been warmer...",
      "evidence_quote": "Hello, this is John speaking...",
      "evidence_timestamp": 5
    },
    ... (4 more criteria)
  ]
}
"""
```

---

## 📡 API Endpoints

### 1. Trigger AI QA (Auto after call)

```http
POST /api/qa/analyze
Content-Type: application/json

{
  "call_id": "uuid",
  "transcripts": [...],
  "duration_seconds": 420,
  "scenario_type": "billing_dispute"
}
```

### 2. Get QA Review Queue

```http
GET /api/qa/queue?status=pending_review
Authorization: Bearer {token}
```

### 3. Get AI QA Result for Call

```http
GET /api/qa/results/:callId
Authorization: Bearer {token}
```

### 4. Submit Human QA Review

```http
POST /api/qa/reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "call_id": "uuid",
  "criteria_scores": [
    {"criteria_id": "c1", "score": 4, "comment": "Good but rushed"},
    {"criteria_id": "c2", "score": 5, "comment": "Excellent empathy"},
    ...
  ],
  "overall_score": 88,
  "general_feedback": "Overall great call...",
  "comments": [
    {"timestamp_seconds": 120, "comment": "Good active listening here"}
  ]
}
```

---

## 🎨 UI Components

### 1. QA Review Queue Page
- List calls with `status: pending_review`
- Show AI preliminary score
- Filter by date, operator
- Click to review

### 2. QA Review Detail Page
```
┌─────────────────────────────────────────────────────────────┐
│  QA Review - Billing Dispute Call                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │ Audio Player │  │ AI QA Result (Reference)            │ │
│  │              │  │                                     │ │
│  │ [Play]       │  │ Overall: 80/100                     │ │
│  │ Timeline     │  │                                     │ │
│  │ with markers │  │ Opening:      4/5 ⭐⭐⭐⭐           │ │
│  │              │  │ Empathy:      5/5 ⭐⭐⭐⭐⭐         │ │
│  │ [Add Comment │  │ Problem Res:  3/5 ⭐⭐⭐             │ │
│  │  @ 2:15]     │  │ Professional: 4/5 ⭐⭐⭐⭐           │ │
│  │              │  │ Closing:      4/5 ⭐⭐⭐⭐           │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
│                                                             │
│  YOUR QA ASSESSMENT:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Opening:       [1][2][3][4][5]  AI:4  [Comment]    │   │
│  │ Empathy:       [1][2][3][4][5]  AI:5  [Comment]    │   │
│  │ Problem Res:   [1][2][3][4][5]  AI:3  [Comment]    │   │
│  │ Professional:  [1][2][3][4][5]  AI:4  [Comment]    │   │
│  │ Closing:       [1][2][3][4][5]  AI:4  [Comment]    │   │
│  │                                                     │   │
│  │ Overall: 82/100      AI: 80/100    Diff: +2        │   │
│  │                                                     │   │
│  │ General Feedback:                                   │   │
│  │ [________________Text Area________________]        │   │
│  │                                                     │   │
│  │ [Save Draft] [Submit Review]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Steps

### Step 1: Database (15 min)
- Create tables for qa_config, qa_criteria, ai_qa_results, etc.
- Insert 5 default criteria

### Step 2: Python AI QA Agent (1 hour)
- Add `/api/qa/analyze` endpoint to existing server
- Create LangGraph workflow or simple prompt chain
- Test with sample transcript

### Step 3: Node.js API Routes (30 min)
- GET /api/qa/queue
- GET /api/qa/results/:callId
- POST /api/qa/reviews

### Step 4: Frontend - QA Queue Page (1 hour)
- List pending reviews
- Show AI scores

### Step 5: Frontend - QA Review Detail (2 hours)
- Audio player
- AI results display
- Human scoring form
- Comment system
- Submit flow

**Total: ~5 hours**

---

Ready to implement? Should I start with Step 1 (Database)?

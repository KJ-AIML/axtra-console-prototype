# QA Scoring Vision Document

Comprehensive AI + Human QA system for contact center quality assurance.

---

## 🎯 Concept Overview

### The Problem
Current summary is too simple - it just gives basic metrics. Real contact centers need **deep quality analysis**:
- Did the operator follow company protocols?
- Was the tone appropriate for the situation?
- Did they miss opportunities to upsell/help?
- Were there compliance violations?

### The Solution
**Two-Phase QA System:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI QA ANALYST (Automatic)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Input: Call Recording + Transcript + Coaching History + QA Criteria        │
│                                                                              │
│  Process:                                                                    │
│  1. AI analyzes call against configurable criteria                          │
│  2. Generates scores for each criteria category                             │
│  3. Identifies specific moments (timestamps)                                │
│  4. Provides detailed feedback with examples                                │
│  5. Saves to database as "pending_human_review"                             │
│                                                                              │
│  Output: AI QA Report with scores, timestamps, recommendations              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HUMAN QA REVIEW (Manual)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Page: QA Scoring Review Queue                                              │
│                                                                              │
│  For each call waiting review:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ┌─────────────┐  ┌─────────────────────────────────────────────────┐│   │
│  │  │ Audio       │  │ QA Scoring Form (same criteria as AI)           ││   │
│  │  │ Player      │  │                                                 ││   │
│  │  │             │  │  Criteria 1: [1] [2] [3] [4] [5] ★ [AI: 4]    ││   │
│  │  │ [Play/Pause]│  │  Criteria 2: [1] [2] [3] [4] [5] ★ [AI: 3]    ││   │
│  │  │ [Timeline]  │  │  ...                                            ││   │
│  │  │             │  │                                                 ││   │
│  │  │ Comments    │  │  AI vs Human Comparison:                        ││   │
│  │  │ [Add at     │  │  ┌─────────────────────────────────────────┐   ││   │
│  │  │  timestamp] │  │  │ AI Score: 78% | Your Score: 82%        │   ││   │
│  │  │             │  │  │ Variance: +4% (Aligned)                │   ││   │
│  │  └─────────────┘  │  └─────────────────────────────────────────┘   ││   │
│  │                   │                                             ││   │
│  │  Transcript       │  Comments & Feedback:                         ││   │
│  │  (sync with       │  [________________________________]            ││   │
│  │   audio)          │  [________________________________]            ││   │
│  │                   │                                             ││   │
│  │  AI Feedback      │  [Save Draft] [Submit Review]                 ││   │
│  │  (reference)      │                                             ││   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QA SCORING SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. QA CRITERIA CONFIGURATION (Admin)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  QA Types:                                                          │   │
│  │  • Customer Service QA (5 criteria)                                 │   │
│  │  • Sales QA (6 criteria - includes upsell)                          │   │
│  │  • Technical Support QA (4 criteria)                                │   │
│  │  • Custom Company QA (configurable)                                 │   │
│  │                                                                     │   │
│  │  Each QA Type has:                                                  │   │
│  │  • Name, Description                                                │   │
│  │  • List of criteria with weights                                    │   │
│  │  • AI prompt instructions                                           │   │
│  │  • Passing score threshold                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. AI QA AGENT (Python - Post Call)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Trigger: After call completes & summary generated                  │   │
│  │                                                                     │   │
│  │  Input:                                                             │   │
│  │  • Full transcript                                                  │   │
│  │  • Audio (for tone analysis)                                        │   │
│  │  • Coaching history                                                 │   │
│  │  • QA Type criteria                                                 │   │
│  │                                                                     │   │
│  │  Process: LangGraph Workflow                                        │   │
│  │  • Transcript Analysis Node - Parse conversation                    │   │
│  │  • Criteria Scoring Node - Score each criteria 1-5                  │   │
│  │  • Timestamp Identification Node - Find key moments                 │   │
│  │  • Feedback Generation Node - Detailed recommendations              │   │
│  │                                                                     │   │
│  │  Output:                                                            │   │
│  │  • Scores per criteria                                              │   │
│  │  • Overall score                                                    │   │
│  │  • Timestamped feedback                                             │   │
│  │  • Pass/Fail status                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. HUMAN QA REVIEW (React Frontend)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Pages:                                                             │   │
│  │                                                                     │   │
│  │  A. QA Review Queue                                                 │   │
│  │     • List calls waiting for review (status: ai_completed)          │   │
│  │     • Filter by QA type, date, operator                             │   │
│  │     • Show AI preliminary score                                     │   │
│  │                                                                     │   │
│  │  B. QA Review Detail                                                │   │
│  │     • Audio player with transcript sync                             │   │
│  │     • AI QA report (reference only)                                 │   │
│  │     • Human QA form (same criteria)                                 │   │
│  │     • Timestamp-based commenting                                    │   │
│  │     • AI vs Human comparison                                        │   │
│  │     • Submit/Approve workflow                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 QA Criteria Configuration

### Example QA Types

#### 1. Customer Service QA

| Criteria | Weight | Description | AI Analysis Focus |
|----------|--------|-------------|-------------------|
| Greeting | 15% | Proper opening, identified self | First 30 seconds |
| Empathy | 20% | Showed understanding of issue | Emotional moments |
| Problem Resolution | 25% | Effectively solved the problem | Solution provided |
| Professionalism | 20% | Maintained professional tone | Throughout call |
| Closing | 20% | Proper wrap-up, next steps | Last 30 seconds |

#### 2. Sales QA

| Criteria | Weight | Description | AI Analysis Focus |
|----------|--------|-------------|-------------------|
| Needs Discovery | 20% | Asked qualifying questions | Early in call |
| Product Knowledge | 20% | Demonstrated expertise | Feature explanations |
| Upsell Attempt | 20% | Identified upgrade opportunities | Mentioned higher tiers |
| Objection Handling | 20% | Addressed concerns effectively | Pushback moments |
| Close | 20% | Asked for the sale | Closing techniques |

### Database Schema

```sql
-- QA Types (Configurable by Admin)
CREATE TABLE qa_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id TEXT,  -- For multi-tenant
  is_default BOOLEAN DEFAULT false,
  passing_score INTEGER DEFAULT 70,  -- 0-100
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- QA Criteria within a type
CREATE TABLE qa_criteria (
  id TEXT PRIMARY KEY,
  qa_type_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL,  -- Percentage (must sum to 100 per type)
  sort_order INTEGER,
  ai_prompt_instructions TEXT,  -- How AI should evaluate this
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_type_id) REFERENCES qa_types(id)
);

-- AI QA Results (Auto-generated)
CREATE TABLE ai_qa_results (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  qa_type_id TEXT NOT NULL,
  overall_score INTEGER,  -- 0-100
  status TEXT CHECK (status IN ('pending_human', 'reviewed', 'approved')),
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id),
  FOREIGN KEY (qa_type_id) REFERENCES qa_types(id)
);

-- AI QA Criteria Scores
CREATE TABLE ai_qa_criteria_scores (
  id TEXT PRIMARY KEY,
  ai_qa_result_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  reasoning TEXT,  -- Why AI gave this score
  evidence_quotes TEXT,  -- Specific quotes from transcript
  evidence_timestamps TEXT,  -- JSON array of timestamps
  FOREIGN KEY (ai_qa_result_id) REFERENCES ai_qa_results(id),
  FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
);

-- AI QA Timestamped Feedback
CREATE TABLE ai_qa_feedback (
  id TEXT PRIMARY KEY,
  ai_qa_result_id TEXT NOT NULL,
  timestamp_seconds INTEGER,  -- Position in audio
  feedback_type TEXT CHECK (feedback_type IN ('positive', 'negative', 'neutral')),
  comment TEXT,
  FOREIGN KEY (ai_qa_result_id) REFERENCES ai_qa_results(id)
);

-- Human QA Scores (Manual review)
CREATE TABLE human_qa_scores (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  qa_type_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  overall_score INTEGER,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved')),
  general_feedback TEXT,
  reviewed_at TEXT,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id),
  FOREIGN KEY (qa_type_id) REFERENCES qa_types(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Human QA Criteria Scores
CREATE TABLE human_qa_criteria_scores (
  id TEXT PRIMARY KEY,
  human_qa_score_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  FOREIGN KEY (human_qa_score_id) REFERENCES human_qa_scores(id),
  FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
);

-- Human QA Timestamped Comments (during audio playback)
CREATE TABLE human_qa_comments (
  id TEXT PRIMARY KEY,
  human_qa_score_id TEXT NOT NULL,
  timestamp_seconds INTEGER,
  comment TEXT,
  is_private BOOLEAN DEFAULT false,  -- If true, operator can't see
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (human_qa_score_id) REFERENCES human_qa_scores(id)
);
```

---

## 🤖 AI QA Agent Workflow

### LangGraph Nodes

```python
# 1. TRANSCRIPT_ANALYSIS_NODE
# Input: Full transcript
# Output: Structured conversation with sentiment per turn

# 2. CRITERIA_SCORING_NODE (runs for each criteria)
# Input: Transcript + Criteria definition
# Process:
#   - Find evidence supporting score
#   - Extract quotes
#   - Identify timestamps
# Output: Score 1-5 + reasoning + evidence

# 3. TIMESTAMP_IDENTIFICATION_NODE
# Input: All criteria scores
# Output: Key moments with feedback
#   - "2:15 - Good empathy shown"
#   - "4:30 - Missed upsell opportunity"

# 4. SUMMARY_GENERATION_NODE
# Input: All scores + feedback
# Output: Final report
```

### Example AI Prompt

```python
CRITERIA_SCORING_PROMPT = """
You are a QA Analyst evaluating a customer service call.

CRITERIA: {criteria_name}
DESCRIPTION: {criteria_description}

TRANSCRIPT:
{transcript}

Evaluate this call on the criteria above. Provide:
1. Score (1-5):
   1 = Poor, 2 = Below Average, 3 = Average, 4 = Good, 5 = Excellent
2. Reasoning: Why you gave this score
3. Evidence: Specific quotes from transcript
4. Timestamps: When these moments occurred

Respond in JSON format:
{
  "score": 4,
  "reasoning": "Operator showed good empathy...",
  "evidence": ["I understand how frustrating this must be..."],
  "timestamps": ["2:15", "3:45"]
}
"""
```

---

## 🎨 UI Flow

### 1. QA Review Queue Page

```
┌─────────────────────────────────────────────────────────────────┐
│  QA Review Queue                                    [Filter ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filters: [All Types ▼] [All Operators ▼] [Date Range ▼]       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚪ Billing Dispute - Sarah Thompson                       │   │
│  │    Operator: John Doe  |  Duration: 5:32                 │   │
│  │    AI QA Score: 78% (Pass) | Waiting for review          │   │
│  │    [Review Now]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚪ Sales Call - Premium Plan                              │   │
│  │    Operator: Jane Smith  |  Duration: 8:15               │   │
│  │    AI QA Score: 65% (Fail) | Waiting for review          │   │
│  │    [Review Now]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. QA Review Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue          QA Review: Billing Dispute              [Help ?]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │    AUDIO PLAYER           │  │  AI QA RESULT (Reference)               │ │
│  │                           │  │                                         │ │
│  │    [▶] ─────────── 5:32   │  │  Overall: 78% (Pass)                   │ │
│  │                           │  │                                         │ │
│  │  ┌─────────────────────┐  │  │  Criteria Scores:                       │ │
│  │  │                     │  │  │  • Greeting:      4/5 ★★★★☆            │ │
│  │  │   WAVEFORM          │  │  │  • Empathy:       5/5 ★★★★★            │ │
│  │  │   WITH CLICKABLE    │  │  │  • Problem Res:   3/5 ★★★☆☆            │ │
│  │  │   COMMENT MARKERS   │  │  │  • Professional:  4/5 ★★★★☆            │ │
│  │  │                     │  │  │  • Closing:       4/5 ★★★★☆            │ │
│  │  └─────────────────────┘  │  │                                         │ │
│  │                           │  │  Key Moments:                           │ │
│  │  [Add Comment @ 2:15]     │  │  • 1:30 - Good greeting                │ │
│  │                           │  │  • 3:45 - Missed empathy opportunity    │ │
│  └───────────────────────────┘  │  • 5:10 - Excellent closing            │ │
│                                 │                                         │ │
│  TRANSCRIPT:                    └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  00:15 Customer: I'm really frustrated...                          │   │
│  │  00:45 Operator: I understand... [💬 AI: Good empathy]             │   │
│  │  02:30 Customer: Can you help me?                                  │   │
│  │  02:35 Operator: No, we can't... [💬 AI: Poor - should offer alt] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  YOUR QA ASSESSMENT:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Greeting:        [1] [2] [3] [4] [5] ★  [AI: 4]  [Comment...]    │   │
│  │  Empathy:         [1] [2] [3] [4] [5] ★  [AI: 5]  [Comment...]    │   │
│  │  Problem Res:     [1] [2] [3] [4] [5] ★  [AI: 3]  [Comment...]    │   │
│  │  Professional:    [1] [2] [3] [4] [5] ★  [AI: 4]  [Comment...]    │   │
│  │  Closing:         [1] [2] [3] [4] [5] ★  [AI: 4]  [Comment...]    │   │
│  │                                                                     │   │
│  │  Overall: 82%                                  AI: 78% | Diff: +4%  │   │
│  │                                                                     │   │
│  │  General Feedback:                                                  │   │
│  │  [______________________________________________________________]  │   │
│  │                                                                     │   │
│  │  [💾 Save Draft]  [✓ Submit Review]  [🔄 Request Re-review]        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparison View

After human reviews, show variance analysis:

```
AI vs Human QA Comparison
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Overall:  AI 78%  vs  Human 82%  (Aligned ✓)              │
│                                                             │
│  Criteria Breakdown:                                        │
│  ┌─────────────────┬─────────┬──────────┬──────────┐       │
│  │ Criteria        │ AI      │ Human    │ Variance │       │
│  ├─────────────────┼─────────┼──────────┼──────────┤       │
│  │ Greeting        │ 4       │ 4        │ ✓ Same   │       │
│  │ Empathy         │ 5       │ 5        │ ✓ Same   │       │
│  │ Problem Res     │ 3       │ 4        │ ⚠ +1     │       │
│  │ Professional    │ 4       │ 4        │ ✓ Same   │       │
│  │ Closing         │ 4       │ 5        │ ⚠ +1     │       │
│  └─────────────────┴─────────┴──────────┴──────────┘       │
│                                                             │
│  Variance Explanation:                                      │
│  Human rated Problem Resolution higher because...          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema for QA types and criteria
- [ ] Admin UI to configure QA types
- [ ] Basic AI QA agent workflow

### Phase 2: AI QA Agent (Week 2)
- [ ] LangGraph workflow for criteria scoring
- [ ] Post-call processing trigger
- [ ] AI QA results storage

### Phase 3: Human Review UI (Week 3)
- [ ] QA Review Queue page
- [ ] QA Review Detail page
- [ ] Audio player with comment markers
- [ ] Scoring form

### Phase 4: Comparison & Analytics (Week 4)
- [ ] AI vs Human comparison view
- [ ] Variance analysis
- [ ] QA analytics dashboard

---

## ❓ Questions for You

1. **QA Types**: How many different QA types do you need? (Customer Service, Sales, Technical Support, etc.)

2. **Criteria per Type**: How many criteria per QA type? (3-6 typical)

3. **AI Service**: Should AI QA run:
   - Same Python service as summary (port 8001)?
   - Separate service?
   - Inline during summary generation?

4. **Scoring Scale**: 
   - 1-5 stars per criteria?
   - Or 1-10?
   - Weighted criteria?

5. **Human Reviewers**: 
   - Any authenticated user can review?
   - Only "supervisor" role?
   - Self-review allowed (operator reviews own call)?

6. **Pass/Fail**: 
   - Should there be pass/fail threshold?
   - What happens if operator fails? (retraining, manager notification?)

7. **Comments Privacy**:
   - Can operator see all QA comments?
   - Private comments for management only?

---

*This is a comprehensive vision. Let me know which parts to prioritize or modify!*

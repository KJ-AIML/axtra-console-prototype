# QA Scoring

Manual quality assurance scoring system for call recordings with AI comparison.

---

## 🎯 Overview

The QA Scoring system allows supervisors/managers to review call recordings and evaluate operator performance against standardized criteria. It supports comparing manual QA scores with AI-generated scores.

### Features

- **5-Category Rubric** - Professionalism, Empathy, Problem Solving, Script Adherence, Tone
- **Score Comparison** - QA vs AI vs Self (if operator self-scored)
- **Draft/Submitted/Approved** Workflow - Flexible review process
- **Comments & Notes** - Detailed feedback for each call
- **Call History** - Track scored calls over time

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         QA Scoring System                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │   Supervisor    │                                                     │
│  │   (Reviewer)    │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           │ 1. Select call from queue                                    │
│           ▼                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │  Recording      │────▶│   QA Score      │────▶│  Score          │    │
│  │  Detail Page    │     │   Form          │     │  Comparison     │    │
│  │                 │     │                 │     │                 │    │
│  │ - Audio player  │     │ - 5 categories  │     │ - QA score      │    │
│  │ - Transcript    │     │ - Comments      │     │ - AI score      │    │
│  │ - Coaching      │     │ - Save draft    │     │ - Difference    │    │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘    │
│           │                                                              │
│           │ 2. Submit score                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │   Database      │                                                     │
│  │   (qa_scores)   │                                                     │
│  └─────────────────┘                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 QA Rubric

### 5 Scoring Categories (1-5 Scale)

| Category | Description | 1 (Poor) | 5 (Excellent) |
|----------|-------------|----------|---------------|
| **Professionalism** | Maintains professional demeanor | Unprofessional behavior | Exemplary professionalism |
| **Empathy** | Shows understanding of customer | Dismissive of feelings | Makes customer feel heard |
| **Problem Solving** | Effectively resolves issues | Unable to resolve | Creative, effective solutions |
| **Script Adherence** | Follows approved scripts | Ignores scripts | Perfect adherence, adapts well |
| **Tone & Manner** | Appropriate communication | Rude or condescending | Perfect tone adaptation |

### Scoring Guide

```typescript
// QA_RUBRIC in server/qa-scoring.ts
const QA_RUBRIC = [
  {
    category: 'professionalism',
    description: 'Maintains professional demeanor throughout the call',
    criteria: [
      { score: 1, label: 'Poor', description: '...' },
      { score: 2, label: 'Below Average', description: '...' },
      { score: 3, label: 'Average', description: '...' },
      { score: 4, label: 'Good', description: '...' },
      { score: 5, label: 'Excellent', description: '...' },
    ]
  },
  // ... empathy, problem_solving, script_adherence, tone_manner
];
```

---

## 🚀 Workflow

### 1. Score a Call

```typescript
// Save QA score
POST /api/qa/scores
{
  "call_id": "call-uuid",
  "professionalism": 4,
  "empathy": 5,
  "problem_solving": 4,
  "script_adherence": 3,
  "tone_manner": 4,
  "overall_score": 80,  // Calculated or manual
  "strengths": "Good active listening...",
  "improvements": "Could improve script adherence...",
  "general_notes": "Overall good call...",
  "status": "submitted"  // or "draft"
}
```

### 2. Score Status Workflow

```
┌─────────┐    Save     ┌───────────┐    Submit    ┌───────────┐
│  Start  │────────────▶│   DRAFT   │─────────────▶│ SUBMITTED │
└─────────┘             └───────────┘              └─────┬─────┘
                                                         │
                              ┌──────────────────────────┘
                              │ Approve
                              ▼
                        ┌───────────┐
                        │  APPROVED │
                        └───────────┘
```

### 3. Score Comparison

Compare multiple scores for the same call:

```typescript
interface ScoreComparison {
  call_id: string;
  
  // QA Score (Manual)
  qa_overall: number;
  qa_breakdown: {
    professionalism: number;
    empathy: number;
    // ...
  };
  
  // AI Score (Generated)
  ai_overall: number;
  ai_satisfaction: number;
  ai_effectiveness: number;
  
  // Difference
  difference: number;  // QA - AI
  variance: 'aligned' | 'minor' | 'significant';
}
```

---

## 📡 API Endpoints

### Create/Update QA Score

```http
POST /api/qa/scores
Authorization: Bearer {token}
Content-Type: application/json

{
  "call_id": "call-uuid",
  "professionalism": 4,
  "empathy": 5,
  "problem_solving": 4,
  "script_adherence": 3,
  "tone_manner": 4,
  "overall_score": 80,
  "strengths": "...",
  "improvements": "...",
  "general_notes": "...",
  "status": "submitted"
}
```

### Get QA Score for Call

```http
GET /api/qa/scores/:callId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "qa-score-uuid",
  "call_id": "call-uuid",
  "scorer_id": "supervisor-uuid",
  "scored_at": "2024-01-15T10:30:00Z",
  "professionalism": 4,
  "empathy": 5,
  "problem_solving": 4,
  "script_adherence": 3,
  "tone_manner": 4,
  "overall_score": 80,
  "strengths": "Good active listening...",
  "improvements": "Could follow scripts more closely...",
  "general_notes": "Overall solid performance...",
  "status": "submitted"
}
```

### Get Score Summary (with AI comparison)

```http
GET /api/qa/scores/:callId/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "call_id": "call-uuid",
  "has_qa_score": true,
  "qa_score": { ... },
  "ai_score": {
    "customer_satisfaction": 4,
    "coaching_effectiveness": 3,
    "resolution_status": "resolved"
  },
  "score_comparison": {
    "qa_overall": 80,
    "ai_overall": 75,
    "difference": 5,
    "variance": "aligned"
  }
}
```

### List Calls for Review

```http
GET /api/qa/review-queue?status=pending&limit=20
Authorization: Bearer {token}
```

### Get QA Statistics

```http
GET /api/qa/stats?userId=xxx&startDate=2024-01-01
Authorization: Bearer {token}
```

---

## 🗄️ Database Schema

### qa_scores Table

```sql
CREATE TABLE qa_scores (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  scorer_id TEXT NOT NULL,
  scored_at TEXT NOT NULL,
  
  -- 5 Category Scores (1-5)
  professionalism INTEGER NOT NULL CHECK (professionalism BETWEEN 1 AND 5),
  empathy INTEGER NOT NULL CHECK (empathy BETWEEN 1 AND 5),
  problem_solving INTEGER NOT NULL CHECK (problem_solving BETWEEN 1 AND 5),
  script_adherence INTEGER NOT NULL CHECK (script_adherence BETWEEN 1 AND 5),
  tone_manner INTEGER NOT NULL CHECK (tone_manner BETWEEN 1 AND 5),
  
  -- Overall Score (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  
  -- Comments
  strengths TEXT,
  improvements TEXT,
  general_notes TEXT,
  
  -- Workflow Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (scorer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_qa_scores_call ON qa_scores(call_id);
CREATE INDEX idx_qa_scores_scorer ON qa_scores(scorer_id);
CREATE INDEX idx_qa_scores_status ON qa_scores(status);
```

---

## 🎨 UI Components

### QAScoreForm

Score input form with:
- 5 category sliders (1-5)
- Overall score calculation
- Comments text areas
- Save draft / Submit buttons

### ScoreComparison

Visual comparison showing:
- QA vs AI scores side-by-side
- Difference indicator (aligned/minor/significant)
- Radar chart for category breakdown
- Trend over time (if multiple calls)

### RecordingCard

Recording list item with:
- Call metadata (duration, turns, scenario)
- AI score badge
- QA status indicator
- Quick actions

---

## 📊 Score Calculation

### Overall Score Formula

```typescript
// Option 1: Average of categories (converted to 0-100)
overall = ((professionalism + empathy + problem_solving + script_adherence + tone_manner) / 25) * 100

// Option 2: Weighted average
overall = (
  professionalism * 0.20 +
  empathy * 0.25 +
  problem_solving * 0.25 +
  script_adherence * 0.15 +
  tone_manner * 0.15
) * 20  // Convert 1-5 to 0-100
```

### AI Score Normalization

```typescript
// Convert AI scores (1-5) to 0-100 for comparison
ai_overall = ((customer_satisfaction + coaching_effectiveness) / 10) * 100
```

### Variance Levels

| Difference | Variance Level |
|------------|----------------|
| 0-10 | Aligned ✅ |
| 11-20 | Minor ⚠️ |
| 21+ | Significant 🔴 |

---

## 🐛 Troubleshooting

### Score Not Saving

```bash
# Check call exists
GET /api/calls/:callId

# Check database constraints
# - All 5 categories must be 1-5
# - Overall score must be 0-100
```

### AI Score Missing

```bash
# Check AI summary generated
GET /api/calls/:callId/summary

# Check call_sessions table has ai_summary_data
```

---

## 📚 Related

- [AI Call Summary](./ai-call-summary.md)
- [Call Recording](./call-recording.md)
- [AXTRA Copilot](./axtra-copilot.md)

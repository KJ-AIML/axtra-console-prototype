# QA Scoring

Manual quality assurance scoring system for call recordings with AI comparison and flexible criteria configuration.

---

## 🎯 Overview

The QA Scoring system allows supervisors/managers to review call recordings and evaluate operator performance against customizable criteria. It supports comparing manual QA scores with AI-generated scores and offers flexible scoring types.

### Features

- **Flexible Criteria System** - Configure scale (1-N) or binary (yes/no) scoring types
- **Weighted Scoring** - Optional weights for each criteria
- **Required/Optional Criteria** - Mark criteria as required or optional
- **Score Comparison** - QA vs AI vs Self (if operator self-scored)
- **Draft/Submitted/Approved** Workflow - Flexible review process
- **Comments & Notes** - Detailed feedback for each call
- **Reviewed Calls Page** - View all completed QA reviews with statistics
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
│  │ - Audio player  │     │ - Dynamic       │     │ - QA score      │    │
│  │ - Transcript    │     │   criteria      │     │ - AI score      │    │
│  │ - Coaching      │     │ - Flexible      │     │ - Difference    │    │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘    │
│           │                                                              │
│           │ 2. Submit score                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                     │
│  │   Database      │                                                     │
│  │   (human_qa)    │                                                     │
│  └─────────────────┘                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 QA Criteria Configuration

### Flexible Scoring Types

Each criteria can be configured with different scoring types:

| Type | Description | Example |
|------|-------------|---------|
| **Scale** | 1 to max_score (configurable) | Professionalism (1-5), Knowledge (1-10) |
| **Binary** | Yes/No or Pass/Fail | Greeting used? (Yes/No) |

### Criteria Fields

```typescript
interface QACriterion {
  id: string;
  name: string;              // Display name
  description: string;       // Help text
  type: 'scale' | 'binary';  // Scoring type
  max_score?: number;        // For scale type (default: 5)
  is_required: boolean;      // Must be scored?
  weight?: number;           // Optional weight for calculation
  order_index: number;       // Display order
  is_active: boolean;        // Enabled/disabled
}
```

### Example Criteria Config

```typescript
// Default criteria set
const DEFAULT_QA_CRITERIA = [
  {
    id: 'qc_opening',
    name: 'Opening & Greeting',
    description: 'First impression and proper greeting',
    type: 'scale',
    max_score: 5,
    is_required: true,
    weight: 20,
    order_index: 1
  },
  {
    id: 'qc_empathy',
    name: 'Empathy & Understanding',
    description: 'Emotional intelligence',
    type: 'scale',
    max_score: 5,
    is_required: true,
    weight: 25,
    order_index: 2
  },
  {
    id: 'qc_script_compliance',
    name: 'Script Compliance',
    description: 'Followed required script',
    type: 'binary',
    is_required: false,
    order_index: 3
  }
];
```

---

## 🚀 Workflow

### 1. Score a Call

```typescript
// Save QA score with dynamic criteria
POST /api/qa/scores
{
  "call_id": "call-uuid",
  "criteria_scores": [
    {
      "criterion_id": "qc_opening",
      "score": 4,           // For scale: 1 to max_score
      "comment": "Good greeting but could be warmer"
    },
    {
      "criterion_id": "qc_script_compliance",
      "score": 1,           // For binary: 1 = Yes, 0 = No
      "comment": "Used required opening script"
    }
  ],
  "overall_score": 85,      // Calculated or manual
  "max_possible_score": 100,
  "strengths": "Good active listening...",
  "improvements": "Could improve closing...",
  "general_notes": "Overall good call...",
  "status": "submitted"     // or "draft"
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

### 3. Reviewed Calls Page

Access completed QA reviews at `/qa-reviewed`:

- **Statistics Overview** - Total reviewed, avg score, approval rate
- **Filter & Search** - By date, reviewer, score range
- **Comparison View** - AI vs Human scores side-by-side
- **Export Options** - Download reports

```typescript
// Get reviewed calls
GET /api/qa/reviewed?limit=20&offset=0

Response:
{
  "calls": [
    {
      "call_id": "...",
      "scenario_title": "Billing Dispute",
      "operator_name": "John Doe",
      "reviewer_name": "Supervisor A",
      "human_score": 85,
      "ai_score": 78,
      "score_diff": 7,
      "reviewed_at": "2024-01-15T10:30:00Z",
      "status": "approved"
    }
  ],
  "stats": {
    "total_reviewed": 150,
    "avg_human_score": 82.5,
    "avg_ai_score": 79.2,
    "approval_rate": 94
  }
}
```

---

## 📡 API Endpoints

### Criteria Management

```http
# Get all active criteria
GET /api/qa/criteria

# Create new criterion
POST /api/qa/criteria
{
  "name": "Professionalism",
  "description": "Maintains professional demeanor",
  "type": "scale",
  "max_score": 5,
  "is_required": true,
  "weight": 20
}

# Update criterion
PUT /api/qa/criteria/:id

# Delete criterion
DELETE /api/qa/criteria/:id
```

### Create/Update QA Score

```http
POST /api/qa/scores
Authorization: Bearer {token}
Content-Type: application/json

{
  "call_id": "call-uuid",
  "criteria_scores": [
    {"criterion_id": "qc_opening", "score": 4, "comment": "..."},
    {"criterion_id": "qc_empathy", "score": 5, "comment": "..."}
  ],
  "overall_score": 85,
  "max_possible_score": 100,
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
  "criteria_scores": [
    {
      "criterion_id": "qc_opening",
      "criterion_name": "Opening & Greeting",
      "score": 4,
      "max_score": 5,
      "comment": "Good greeting"
    }
  ],
  "overall_score": 85,
  "max_possible_score": 100,
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
    "qa_overall": 85,
    "ai_overall": 78,
    "difference": 7,
    "variance": "aligned"
  }
}
```

### List Calls for Review

```http
GET /api/qa/review-queue?status=pending&limit=20
Authorization: Bearer {token}
```

### Get Reviewed Calls

```http
GET /api/qa/reviewed?reviewer_id=xxx&limit=20&offset=0
Authorization: Bearer {token}
```

### Get QA Statistics

```http
GET /api/qa/stats?userId=xxx&startDate=2024-01-01
Authorization: Bearer {token}
```

---

## 🗄️ Database Schema

### qa_criteria Table

```sql
CREATE TABLE qa_criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('scale', 'binary')),
  max_score INTEGER DEFAULT 5,  -- For scale type
  is_required BOOLEAN DEFAULT true,
  weight INTEGER,               -- Optional weight
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### human_qa Table

```sql
CREATE TABLE human_qa (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  
  -- Flexible criteria scores stored as JSON
  criteria_scores TEXT NOT NULL,  -- JSON: [{criterion_id, score, comment}]
  
  -- Overall scoring
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  max_possible_score INTEGER DEFAULT 100,
  
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
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_human_qa_call ON human_qa(call_id);
CREATE INDEX idx_human_qa_reviewer ON human_qa(reviewer_id);
CREATE INDEX idx_human_qa_status ON human_qa(status);
CREATE INDEX idx_human_qa_reviewed_at ON human_qa(reviewed_at);
```

---

## 🎨 UI Components

### QAScoreForm

Dynamic score input form with:
- **Dynamic Criteria** - Renders based on configured criteria
- **Scale Sliders** - 1 to max_score for scale type
- **Binary Toggle** - Yes/No for binary type
- **Score Calculation** - Real-time overall score preview
- **Comments** - Per-criterion and general notes
- **Save draft / Submit buttons**

### ScoreComparison

Visual comparison showing:
- QA vs AI scores side-by-side
- Difference indicator (aligned/minor/significant)
- Criteria breakdown
- Trend over time (if multiple calls)

### QAReviewedCalls Page

`/qa-reviewed` page features:
- Statistics cards (total, avg score, approval rate)
- Filterable table of reviewed calls
- AI vs Human score comparison
- Quick view of review details

### RecordingCard

Recording list item with:
- Call metadata (duration, turns, scenario)
- AI score badge
- QA status indicator
- Quick actions

---

## 📊 Score Calculation

### Scale Criteria Scoring

```typescript
// Individual criterion percentage
criterion_percentage = (score / max_score) * 100

// Example: Score 4 out of 5
percentage = (4 / 5) * 100 = 80%
```

### Binary Criteria Scoring

```typescript
// Binary score conversion
percentage = score === 1 ? 100 : 0

// Example: Yes = 100%, No = 0%
```

### Overall Score Calculation

```typescript
// With weights (weighted average)
overall = sum(criterion_score * weight) / sum(weights)

// Without weights (simple average)
overall = sum(criterion_percentages) / count(criteria)

// Convert to 0-100 scale
final_score = Math.round(overall)
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
# - All required criteria must have scores
# - Scores must be within valid range (0 to max_score)
```

### Criteria Not Loading

```bash
# Check criteria are active
GET /api/qa/criteria

# Verify criteria exist in database
SELECT * FROM qa_criteria WHERE is_active = true;
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

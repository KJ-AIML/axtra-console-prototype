# QA Scoring System Analysis

Detailed analysis of the current QA Scoring implementation.

---

## ✅ What's Implemented

### Backend (`server/qa-scoring.ts`)

| Feature | Status | Notes |
|---------|--------|-------|
| **5-Category Rubric** | ✅ Complete | Professionalism, Empathy, Problem Solving, Script Adherence, Tone |
| **Save/Update Scores** | ✅ Complete | Upsert logic (create or update) |
| **Score Retrieval** | ✅ Complete | By ID, by call+scorer, all for call |
| **AI Comparison** | ✅ Complete | Compares QA vs AI scores |
| **Pending Review Queue** | ✅ Complete | Lists calls needing review |
| **Database Schema** | ✅ Complete | With proper indexes |

### Frontend (`src/components/qa/QAScoreForm.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| **5 Star Rating** | ✅ Complete | Visual star selection 1-5 |
| **Overall Score Calc** | ✅ Complete | Avg × 20 = 0-100 |
| **Notes Field** | ✅ Complete | Free text feedback |
| **Save/Reset** | ✅ Complete | UI actions (mock only) |

---

## 🔴 Critical Gap: Frontend Not Connected to Backend

The `QAScoreForm` component is **completely mock** - it doesn't actually call the API:

```typescript
// QAScoreForm.tsx line 51-56
const handleSave = async () => {
  setIsSaving(true);
  // ❌ MOCK SAVE - just simulates delay
  await new Promise(resolve => setTimeout(resolve, 500));
  onSave?.({ categories, overall: overallScore, notes });
  setIsSaving(false);
};
```

**Missing:**
- No API call to `POST /api/qa/scores`
- No integration with `useRecordingsStore`
- No loading real QA scores
- No draft/submitted status

---

## 🟡 Partial Implementations

### 1. QAScoring Page (`src/pages/QAScoring.tsx`)

**Current State:** Mock data only

```typescript
// Lines 8-45: Hardcoded mock data
const mockCallsForReview = [
  { id: 'call-1', scenario_title: 'Billing Dispute...', ai_score: {...} },
  // ...
];
```

**Missing:**
- ❌ Real API call to `GET /api/qa/review-queue`
- ❌ Integration with backend
- ❌ Real call selection flow

### 2. RecordingDetail Page

**Current State:** Has tabs for overview/transcript/coaching

**Missing:**
- ❌ QA Scoring tab (not implemented)
- ❌ Score comparison view
- ❌ AI vs QA comparison display

---

## 📊 Database Schema (Complete)

```sql
qa_scores
├── id (PK)
├── call_id (FK → call_sessions)
├── scorer_id (FK → users)
├── scored_at
├── professionalism (1-5)
├── empathy (1-5)
├── problem_solving (1-5)
├── script_adherence (1-5)
├── tone_manner (1-5)
├── overall_score (0-100)
├── strengths (TEXT)
├── improvements (TEXT)
├── general_notes (TEXT)
├── status (draft|submitted|approved)
└── created_at / updated_at
```

**Indexes:** ✅ `call_id`, `scorer_id`, `status`

---

## 🔧 API Endpoints (Complete but Unused)

| Endpoint | Implementation | Frontend Usage |
|----------|----------------|----------------|
| `POST /api/qa/scores` | ✅ Complete | ❌ Not used |
| `GET /api/qa/scores/:callId` | ✅ Complete | ❌ Not used |
| `GET /api/qa/scores/:callId/summary` | ✅ Complete | ❌ Not used |
| `GET /api/qa/review-queue` | ✅ Complete | ❌ Not used |
| `GET /api/qa/stats` | ✅ Complete | ❌ Not used |

---

## 🎯 Recommended Fixes (Priority Order)

### Priority 1: Connect Frontend to Backend (2-3 hours)

**1. Create QA API client**
```typescript
// src/lib/api-qa.ts
export async function saveQAScore(data: QAScoreInput): Promise<QAScore> {
  const response = await apiClient.post('/qa/scores', data);
  return response.data;
}

export async function getQAScore(callId: string): Promise<QAScore | null> {
  const response = await apiClient.get(`/qa/scores/${callId}`);
  return response.data;
}
```

**2. Update QAScoreForm to use real API**
```typescript
const handleSave = async () => {
  setIsSaving(true);
  try {
    await saveQAScore({
      call_id: callId,
      professionalism: categories[0].score,
      empathy: categories[1].score,
      // ...
      status: 'submitted'
    });
    showToast('Score saved successfully');
  } catch (error) {
    showError('Failed to save score');
  }
  setIsSaving(false);
};
```

**3. Add QA tab to RecordingDetail**
```typescript
// RecordingDetail.tsx tabs
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'coaching', label: 'Coaching History' },
  { id: 'qa', label: 'QA Scoring' },  // NEW
];
```

### Priority 2: Add Score Comparison (1 hour)

**Create ScoreComparison component integration:**
```typescript
// Fetch QA summary with AI comparison
const qaSummary = await getQASummary(callId);

// Display comparison
<ScoreComparison 
  qaScore={qaSummary.qa_score}
  aiScore={qaSummary.ai_score}
  comparison={qaSummary.score_comparison}
/>
```

### Priority 3: Build QA Review Queue (2 hours)

**Update QAScoring page:**
```typescript
// Replace mock data with real API
useEffect(() => {
  fetchPendingReviews();
}, []);

const fetchPendingReviews = async () => {
  const calls = await getPendingQAReviews();
  setReviewQueue(calls);
};
```

---

## 📈 Effort Estimate

| Task | Effort | Impact |
|------|--------|--------|
| Connect QAScoreForm to API | 1 hour | 🔴 Critical |
| Add QA tab to RecordingDetail | 1 hour | 🔴 Critical |
| Integrate ScoreComparison | 30 min | 🟡 Medium |
| Build QA Review Queue | 2 hours | 🟡 Medium |
| Add draft/submitted workflow | 1 hour | 🟢 Low |

**Total:** ~5.5 hours to fully functional QA system

---

## 🐛 Potential Issues

1. **No Authentication Check** - QA endpoints don't verify supervisor role
2. **Missing Validation** - Frontend doesn't validate scores 1-5
3. **No Concurrency Handling** - Two users could score same call simultaneously
4. **Missing Audit Trail** - No history of score changes

---

## 💡 Enhancement Ideas

1. **Score Calibration** - Show AI-QA variance trends across multiple calls
2. **Rubric Tooltips** - Show criteria descriptions on hover
3. **Audio Timestamp Sync** - Link QA comments to audio timestamps
4. **Batch Scoring** - Score multiple calls in sequence

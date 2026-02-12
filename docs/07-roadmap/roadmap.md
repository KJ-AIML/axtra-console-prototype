# AXTRA Console - Development Roadmap

This document outlines the current state and future plans for the AXTRA Console project.

---

## ✅ Phase 1: Core Platform (COMPLETED)

### Authentication & User Management
- [x] User registration/login with JWT
- [x] Session management
- [x] Protected routes
- [x] Demo account setup

### Dashboard
- [x] KPI metrics display
- [x] Skill velocity tracking
- [x] QA highlights
- [x] Scenario progress

### Training Simulations
- [x] 8 scenario types seeded
- [x] User progress tracking
- [x] Difficulty levels (Easy/Medium/Hard)
- [x] Simulation completion flow

---

## ✅ Phase 2: Voice AI & Real-Time Coaching (COMPLETED)

### LiveKit Integration
- [x] LiveKit Cloud setup
- [x] Token generation API
- [x] WebRTC voice calls
- [x] Browser audio handling

### AXTRA Copilot System
- [x] Parallel Voice Agent + Supervisor architecture
- [x] Google Gemini Realtime API integration
- [x] LangGraph 3-card analysis workflow
- [x] Real-time coaching data via LiveKit Data Channel
- [x] Trigger logic (3 turns / 300 chars / 30 seconds)
- [x] Frontend coaching UI (AxtraCopilot component)

### Post-Call System
- [x] Call session database schema
- [x] Transcript storage
- [x] Coaching history persistence
- [x] Mock summary generator
- [x] CallSummaryModal with 3 tabs
- [x] Simulation auto-completion

---

## 🚧 Phase 3: AI Enhancement (NEXT)

### Real AI Summary Generation
- **Current**: Mock keyword-based summary
- **Goal**: Integrate your custom AI node
- **Files to modify**:
  - `server/call-sessions.ts` - Replace `generateMockSummary()`
  - Create your summary node in `server/agent/python-livekit/`
- **Input**: Transcripts + Coaching History
- **Output**: Summary, Key Points, Strengths, Improvements, Satisfaction Score

### Sentiment Analysis
- [ ] Real-time emotion detection (not just card-based)
- [ ] Sentiment timeline graph
- [ ] Emotion intensity scoring

### Coaching Improvements
- [ ] ML-based trigger detection (not just turn/char/time thresholds)
- [ ] Dynamic persona adaptation
- [ ] Custom coaching cards per scenario type

---

## 📋 Phase 4: QA & Analytics (PLANNED)

### QA Scoring Interface
- [ ] List of completed calls for review
- [ ] Playback with transcript sync
- [ ] Coaching timeline overlay
- [ ] QA scoring rubric
- [ ] Comment/feedback system
- [ ] Score history tracking

### Call History
- [ ] Full call history page
- [ ] Filter by scenario, date, score
- [ ] Quick summary view
- [ ] Re-practice same scenario
- [ ] Export call data

### Analytics Dashboard
- [ ] Aggregate performance stats
- [ ] Average scores over time
- [ ] Improvement trends
- [ ] Most used coaching cards
- [ ] Time-to-resolution metrics
- [ ] Scenario difficulty analysis

---

## 🔮 Phase 5: Advanced Features (FUTURE)

### Enhanced Personas
- [ ] Dynamic persona builder
- [ ] Multi-language support
- [ ] Voice selection (different agents)
- [ ] Custom scenario creation

### Team Features
- [ ] Manager dashboard
- [ ] Team performance comparison
- [ ] Coaching effectiveness by agent
- [ ] Training assignment system

### Integration
- [ ] CRM integration (Salesforce, HubSpot)
- [ ] Calendar integration
- [ ] Notification system
- [ ] Webhook support

### Mobile
- [ ] Mobile-responsive design
- [ ] PWA support
- [ ] Mobile app (React Native?)

---

## 🎯 Immediate Next Steps

Based on current state, here are the recommended priorities:

### Priority 1: Real AI Summary (HIGH)
Replace the mock summary generator with your AI node:

```typescript
// server/call-sessions.ts
async function generateRealSummary(
  transcripts: TranscriptEntry[],
  coachingHistory: CoachingData[]
): Promise<CallSummary> {
  // TODO: Your AI node integration here
  // Input: transcripts[], coachingHistory[]
  // Output: { summary, key_points[], strengths[], improvements[], satisfaction, resolution_status }
}
```

### Priority 2: QA Scoring (MEDIUM)
Build the QA interface for reviewing calls:
- Route: `/qa-scoring`
- List view: All completed calls
- Detail view: Playback + scoring form

### Priority 3: Call History (MEDIUM)
Personal call history for operators:
- Route: `/recordings` (enhance existing)
- Filter and search
- Progress tracking

### Priority 4: Analytics (LOW)
Manager-level analytics dashboard:
- Route: `/insights` (enhance existing)
- Charts and trends
- Performance metrics

---

## Technical Debt & Improvements

### Performance
- [ ] Code splitting (currently ~874KB bundle)
- [ ] Image optimization
- [ ] Lazy loading for heavy components

### Testing
- [ ] Unit tests for call session service
- [ ] Integration tests for voice flow
- [ ] E2E tests for complete call flow

### Security
- [ ] httpOnly cookies (instead of localStorage)
- [ ] Rate limiting
- [ ] Input validation

### DevOps
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Production deployment guide

---

## API Expansion Ideas

| Endpoint | Purpose |
|----------|---------|
| `GET /api/analytics/user/:id` | User performance metrics |
| `GET /api/analytics/team` | Team performance (manager) |
| `POST /api/qa/score` | Submit QA score |
| `GET /api/coaching/tips` | General coaching tips |
| `POST /api/scenarios/custom` | Create custom scenario |

---

## Questions for Planning

1. **AI Summary**: What inputs does your summary node need? What outputs?
2. **QA Scoring**: What rubric/criteria should QA use to score calls?
3. **Analytics**: What metrics are most important to track?
4. **Personas**: Do you need more persona types beyond the current 8?
5. **Languages**: Is Thai support sufficient or need more languages?

---

*Last updated: 2026-02-09*
*Current version: MVP with Voice AI + Coaching*

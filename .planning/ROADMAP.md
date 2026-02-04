# Axtra Console - Product Roadmap

Current Status: **MVP Complete** ✅

---

## ✅ Completed (MVP)

### Authentication System
- [x] User registration with email/password
- [x] Login/logout with JWT tokens
- [x] Protected routes
- [x] Session management (7-day expiry)
- [x] Demo account (admin@axtra.local)

### Database (Turso/libsql)
- [x] User accounts table
- [x] Sessions table
- [x] Dashboard metrics table
- [x] Scenarios table (8 training scenarios)
- [x] User progress tracking

### Dashboard
- [x] KPI metrics display
- [x] Skill velocity card
- [x] Recommended training scenarios
- [x] QA highlights
- [x] Real data from database

### Training Simulations
- [x] 8 training scenarios (Billing, Technical, Sales, etc.)
- [x] Scenario filtering & search
- [x] Progress tracking (Not Started / In Progress / Completed)
- [x] 3-panel call interface
  - Left: Customer Data
  - Center: Call Transcription
  - Right: Axtra Copilot (AI guidance)
- [x] Real-time emotion analysis (mock)
- [x] AI suggestions (mock)
- [x] Call controls (mute, pause, end)

### UI/UX
- [x] Responsive layout
- [x] Collapsible sidebar
- [x] Error boundaries
- [x] Loading states (basic)
- [x] 67 passing tests

---

## 🎯 Next Steps (Prioritized)

### Phase 1: Polish & Bug Fixes 🔧
**Priority: HIGH**

- [ ] Add comprehensive loading states
  - [ ] Skeleton screens for all data loads
  - [ ] Loading spinners for async actions
  - [ ] Button loading states
  
- [ ] Improve error handling
  - [ ] User-friendly error messages
  - [ ] Toast notifications for actions
  - [ ] Retry mechanisms for failed requests
  
- [ ] Add empty states
  - [ ] No scenarios found
  - [ ] No call history
  - [ ] Empty dashboard states
  
- [ ] UI polish
  - [ ] Smooth transitions/animations
  - [ ] Hover effects consistency
  - [ ] Focus states for accessibility

### Phase 2: Simulation Scoring 🏆
**Priority: HIGH**

- [ ] Score calculation algorithm
  - [ ] Response time tracking
  - [ ] Sentiment analysis
  - [ ] Script adherence check
  
- [ ] Post-call summary page
  - [ ] Score display (0-100)
  - [ ] Breakdown by category
  - [ ] Areas for improvement
  
- [ ] Performance history
  - [ ] Progress over time
  - [ ] Skill improvement chart
  - [ ] Comparison with team average

### Phase 3: Active Calls (Real) 📞
**Priority: MEDIUM**

- [ ] Live call monitoring dashboard
  - [ ] List of ongoing calls
  - [ ] Call status (waiting, active, wrapping up)
  - [ ] Operator assignment
  
- [ ] Call detail view
  - [ ] Real-time transcription
  - [ ] Live AI suggestions
  - [ ] Supervisor monitoring

### Phase 4: Recordings Library 📹
**Priority: MEDIUM**

- [ ] List of recorded simulations
  - [ ] Filter by date, scenario, score
  - [ ] Search functionality
  
- [ ] Playback interface
  - [ ] Audio playback
  - [ ] Synced transcript
  - [ ] Timeline with AI insights
  
- [ ] Sharing & export
  - [ ] Share with supervisor
  - [ ] Export for training

### Phase 5: QA Scoring Interface ✓
**Priority: MEDIUM**

- [ ] Manual QA review page
  - [ ] Scoring rubrics
  - [ ] Checklist items
  
- [ ] Feedback system
  - [ ] Supervisor comments
  - [ ] Coaching notes
  - [ ] Action items

### Phase 6: Knowledge Base 📚
**Priority: LOW**

- [ ] Article management
  - [ ] Categories & tags
  - [ ] Search functionality
  - [ ] Rich text content
  
- [ ] Quick access
  - [ ] In-call knowledge suggestions
  - [ ] Bookmarked articles

### Phase 7: Advanced Features 🚀
**Priority: LOW**

- [ ] Team analytics
  - [ ] Leaderboards
  - [ ] Team performance dashboard
  
- [ ] Custom scenarios
  - [ ] Admin scenario builder
  - [ ] Custom personas
  
- [ ] Integrations
  - [ ] CRM integration
  - [ ] Calendar integration
  - [ ] Slack notifications

### Phase 8: Production Ready 🏭
**Priority: LOW**

- [ ] Deployment
  - [ ] Docker setup
  - [ ] CI/CD pipeline
  - [ ] Environment configs
  
- [ ] Security hardening
  - [ ] httpOnly cookies
  - [ ] Rate limiting
  - [ ] Input validation
  
- [ ] Monitoring
  - [ ] Error tracking (Sentry)
  - [ ] Analytics
  - [ ] Performance monitoring

---

## 📊 Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Polish | 1-2 days | Ready to start |
| Phase 2: Scoring | 2-3 days | Pending |
| Phase 3: Active Calls | 3-4 days | Pending |
| Phase 4: Recordings | 2-3 days | Pending |
| Phase 5: QA | 2-3 days | Pending |
| Phase 6: Knowledge Base | 2-3 days | Pending |
| Phase 7: Advanced | 1-2 weeks | Pending |
| Phase 8: Production | 1 week | Pending |

**Total MVP → Production: 4-6 weeks**

---

## 🎯 Current Recommendation

**Start with Phase 1: Polish & Bug Fixes**

Why:
1. Foundation is solid, needs refinement
2. Better UX = happier users
3. Easier to build on top of polished code
4. Quick wins for motivation

Then move to **Phase 2: Simulation Scoring** - this completes the core training loop.

---

*Last updated: 2026-02-04*

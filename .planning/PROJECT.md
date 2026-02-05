# Axtra Console - Project Status

## Overview

AI-Powered Call Center Training Platform with real-time coaching, simulation scenarios, and performance analytics.

**Current Status: MVP Complete** ✅

---

## ✅ Completed Features

### Authentication System
- JWT-based authentication with secure sessions
- User registration and login
- Protected routes
- 7-day session expiry
- Demo account: admin@axtra.local / admin123

### Database (Turso/libsql)
- Users, sessions, accounts tables
- Dashboard metrics storage
- 8 training scenarios with categories
- User progress tracking (user_scenarios)
- Skill velocity and QA highlights

### Dashboard
- Real-time metrics from database
- Skill velocity progress bar
- Recommended training scenarios
- QA highlights cards
- Responsive layout with sidebar navigation

### Training Simulations
- 8 AI-powered training scenarios:
  - Billing Dispute Resolution (Medium)
  - Technical Support Escalation (Hard)
  - New Customer Onboarding (Easy)
  - Complaint De-escalation (Hard)
  - Upsell Opportunity (Medium)
  - Service Cancellation Save (Hard)
  - Product Return Request (Easy)
  - Account Security Verification (Medium)
- Scenario filtering (category, difficulty)
- Search functionality
- Progress tracking (Not Started / In Progress / Completed)

### Active Call Interface
- 3-panel layout:
  - Left: Customer Data Panel (profile, contract, call history)
  - Center: Live Call Transcription with controls
  - Right: Axtra Copilot (AI suggestions, emotion monitoring)
- **Live Voice AI Integration** via LiveKit
  - Real-time WebRTC voice calls
  - AI Agent auto-joins rooms
  - GPT-4o Realtime API for conversations
  - 8 customer personas with unique voices
- Call controls (mute, pause, end)
- Quick action buttons

### Technical Stack
- React 19.2.4 + TypeScript 5.8
- Vite 6.2.0 with HMR
- Tailwind CSS v4
- Zustand v5 for state management
- Turso (libsql) database
- Vitest 4 + React Testing Library (67 tests passing)
- Custom HTTP server integrated with Vite dev server
- **LiveKit WebRTC** for voice calls
- **OpenAI GPT-4o Realtime** integration (via external agent service)

---

## 📋 Test Status

```
✓ 8 test files passed
✓ 67 tests passing
✓ 0 tests failing
```

Test Coverage:
- Utility functions (classnames)
- API client
- Components (Header, Sidebar, Dashboard, ErrorBoundary)
- Pages (Simulations index)
- App integration

---

## 🎯 Next Steps (See ROADMAP.md)

### Phase 1: Polish & Bug Fixes
- Add skeleton screens for all data loads
- Toast notifications for actions
- Empty states
- Smooth transitions/animations

### Phase 2: Simulation Scoring
- Score calculation algorithm
- Post-call summary page
- Performance history

### Phase 3: Active Calls (Real) ✅ COMPLETE
- ✅ LiveKit WebRTC voice calls
- ✅ AI Agent voice conversations
- Real-time transcription
- Supervisor monitoring

### Phase 4: Recordings Library
- Recorded simulations list
- Playback interface
- Sharing & export

### Phase 5: QA Scoring Interface
- Manual QA review page
- Feedback system
- Coaching notes

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (runs on port 3001)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Environment Variables

Create `.env.local`:
```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# LiveKit (for voice calls)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

---

## 📁 Project Structure

```
├── server/               # Backend API
│   ├── index.ts         # Main server with API routes
│   ├── db.ts            # Database schema & connection
│   ├── auth.ts          # Authentication service
│   ├── simulations.ts   # Training scenarios service
│   ├── dashboard.ts     # Dashboard data service
│   └── livekit.ts       # LiveKit token generation
├── src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── stores/          # Zustand stores
│   ├── lib/             # Utilities (api-client)
│   ├── utils/           # Helper functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── .planning/           # Project planning docs
│   ├── PROJECT.md       # This file
│   └── ROADMAP.md       # Feature roadmap
└── docs/                # Documentation
```

---

## 🏗️ Architecture

### Frontend
- React 19 with hooks
- Zustand for state management
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Custom HTTP server (Node.js)
- Integrated with Vite dev server
- JWT authentication
- RESTful API endpoints

### Database
- Turso (libsql) - SQLite for production
- Tables: users, sessions, accounts, scenarios, user_scenarios, user_metrics, skill_velocity, qa_highlights

### Voice/Video
- LiveKit Cloud (WebRTC)
- AI Agent service (separate, connects to rooms)
- OpenAI GPT-4o Realtime API

---

*Last updated: 2026-02-05*

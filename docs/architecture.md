# Axtra Console - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 19 Components                                        │    │
│  │  - Sidebar, Header, Dashboard, Pages                        │    │
│  │  - Simulations, ActiveCall, Login                           │    │
│  │  - AxtraCopilot (Real-time coaching)                        │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  React Router DOM v7 (Routing)                              │    │
│  │  - Protected routes, Auth guards                            │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  Zustand v5 (State Management)                              │    │
│  │  - useUserStore (auth)                                      │    │
│  │  - useSimulationStore (training)                            │    │
│  │  - useDashboardDataStore (KPIs)                             │    │
│  │  - useLiveKitStore (voice + coaching data)                  │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  API Client                                                 │    │
│  │  - Auth tokens, interceptors, error handling                │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          ▼ HTTP Requests
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js)                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  HTTP Server (port 3001)                                    │    │
│  │  - Route matching, CORS, JSON parsing                       │    │
│  └──────────────────────┬──────────────────────────────────────┘    │ 
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  Services                                                   │    │
│  │  - auth.ts (login, register, sessions)                      │    │
│  │  - dashboard.ts (metrics, progress)                         │    │
│  │  - simulations.ts (scenarios, progress)                     │    │
│  │  - livekit.ts (token generation)                            │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  Database (Turso/libsql)                                    │    │
│  │  - SQLite over HTTP, serverless                             │    │
│  └──────────────────────┬──────────────────────────────────────┘    │ 
└─────────────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket (WebRTC) + Data Channel
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LiveKit Cloud (Media Relay)                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SFU (Selective Forwarding Unit)                            │    │
│  │  - Routes audio/video between participants                  │    │
│  │  - Handles room management                                  │    │
│  │  - Routes data channel messages                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                          ▲
                          │ WebRTC + Data Channel
┌─────────────────────────┼───────────────────────────────────────────┐
│                      AI Agent (Python)                              │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │  Parallel Architecture                                      │    │
│  │                                                             │    │
│  │  ┌─────────────────────┐    ┌────────────────────────────┐  │    │
│  │  │ Voice Agent         │    │ Supervisor (LangGraph)     │  │    │
│  │  │                     │    │                            │  │    │
│  │  │ Gemini Realtime API │    │  ┌──────────────────────┐  │  │    │
│  │  │ - STT + LLM + TTS   │◄───│  │ Conversation Manager │  │  │    │
│  │  │ - Persona behavior  │    │  └──────────────────────┘  │  │    │
│  │  │                     │    │           ↓                │  │    │
│  │  │ conversation_item_│    │  ┌──────────────────────┐  │  │    │
│  │  │    added events   │───►│  │ 3-Card Analysis      │  │  │    │
│  │  │    (Agent speech) │    │  │ - Card 1: Emotion    │  │  │    │
│  │  └─────────────────────┘    │  │ - Card 2: Leverage   │  │  │    │
│  │                             │  │ - Card 3: Strategy   │  │  │    │
│  │  ┌─────────────────────┐    │  └──────────────────────┘  │  │    │
│  │  │ User Input Handler  │    │           ↓                │  │    │
│  │  │                     │◄───│  ┌──────────────────────┐  │  │    │
│  │  │ user_input_transcribed│  │ │ Script Generator     │  │  │    │
│  │  │    (Customer speech)│───►│  └──────────────────────┘  │  │    │
│  │  └─────────────────────┘    │           ↓                │  │    │
│  │                             │  LiveKit.publish_data()    │  │    │
│  │                             └────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AXTRA Copilot Architecture

The real-time coaching system uses a **parallel architecture** with two concurrent processes:

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          AXTRA Copilot System                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────┐     ┌─────────────────────────────┐  │
│  │     Main Voice Agent Process     │     │    Supervisor Process       │  │
│  │                                  │     │                             │  │
│  │  ┌──────────────────────────┐    │     │  ┌─────────────────────┐    │  │
│  │  │ Google Gemini Realtime   │    │     │  │  Conversation       │    │  │
│  │  │ - MultimodalModel        │    │     │  │  Manager            │    │  │
│  │  │ - STT + LLM + TTS        │    │     │  │                     │    │  │
│  │  └────────────┬─────────────┘    │     │  │ - Tracks turns      │    │  │
│  │               │                  │     │  │ - Calculates triggers│   │  │
│  │               ▼                  │     │  │ - Maintains buffer   │    │  │
│  │  ┌──────────────────────────┐    │     │  └──────────┬──────────┘    │  │
│  │  │ Event Handlers           │    │     │             │               │  │
│  │  │                          │    │     │  Triggers → │               │  │
│  │  │ user_input_transcribed   │────┼─────┼─────────────► (Queue)       │  │
│  │  │   → Customer turn        │    │     │             │               │  │
│  │  │                          │    │     │             ▼               │  │
│  │  │ conversation_item_added  │────┼─────┼──► [Agent turn recorded]    │  │
│  │  │   → Agent turn           │    │     │                             │  │
│  │  └──────────────────────────┘    │     │  ┌─────────────────────┐    │  │
│  │                                  │     │  │  LangGraph Workflow │    │  │
│  └──────────────────────────────────┘     │  │                     │    │  │
│                                            │  │ ┌───────┬───────┐   │    │  │
│                                            │  │ │ Card1 │ Card2 │   │    │  │
│                                            │  │ │ Card3 │ Script│   │    │  │
│                                            │  │ └───┬───┴───┬───┘   │    │  │
│                                            │  │     │Aggregator│     │    │  │
│                                            │  │     └────┬─────┘     │    │  │
│                                            │  │          │           │    │  │
│                                            │  └──────────┼───────────┘    │  │
│                                            │             │                │  │
│                                            │             ▼                │  │
│                                            │  publish_data(coaching_update) │  │
│                                            │                             │  │
└────────────────────────────────────────────┼─────────────────────────────┘  │
                                             │                                │
                                             ▼                                │
                                  LiveKit Data Channel                       │
                                             │                                │
                                             ▼                                │
                                  ┌─────────────────────┐                     │
                                  │  Frontend           │                     │
                                  │  AxtraCopilot.tsx   │                     │
                                  │  - 3 Coaching Cards │                     │
                                  │  - Suggested Script │                     │
                                  └─────────────────────┘                     │
                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Trigger Logic

Analysis is triggered when **any** of these conditions are met:

```python
# First analysis threshold
if buffer_size == 3 and not analyzed_before:
    return "Initial 3 turns complete"

# Periodic triggers
if buffer_size >= last_analysis_size + 3:  # Every 3 new turns
    return "Turns threshold reached"

if chars_since_last >= 300:  # Character threshold
    return "Character threshold reached"

if time_since_last >= 30:  # Time threshold (seconds)
    return "Time threshold reached"
```

### LangGraph Workflow

```
          START
            │
            ▼
    ┌───────────────┐
    │ Input Node    │
    │ Prepare data  │
    └───────┬───────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
┌──────┐┌──────┐┌──────┐
│Card 1││Card 2││Card 3│  ← Parallel execution
│Emotion│Leverage│Strategy│
└──┬───┘└──┬───┘└──┬───┘
   │       │       │
   └───────┼───────┘
           ▼
    ┌───────────────┐
    │ Aggregator    │
    │ - Combine     │
    │ - Suggest     │
    └───────┬───────┘
            │
            ▼
         END
```

### Data Flow (During Call)

```
1. Customer speaks
   ↓
2. Gemini Realtime transcribes (STT)
   ↓
3. Conversation Manager receives turn
   ↓
4. Check if analysis should trigger
   ↓
5. If triggered: Send to Supervisor queue
   ↓
6. LangGraph runs 3-card analysis (parallel)
   ↓
7. Aggregator generates suggested script
   ↓
8. Supervisor publishes via LiveKit data channel
   ↓
9. Frontend receives and displays coaching
```

### Post-Call Data Flow

```
1. User clicks "End Call"
   ↓
2. Frontend: endCallAndSave()
   - Disconnect from LiveKit room
   - Get final sentiment from coaching history
   - POST /api/calls/complete
   ↓
3. Backend: completeCallSession()
   - Save call session (duration, turns, sentiment, score)
   - Save all transcripts
   - Save coaching history
   - Generate summary (mock AI for now)
   - Update user_scenarios to "completed"
   ↓
4. Frontend receives response
   - Show CallSummaryModal
   - Display 3 tabs: Overview, Transcript, Coaching History
   ↓
5. User closes modal
   - resetState() clears local state
   - Back to welcome screen
```

---

## Application Flow

### 1. App Initialization

```
main.tsx
    ↓
Load index.css (Tailwind v4)
    ↓
Mount React to #root
    ↓
App.tsx
    ↓
ErrorBoundary (error handling)
    ↓
BrowserRouter (routing)
    ↓
AppContent
```

### 2. Auth Flow

```
User visits /login
    ↓
PublicRoute checks auth
    ↓
Not authenticated → Show Login
    ↓
User submits credentials
    ↓
POST /api/auth/login
    ↓
Server validates, creates session
    ↓
Returns JWT token
    ↓
useUserStore saves token
    ↓
Redirect to Dashboard
```

### 3. Dashboard Data Flow

```
Dashboard mounts
    ↓
useDashboardDataStore.fetchDashboardData()
    ↓
GET /api/dashboard
    ↓
Server validates JWT
    ↓
Query database (user_metrics, scenarios, etc.)
    ↓
Return JSON response
    ↓
Store updates state
    ↓
Components re-render with data
```

### 4. Simulation Flow

```
User clicks "Start Practice"
    ↓
useSimulationStore.startSimulation(id)
    ↓
POST /api/scenarios/:id/start
    ↓
Database: Update user_scenarios status
    ↓
Navigate to /simulations/:id
    ↓
ActiveSimulation component mounts
    ↓
Fetch scenario details from API
    ↓
Render 3-panel call interface
```

### 5. Voice Call with AXTRA Copilot Flow

```
User clicks "Start Voice Call"
    ↓
useLiveKitStore.connect(scenarioId)
    ↓
POST /api/livekit/token
    ↓
Server generates JWT token
    ↓
Frontend connects to LiveKit room
    ↓
Enable microphone
    ↓
AI Agent auto-joins room
    ↓
─────────────────────────────────────
Conversation starts (voice + coaching):
    ↓
Customer speaks → Agent responds
    ↓
Conversation Manager tracks both turns
    ↓
Trigger check (3 turns / 300 chars / 30s)
    ↓
If triggered → Supervisor analyzes
    ↓
LangGraph workflow runs
    ↓
Coaching data published via data channel
    ↓
Frontend receives → Updates AxtraCopilot UI
    ↓
─────────────────────────────────────
User clicks "End Call"
    ↓
useLiveKitStore.endCallAndSave()
    ↓
POST /api/calls/complete (transcripts + coaching history)
    ↓
Server generates summary, saves all data
    ↓
Update user_scenarios to "completed"
    ↓
Show CallSummaryModal
    ↓
User clicks "Done"
    ↓
resetState(), back to welcome screen
```

---

## Directory Structure

```
axtra-console-prototype/
├── src/                          # Frontend
│   ├── components/               # Reusable UI
│   │   ├── Sidebar.tsx           # Navigation
│   │   ├── Header.tsx            # Top bar
│   │   ├── Dashboard.tsx         # KPI dashboard
│   │   ├── ErrorBoundary.tsx     # Error handling
│   │   ├── livekit/              # LiveKit components
│   │   │   ├── LiveKitTranscript.tsx
│   │   │   ├── LiveKitCallControls.tsx
│   │   │   ├── LiveKitConnectionStatus.tsx
│   │   │   ├── LiveKitWelcomeScreen.tsx
│   │   │   ├── AxtraCopilot.tsx       # Real-time coaching UI
│   │   │   └── CallSummaryModal.tsx   # Post-call summary
│   │   └── ui/                   # UI primitives
│   │
│   ├── pages/                    # Route pages
│   │   ├── Login.tsx             # Auth page
│   │   ├── Dashboard.tsx         # Home page
│   │   ├── Simulations.tsx       # Training list
│   │   ├── ActiveSimulation.tsx  # Call interface (3-panel)
│   │   └── ...
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── useUserStore.ts       # Auth state
│   │   ├── useSimulationStore.ts # Training state
│   │   ├── useDashboardDataStore.ts
│   │   ├── useLiveKitStore.ts    # Voice + coaching data
│   │   └── ...
│   │
│   ├── lib/                      # Utilities
│   │   ├── api-client.ts         # HTTP client
│   │   ├── api-types.ts          # TypeScript types
│   │   └── livekit.ts            # LiveKit client
│   │
│   └── App.tsx                   # Main app
│
├── server/                       # Backend
│   ├── index.ts                  # API server
│   ├── db.ts                     # Database config
│   ├── auth.ts                   # Auth service
│   ├── dashboard.ts              # Dashboard service
│   ├── simulations.ts            # Simulation service
│   ├── livekit.ts                # LiveKit token generation
│   ├── call-sessions.ts          # Call session & summary
│   ├── seed-demo.ts              # Demo data seeder
│   └── agent/                    # AI Agent services
│       └── python-livekit/       # Python voice agent
│           ├── livekit_agent_langchain.py  # Main entry
│           ├── livekit_basic_agent.py      # Basic agent
│           ├── agents/                     # Agent components
│           │   ├── agent_manager/
│           │   │   └── agent.py
│           │   ├── prompts/
│           │   │   └── agent_prompts.py
│           │   ├── schemas/
│           │   │   └── types.py
│           │   └── workflow/
│           │       ├── build.py
│           │       └── nodes.py
│           ├── prompts.py        # Persona definitions
│           ├── pyproject.toml
│           └── README.md
│
└── docs/                         # Documentation
```

---

## Database Schema

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Scenarios
```sql
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  duration TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  persona TEXT DEFAULT 'Customer',
  rating REAL DEFAULT 4.5,
  completions INTEGER DEFAULT 0,
  is_recommended INTEGER DEFAULT 1
);
```

### User Scenarios (Progress)
```sql
CREATE TABLE user_scenarios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',
  score INTEGER,
  started_at DATETIME,
  completed_at DATETIME
);
```

---

## API Architecture

### Route Handling

Routes are matched by method + path segments:

```typescript
// Example: GET /api/scenarios/:id
segments = ['scenarios', 'a7dda3d3-...']
method = 'GET'

// Match condition:
method === 'GET' && 
segments.length === 2 && 
segments[0] === 'scenarios'
```

### Authentication Middleware

```typescript
const token = getToken(req);  // From Authorization header
const user = await validateSession(token);

if (!user) {
  return 401 Unauthorized;
}
// Continue to route handler...
```

### Error Handling

```
API Error → ApiError class → JSON response
    ↓
Client receives { error: "message" }
    ↓
Store catches error, updates error state
    ↓
UI displays error message
```

---

## State Management

### Zustand Pattern

```typescript
// Store definition
export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    set({ user: response.data.user, isAuthenticated: true });
  },
  
  logout: async () => {
    await apiClient.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  }
}));

// Component usage
const user = useUserStore(state => state.user);
```

---

## Routing Table

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/login` | Login | No |
| `/` | Dashboard | Yes |
| `/scenarios` | Scenarios | Yes |
| `/simulations/:id` | ActiveSimulation | Yes |
| `/personas` | Personas | Yes |
| `/copilot` | Copilot | Yes |
| `/active-calls` | ActiveCalls | Yes |
| `/recordings` | Recordings | Yes |
| `/qa-scoring` | QAScoring | Yes |
| `/insights` | Insights | Yes |
| `/knowledge-base` | KnowledgeBase | Yes |
| `/offers` | Offers | Yes |
| `/settings` | Settings | Yes |
| `/developer-api` | DeveloperAPI | Yes |

---

## Build Pipeline

```
Source (TSX/TS/CSS)
        ↓
    Vite Dev Server
        ↓
┌───────────────────────┐
│  PostCSS Pipeline     │
│  - @tailwindcss/postcss
│  - autoprefixer       │
└───────────────────────┘
        ↓
┌───────────────────────┐
│  Tailwind CSS v4      │
│  - Utility generation │
│  - Just-in-time       │
└───────────────────────┘
        ↓
┌───────────────────────┐
│  TypeScript + SWC     │
│  - Type checking      │
│  - Fast compilation   │
└───────────────────────┘
        ↓
    HMR Update
```

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Turso over PostgreSQL** | Serverless, edge-deployed, SQLite compatible |
| **Custom HTTP server** | Lightweight, no Express bloat, full control |
| **Zustand over Redux** | Simpler API, no providers, TypeScript native |
| **Vite over CRA** | Faster HMR, modern ESM, better DX |
| **Vitest over Jest** | Native ESM, Vite integration, faster |
| **LangGraph for coaching** | Parallel card generation, structured output |
| **LiveKit Data Channel** | Low-latency coaching updates without polling |
| **Separate Python Agent** | Better AI/ML library ecosystem (LangChain) |

---

## Security

- **Password hashing**: bcrypt with salt rounds 10
- **Session tokens**: UUID-based with 7-day expiry
- **JWT storage**: localStorage (consider httpOnly cookies for prod)
- **CORS**: Configured for development
- **SQL injection**: Parameterized queries via libsql client

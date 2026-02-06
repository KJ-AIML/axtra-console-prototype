# Axtra Console - Agent Guide

Essential information for AI coding agents working on the Axtra Console project.

---

## Quick Reference

### Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server + API server |
| `npm test -- --run` | Run all tests once (CI mode) |
| `npm test` | Run tests in watch mode |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |

### Demo Credentials
- **Email**: `admin@axtra.local`
- **Password**: `admin123`

### Key Files
- `src/App.tsx` - Main app with routing
- `src/main.tsx` - Application entry point
- `server/index.ts` - API server & route handlers
- `server/db.ts` - Database configuration (Turso/libsql)
- `.env.local` - Environment variables

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Frontend** | React | 19.2.4 |
| | TypeScript | ~5.8.2 |
| | Vite | 6.2.0 |
| **Styling** | Tailwind CSS | v4.1.18 |
| | PostCSS | with `@tailwindcss/postcss` |
| **Routing** | React Router DOM | v7.13.0 |
| **State** | Zustand | v5.0.11 |
| **Icons** | lucide-react | ^0.563.0 |
| **Backend** | Node.js HTTP Server | Native `http` module |
| **Database** | Turso (libsql) | `@libsql/client` ^0.17.0 |
| **Voice/Video** | LiveKit | `@livekit/components-react` ^2.9.19 |
| **AI Agent** | Python + LiveKit Agents | `livekit-agents` ^1.2.0 |
| **AI LLM** | Google Gemini | `google.genai` (Realtime API) |
| **Auth** | bcryptjs | ^3.0.3 |
| **Testing** | Vitest | v4.0.18 |
| | React Testing Library | ^16.3.2 |

---

## Project Structure

```
axtra-console-prototype/
├── src/                      # Frontend source code
│   ├── components/           # UI components
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── Header.tsx        # Top bar with breadcrumbs
│   │   ├── Dashboard.tsx     # Main dashboard with KPIs
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   ├── ErrorFallback.tsx # Error UI display
│   │   ├── livekit/          # LiveKit voice components
│   │   │   ├── LiveKitTranscript.tsx
│   │   │   ├── LiveKitCallControls.tsx
│   │   │   ├── LiveKitConnectionStatus.tsx
│   │   │   └── LiveKitWelcomeScreen.tsx
│   │   └── ui/               # UI primitives (Button, Toast, etc.)
│   ├── pages/                # Route pages
│   │   ├── Login.tsx
│   │   ├── Scenarios.tsx
│   │   ├── Simulations.tsx
│   │   ├── ActiveSimulation.tsx  # Voice call interface
│   │   ├── Copilot.tsx
│   │   ├── ActiveCalls.tsx
│   │   ├── Recordings.tsx
│   │   ├── QAScoring.tsx
│   │   ├── Insights.tsx
│   │   ├── KnowledgeBase.tsx
│   │   ├── Offers.tsx
│   │   ├── Personas.tsx
│   │   ├── Settings.tsx
│   │   └── DeveloperAPI.tsx
│   ├── stores/               # Zustand stores
│   │   ├── useUserStore.ts       # Authentication state
│   │   ├── useSimulationStore.ts # Training simulations
│   │   ├── useDashboardDataStore.ts
│   │   ├── useDashboardStore.ts
│   │   ├── useLiveKitStore.ts    # Voice call state
│   │   ├── useNavigationStore.ts
│   │   ├── useSidebarStore.ts
│   │   ├── useToastStore.ts
│   │   └── index.ts          # Barrel exports
│   ├── lib/                  # API client & utilities
│   │   ├── api-client.ts     # HTTP client with interceptors
│   │   ├── api-types.ts      # TypeScript types
│   │   ├── livekit.ts        # LiveKit client utilities
│   │   └── speechRecognition.ts
│   ├── utils/                # Utility functions
│   │   └── classnames.ts     # Tailwind class merging (cn function)
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── test/                 # Test configuration
│   │   └── setup.ts          # Vitest setup, mocks
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles (Tailwind v4)
│
├── server/                   # Backend API
│   ├── index.ts              # API server & route handlers
│   ├── db.ts                 # Database configuration
│   ├── auth.ts               # Authentication service
│   ├── dashboard.ts          # Dashboard data service
│   ├── simulations.ts        # Simulation service
│   ├── livekit.ts            # LiveKit token generation
│   ├── seed-demo.ts          # Demo data seeder
│   └── agent/                # AI Agent services
│       └── python-livekit/   # Python voice agent (separate service)
│           ├── livekit_basic_agent.py  # Main agent entry
│           ├── prompts.py              # Persona definitions
│           ├── pyproject.toml          # Python deps
│           └── README.md               # Agent docs
│
├── docs/                     # Documentation
│   ├── index.md              # Quick start guide
│   ├── architecture.md       # System architecture
│   ├── design_system.md      # Design principles
│   ├── style-guide.md        # Styling reference
│   └── livekit.md            # LiveKit setup guide
│
├── index.html                # HTML template (Vite convention)
├── vite.config.ts            # Vite configuration
├── vitest.config.ts          # Vitest configuration
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies & scripts
```

---

## Architecture

### Frontend Architecture

```
Browser
  ↓
React 19 (main.tsx → App.tsx)
  ↓
React Router DOM v7 (Protected/Public routes)
  ↓
Zustand Stores (State management)
  ↓
API Client (api-client.ts)
  ↓
HTTP Requests to /api
```

### Backend Architecture

```
HTTP Request
  ↓
Node.js HTTP Server (server/index.ts)
  ↓
Route Matching (method + path segments)
  ↓
Auth Validation (JWT token)
  ↓
Service Handler (auth/dashboard/simulations/livekit)
  ↓
Turso Database (libsql over HTTP)
```

### Data Flow Example (Dashboard)

```
Dashboard component mounts
  ↓
useDashboardDataStore.fetchDashboardData()
  ↓
GET /api/dashboard
  ↓
Server validates JWT → queries DB
  ↓
Returns { metrics, scenarios, skillVelocity, qaHighlights }
  ↓
Store updates → Component re-renders
```

---

## Database (Turso/libsql)

**Database URL**: `libsql://axdb-kjctsc.aws-ap-south-1.turso.io`

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (id, email, password_hash, name, initials, role) |
| `sessions` | Auth sessions (token, expires_at) |
| `accounts` | User account data (multi-tenant support) |
| `scenarios` | Training scenarios (8 seeded on startup) |
| `user_scenarios` | User progress tracking |
| `user_metrics` | Dashboard KPIs |
| `skill_velocity` | User skill progress/levels |
| `qa_highlights` | QA feedback items |

### Query Pattern

```typescript
// Query with parameters
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE email = ?',
  args: [email],
});

// Insert
await db.execute({
  sql: 'INSERT INTO scenarios (id, title) VALUES (?, ?)',
  args: [id, title],
});
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Logout, invalidate session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/accounts` | Get user's accounts |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Full dashboard data |
| GET | `/api/dashboard/metrics` | KPI metrics only |
| GET | `/api/dashboard/scenarios` | User scenarios |
| GET | `/api/dashboard/skill-velocity` | Progress data |
| GET | `/api/dashboard/qa-highlights` | QA feedback |

### Simulations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenarios` | All scenarios with progress |
| GET | `/api/scenarios/:id` | Single scenario |
| POST | `/api/scenarios/:id/start` | Start simulation |
| POST | `/api/scenarios/:id/complete` | Complete with score |
| GET | `/api/simulations/stats` | User stats |
| GET | `/api/simulations/recommended` | Recommended scenarios |

### LiveKit
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/livekit/token` | Generate JWT token for voice call |

### Demo
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/demo/reset-my-data` | Reset current user's dashboard data |
| GET | `/api/demo/credentials` | Get demo login credentials |
| GET | `/api/health` | Health check with DB status |

---

## State Management (Zustand)

### Pattern

```typescript
import { create } from 'zustand';

interface StoreState {
  data: DataType[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  data: [],
  isLoading: false,
  fetchData: async () => {
    set({ isLoading: true });
    const response = await apiClient.get('/endpoint');
    set({ data: response.data, isLoading: false });
  },
}));
```

### Usage in Components

```typescript
// Select specific state (re-renders only when this changes)
const { data, isLoading } = useStore();

// Or with selector
const user = useUserStore((state) => state.user);
```

### Available Stores

| Store | Purpose |
|-------|---------|
| `useUserStore` | Authentication, user data, accounts |
| `useSimulationStore` | Training scenarios, progress |
| `useDashboardDataStore` | Dashboard KPIs, metrics |
| `useLiveKitStore` | Voice call state, transcripts |
| `useNavigationStore` | Active navigation, route sync |
| `useSidebarStore` | Sidebar collapse state |
| `useToastStore` | Toast notifications |

---

## Coding Conventions

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Sidebar.tsx` |
| Functions | camelCase | `fetchData()` |
| Event handlers | `on` prefix | `onClick`, `onSubmit` |
| Stores | camelCase with `use` prefix | `useUserStore` |
| Types/Interfaces | PascalCase | `UserProps`, `LoginRequest` |
| Booleans | `is` prefix | `isLoading`, `isAuthenticated` |

### Import Order

1. React and core libraries
2. Third-party (lucide-react grouped)
3. Zustand stores
4. Local/relative imports

```typescript
import { useEffect, useState } from 'react';
import { User, Settings, Loader2 } from 'lucide-react';
import { useUserStore } from '../stores';
import { cn } from '../utils/classnames';
```

### Component Pattern

```typescript
interface Props {
  className?: string;
}

export const Component: React.FC<Props> = ({ className }) => {
  const data = useStore((state) => state.data);
  
  return (
    <div className={cn('base-classes', className)}>
      {/* JSX */}
    </div>
  );
};
```

### Class Name Utilities

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from '../utils/classnames';

className={cn(
  'base-classes',
  isActive && 'active-classes',
  className  // Allow override
)}
```

---

## Styling Guidelines

### Tailwind CSS v4

- Uses npm-based Tailwind v4 with `@import "tailwindcss"` in CSS
- PostCSS pipeline: `@tailwindcss/postcss` → `autoprefixer`

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Brand | `indigo-600` (#4F46E5) | Primary buttons, active states |
| Success | `emerald-500` (#10B981) | Success states |
| Warning | `amber-500` (#F59E0B) | Warnings |
| Error | `rose-500` (#F43F5E) | Errors |
| Background | `slate-50` (#F8FAFC) | App background |
| Surface | `white` | Cards, panels |
| Border | `gray-200` | Borders |
| Text Primary | `gray-900` | Main text |
| Text Secondary | `gray-500` | Secondary text |

### Typography

- **Font**: Inter (Google Fonts)
- **Page Title**: `text-2xl font-bold`
- **Section Title**: `text-lg font-semibold`
- **Card Title**: `text-base font-semibold`
- **Body**: `text-sm font-medium`
- **Label**: `text-[11px] font-semibold uppercase tracking-tight`

### Common Patterns

```html
<!-- Card -->
<div class="bg-white rounded-lg border border-gray-200 p-6">

<!-- Button Primary -->
<button class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white 
               rounded-md hover:bg-indigo-700 transition-colors font-medium text-sm">

<!-- Flex center -->
<div class="flex items-center justify-center">

<!-- Truncate text -->
<div class="truncate text-sm text-gray-600">
```

---

## Testing

### Test Setup

- Framework: Vitest v4 with jsdom environment
- Testing Library: React Testing Library + jest-dom matchers
- Setup file: `src/test/setup.ts`

### Mock Pattern

```typescript
import { vi } from 'vitest';

vi.mock('../stores', () => ({
  useStore: ((selector?: any) => {
    const state = { data: [], fetchData: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Test File Location

Place tests next to source files:
```
src/
├── Component.tsx
└── Component.test.tsx
```

### Running Tests

```bash
# Run all tests once (CI)
npm test -- --run

# Watch mode
npm test

# With UI
npm run test:ui

# Coverage
npm run test:coverage
```

---

## Environment Variables

Create `.env.local`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
API_PORT=3001

# Turso Database
TURSO_DATABASE_URL=libsql://axdb-kjctsc.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your_token_here

# LiveKit (for voice calls)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

**Never commit `.env.local` to git!**

---

## Voice AI Integration (LiveKit)

### Architecture

The AI Voice Agent provides realistic customer simulations using LiveKit and OpenAI's GPT-4o Realtime API.

```
┌─────────────┐      WebRTC        ┌──────────────────┐      WebRTC       ┌─────────────┐
│   Client    │◄──────────────────►│  LiveKit Cloud   │◄─────────────────►│  AI Agent   │
│  (Browser)  │   (Voice/Audio)    │    (SFU/Media)   │   (Voice/Audio)   │  (External) │
└──────┬──────┘                    └────────┬─────────┘                   └─────────────┘
       │                                    │
       │  1. Get token                      │  3. Agent auto-joins
       │  2. Connect room                   │  4. Voice conversation  
       │  3. Enable mic                     │  5. STT → Text Stream
       │  4. Subscribe audio                │
       │  5. Receive transcription ◄────────┘
       ▼                                    
┌─────────────────────────────────────────────────────────┐
│  React App                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  useLiveKitStore                                 │   │
│  │  - Room connection                               │   │
│  │  - Audio controls                                │   │
│  │  - Transcript array                              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  LiveKitTranscript Component                     │   │
│  │  - Displays streaming text                       │   │
│  │  - Separate sides (customer/operator)            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Transcript Data Structure

```typescript
interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
  emotion?: string;
}
```

### Available Scenarios/Personas

| Scenario | Persona | Difficulty |
|----------|---------|------------|
| Billing Dispute | Angry Customer | Hard |
| Technical Support | Frustrated User | Medium |
| Sales Upsell | Interested Customer | Easy |
| Retention | Canceling Customer | Medium |
| Compliance/Privacy | Suspicious Caller | Hard |
| Returns | Upset Customer | Easy |
| VIP Support | Premium Customer | Medium |
| Fraud Alert | Panicked Customer | Hard |

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/useLiveKitStore.ts` | Room state, transcripts, actions |
| `src/lib/livekit.ts` | LiveKit client utilities |
| `server/livekit.ts` | Token generation |
| `server/agent/python-livekit/` | Python AI Agent service |
| `src/components/livekit/LiveKitTranscript.tsx` | Transcription UI |

---

## Python AI Agent (Voice Service)

The **Python AI Agent** is a separate service that runs independently from the main Axtra Console application. It connects to LiveKit rooms and provides AI-powered voice conversations for call center training.

### Architecture

```
┌─────────────────┐      WebRTC       ┌─────────────────┐      WebRTC       ┌─────────────────┐
│  Axtra Console  │ ◄───────────────► │  LiveKit Cloud  │ ◄───────────────► │   Python Agent  │
│   (Frontend)    │   (Voice/Audio)   │  (Media Relay)  │   (Voice/Audio)   │ (Python Service)│
│                 │                   │                 │                   │                 │
│ • React App     │                   │ • Route audio   │                   │ • Auto-joins    │
│ • Browser mic   │                   │ • Handle streams│                   │ • Gemini LLM    │
│ • Speaker out   │                   │                 │                   │ • STT/TTS       │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
     Node.js API                          LiveKit Cloud                        Python 3.13+
```

### Running the Python Agent

```bash
# Navigate to agent directory
cd server/agent/python-livekit

# Install dependencies (using uv)
uv sync

# Run in development mode (auto-reload)
uv run python livekit_basic_agent.py dev

# Run in production mode
uv run python livekit_basic_agent.py start
```

### Environment Variables

Create `server/agent/python-livekit/.env`:

```bash
# LiveKit Configuration (Required)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Google Gemini Configuration (Required)
GOOGLE_API_KEY=your_google_api_key

# Optional: Other providers
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key
```

### Persona System

Personas are defined in `server/agent/python-livekit/prompts.py`:

```python
CALLER_INSTRUCTIONS = """
#Persona: Sarah Thompson
#Profile Data
- Name: ...
- Account ID: ...

#Scenario Context
[The issue causing the call]

#Emotional State & Behavior Rules
##Phase 1: Opening
[Initial behavior]

##Phase 2: Escalation Triggers
[What makes customer angrier]

##Phase 3: De-escalation Points
[What calms them down]
"""
```

### How It Works

1. **User starts voice call** in Axtra Console
2. **Frontend connects** to LiveKit room (via token from Node.js API)
3. **Python agent detects** room via LiveKit Agents framework
4. **Agent auto-joins** and starts conversation with persona
5. **Voice flows** through LiveKit's WebRTC infrastructure
6. **Gemini Realtime API** handles speech-to-text and response generation

### Development Commands

| Command | Purpose |
|---------|---------|
| `uv sync` | Install Python dependencies |
| `uv run python livekit_basic_agent.py dev` | Run agent with auto-reload |
| `uv run python livekit_basic_agent.py start` | Run agent in production mode |
| `black livekit_basic_agent.py` | Format code |
| `ruff check .` | Lint code |

See [server/agent/python-livekit/README.md](./server/agent/python-livekit/README.md) for full documentation.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Route not found" | Check segment matching in `server/index.ts` |
| "Database error" | Verify `TURSO_AUTH_TOKEN` in `.env.local` |
| "Module not found" | Run `npm install` |
| Tests failing | Check mock setup in test files |
| "No voice response" | Check LiveKit room connection and mic permissions |
| "Agent not joining" | Verify Python AI agent service is running (`uv run python livekit_basic_agent.py dev`) |
| "Transcription not showing" | Check Agent has STT enabled in configuration |
| "No voice from Python agent" | Check `GOOGLE_API_KEY` and LiveKit credentials in Python agent `.env` |
| Build errors | Ensure Node.js version supports native fetch |

---

## Security Considerations

- **Password hashing**: bcrypt with salt rounds 10
- **Session tokens**: UUID-based with 7-day expiry
- **JWT storage**: localStorage (consider httpOnly cookies for production)
- **CORS**: Configured for development (`*`)
- **SQL injection**: Prevented via parameterized queries in libsql client
- **Environment variables**: Never commit credentials to git

---

## Links

- [Documentation Index](./docs/index.md)
- [Architecture](./docs/architecture.md)
- [Design System](./docs/design_system.md)
- [Style Guide](./docs/style-guide.md)
- [LiveKit Integration](./docs/livekit.md)
- [Python AI Agent](./server/agent/python-livekit/README.md)
- [README](./README.md)

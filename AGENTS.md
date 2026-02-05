# Axtra Console - Agent Guide

Essential information for AI coding agents working on the Axtra Console project.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite + API server |
| `npm test -- --run` | Run all tests |
| `npm run build` | Production build |

**Key Files:**
- `src/App.tsx` - Main app with routing
- `server/index.ts` - API server
- `server/db.ts` - Database config
- `.env.local` - Environment variables

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS v4 |
| **Routing** | React Router DOM v7 |
| **State** | Zustand v5 |
| **Backend** | Node.js HTTP server |
| **Database** | Turso (libsql) |
| **Voice AI** | LiveKit Agents + OpenAI GPT-4o Realtime |
| **Testing** | Vitest |

---

## Project Structure

```
axtra-console-prototype/
├── src/                      # Frontend
│   ├── components/           # UI components
│   │   └── livekit/          # LiveKit voice components
│   │       ├── LiveKitTranscript.tsx
│   │       ├── LiveKitCallControls.tsx
│   │       └── LiveKitWelcomeScreen.tsx
│   ├── pages/                # Route pages
│   │   └── ActiveSimulation.tsx
│   ├── stores/               # Zustand stores
│   │   ├── useUserStore.ts       # Auth state
│   │   ├── useSimulationStore.ts
│   │   ├── useDashboardDataStore.ts
│   │   └── useLiveKitStore.ts    # Voice call + transcription
│   ├── lib/                  # API client & utilities
│   │   └── livekit.ts
│   └── App.tsx               # Main app
├── server/                   # Backend
│   ├── index.ts              # API server
│   ├── db.ts                 # Database
│   ├── auth.ts               # Auth service
│   ├── dashboard.ts          # Dashboard data
│   ├── simulations.ts        # Simulation service
│   └── livekit.ts            # LiveKit token generation
└── docs/                     # Documentation
```

---

## Database (Turso/libsql)

**Database URL:** `libsql://axdb-kjctsc.aws-ap-south-1.turso.io`

### Tables
- `users` - User accounts
- `sessions` - Auth sessions
- `accounts` - User account data
- `scenarios` - Training scenarios
- `user_scenarios` - User progress tracking
- `user_metrics` - Dashboard KPIs
- `skill_velocity` - User skill progress
- `qa_highlights` - QA feedback

### Key Patterns
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
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Dashboard
- `GET /api/dashboard` - Full dashboard
- `GET /api/dashboard/metrics` - KPIs
- `GET /api/dashboard/scenarios` - Scenarios
- `GET /api/dashboard/skill-velocity` - Progress
- `GET /api/dashboard/qa-highlights` - QA data

### Simulations
- `GET /api/scenarios` - All scenarios
- `GET /api/scenarios/:id` - Single scenario
- `POST /api/scenarios/:id/start` - Start
- `POST /api/scenarios/:id/complete` - Complete
- `GET /api/simulations/stats` - User stats
- `GET /api/simulations/recommended` - Recommended

### LiveKit
- `POST /api/livekit/token` - Generate JWT token for room access

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

export const useStore = create<StoreState>((set) => ({
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
const { data, isLoading, fetchData } = useStore();
```

---

## Coding Conventions

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Sidebar.tsx` |
| Functions | camelCase | `fetchData()` |
| Stores | camelCase with `use` prefix | `useUserStore` |
| Types | PascalCase | `UserProps` |
| Booleans | `is` prefix | `isLoading` |

### Import Order
1. React and core libraries
2. Third-party (lucide-react grouped)
3. Zustand stores
4. Local/relative imports

### Example
```typescript
import { useEffect } from 'react';
import { User, Settings } from 'lucide-react';
import { useUserStore } from '../stores';
import { cn } from '../utils/classnames';
```

---

## Component Pattern

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

---

## Testing

### Mock Pattern
```typescript
vi.mock('../stores', () => ({
  useStore: ((selector?: any) => {
    const state = { data: [], fetchData: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Test Location
Place tests next to source files:
```
src/
├── Component.tsx
└── Component.test.tsx
```

---

## Environment Variables

Create `.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
TURSO_DATABASE_URL=libsql://axdb-kjctsc.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your_token_here
API_PORT=3001

# LiveKit (for voice calls)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# OpenAI (for AI voice agent)
OPENAI_API_KEY=sk-your_openai_key
```

**Never commit `.env.local` to git!**

---

## Common Tasks

### Add New API Route
1. Add route handler in `server/index.ts`
2. Add service function in appropriate service file
3. Add store method in `src/stores/`
4. Use in component

### Add New Component
1. Create file in `src/components/`
2. Add interface with `className?: string`
3. Use `cn()` for conditional classes
4. Add test file

### Database Migration
1. Update schema in `server/db.ts`
2. Add `ALTER TABLE` in seed function for existing DBs
3. Restart server

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Route not found" | Check segment matching in `server/index.ts` |
| "Database error" | Verify `TURSO_AUTH_TOKEN` in `.env.local` |
| "Module not found" | Run `npm install` |
| Tests failing | Check mock setup in test files |
| "No voice response" | Check LiveKit room connection and microphone permissions |
| "Agent not joining" | Verify AI agent service is running separately |
| "Transcription not showing" | Check Agent has STT enabled in its configuration |

---

## Links

- [Documentation](./docs/index.md)
- [Architecture](./docs/architecture.md)
- [Design System](./docs/design_system.md)
- [README](./README.md)

---

## AI Voice Agent Integration

The AI Voice Agent provides realistic customer simulations for call center training using LiveKit and OpenAI's GPT-4o Realtime API. Features include real-time voice calls with streaming transcription display.

### Architecture

```
┌─────────────┐      WebRTC        ┌──────────────────┐      WebRTC       ┌─────────────┐
│   Client    │◄──────────────────►│  LiveKit Cloud   │◄─────────────────►│  AI Agent   │
│  (Browser)  │   (Voice/Audio)    │    (SFU/Media)   │   (Voice/Audio)  │  (External) │
└──────┬──────┘                    └────────┬─────────┘                  └─────────────┘
       │                                    │
       │  1. Get token                      │  3. Agent auto-joins
       │  2. Connect room                   │  4. Voice conversation  
       │  3. Enable mic                     │  5. STT → Text Stream
       │  4. Subscribe audio                │
       │  5. Receive transcription ◄────────┘
       ▼                                    
┌─────────────────────────────────────────────────────────┐
│  React App                                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useLiveKitStore                                 │  │
│  │  - Room connection                               │  │
│  │  - Audio controls                                │  │
│  │  - Transcript array (streaming)                  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  TranscriptionSync Component                     │  │
│  │  - useTranscriptions hook                        │  │
│  │  - Maps segments to speakers                     │  │
│  │  - Updates store in real-time                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  LiveKitTranscript Component                     │  │
│  │  - Displays streaming text                       │  │
│  │  - Separate sides (customer/operator)            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

> **Note:** The AI Agent runs as a **separate service** (not part of this repo). It connects to LiveKit rooms automatically when users join.

### Real-Time Transcription

The system captures and displays speech-to-text in real-time:

1. **Agent performs STT** - The AI Agent uses LiveKit's transcription feature to convert speech to text
2. **Text streams via LiveKit** - Transcriptions are sent as text streams with segment IDs
3. **Frontend receives streams** - Uses `useTranscriptions` hook from `@livekit/components-react`
4. **Streaming display** - Text appears character-by-character in the same bubble until the segment completes
5. **Speaker separation** - Messages are shown on different sides based on speaker (Agent=customer/left, User=operator/right)

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/useLiveKitStore.ts` | Room state, transcript array, add/update transcript actions |
| `src/pages/ActiveSimulation.tsx` | Main page with `TranscriptionSync` component |
| `src/components/livekit/LiveKitTranscript.tsx` | UI component displaying transcripts |
| `server/index.ts` | LiveKit token generation endpoint |

### Transcription Data Flow

```
Speech → LiveKit Agent STT → Text Stream (lk.transcription)
                                    ↓
                           useTranscriptions hook
                                    ↓
                           TranscriptionSync component
                           - Maps segment_id to store index
                           - Determines speaker (local vs remote)
                           - Calls addTranscript() or updateTranscript()
                                    ↓
                           LiveKitTranscript component
                           - Renders with speaker side layout
                           - Updates existing bubble (streaming effect)
```

### Implementation Details

**TranscriptEntry Interface:**
```typescript
export interface TranscriptEntry {
  id: string;
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
  emotion?: string;
}
```

**Store Actions:**
```typescript
// Add new transcript (when new segment starts)
addTranscript: (entry: Omit<TranscriptEntry, 'id'>) => void;

// Update existing transcript (for streaming updates)
updateTranscript: (index: number, text: string) => void;
```

**Speaker Detection:**
```typescript
// Compare participant identity with local participant
const isLocal = participantIdentity === room.localParticipant.identity;
const speaker: 'customer' | 'operator' = isLocal ? 'operator' : 'customer';
```

### Available Personas

| Scenario | Persona | Difficulty | Description |
|----------|---------|------------|-------------|
| Billing Dispute | Angry Customer | Hard | Aggressive, impatient, disputing charges |
| Technical Support | Frustrated Senior | Medium | Tech issues, work-from-home impact |
| Sales Upsell | Interested Customer | Easy | Curious, budget-conscious, no pressure |
| Retention | Canceling Customer | Medium | Disappointed, competitor offers |
| Compliance | Suspicious Caller | Hard | Privacy-focused, security verification |
| Returns | Upset Customer | Easy | Damaged goods, wants quick resolution |
| VIP Support | Premium Customer | Medium | High expectations, white-glove service |
| Fraud Alert | Panicked Customer | Hard | Anxious, needs immediate action |

### How It Works

1. **Room Naming Convention**: Rooms are named `axtra-{scenarioId}-{userId}-{timestamp}`
2. **Persona Selection**: The agent parses the room name to determine which persona to use
3. **Initial Greeting**: Each persona has a unique opening line matching their personality
4. **Real-time Conversation**: Uses OpenAI GPT-4o Realtime API for natural voice conversations
5. **Voice Configuration**: Each persona has a distinct voice and speaking speed

### How It Works

1. **Frontend (This Repo)**
   - User clicks "Start Voice Call"
   - Frontend requests token from `/api/livekit/token`
   - Connects to LiveKit room using `livekit-client`
   - Enables microphone and subscribes to audio tracks
   - Displays real-time transcription from agent

2. **AI Agent (External Service)**
   - Monitors LiveKit rooms
   - Auto-joins when new room created
   - Uses GPT-4o Realtime API for voice conversations
   - Performs STT and streams transcriptions
   - Each scenario has unique persona (voice, personality)

### Environment Variables

Frontend needs these in `.env`:

```bash
# LiveKit Configuration (required for voice calls)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# API Server Port
API_PORT=3001
```

> The AI Agent service (run separately) needs its own `OPENAI_API_KEY`

### Available Personas (Agent-Side)

The AI Agent service (run separately) has these personas:

| Scenario | Persona | Voice | Difficulty |
|----------|---------|-------|------------|
| Billing Dispute | Angry Customer | ash | Hard |
| Technical Support | Frustrated User | echo | Medium |
| Sales Upsell | Interested Customer | coral | Easy |
| Retention | Canceling Customer | sage | Medium |
| Compliance/Privacy | Suspicious Caller | alloy | Hard |
| Returns | Upset Customer | ballad | Easy |
| VIP Support | Premium Customer | shimmer | Medium |
| Fraud Alert | Panicked Customer | verse | Hard |

> To add new personas, modify the **AI Agent service** (not this frontend repo)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LIVEKIT_API_KEY` | LiveKit project API key | Yes |
| `LIVEKIT_API_SECRET` | LiveKit project secret | Yes |
| `LIVEKIT_URL` | LiveKit WebSocket URL | Yes |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | Yes |
| `NODE_ENV` | Set to `production` for production | No |
| `DEBUG` | Set to `true` for debug logging | No |

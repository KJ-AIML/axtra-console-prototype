# LiveKit Voice Integration Guide

This guide explains how the Axtra Console integrates with LiveKit for real-time voice AI conversations.

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────────┐
│   React Client  │  ←───→  │   LiveKit Cloud  │  ←───→  │   Python AI Agent       │
│   (Browser)     │  WebRTC │   (Media Relay)  │  WebRTC │   (Separate Service)    │
│                 │         │                  │         │                         │
│ • Get token     │         │ • Route audio    │         │ • Auto-joins rooms      │
│ • Connect room  │         │ • Handle streams │         │ • Google Gemini Realtime│
│ • Enable mic    │         │                  │         │ • STT + LLM + TTS       │
│ • Play audio    │         │                  │         │ • Persona-based AI      │
└─────────────────┘         └──────────────────┘         └─────────────────────────┘
         ↑                                                        ↑
         │         Node.js API (Token Generation)                 │
         └────────────────────────────────────────────────────────┘
```

**Key Points:**
- **Frontend** uses `livekit-client` (browser SDK)
- **Python AI Agent** runs as separate service using `livekit-agents` framework
- **Node.js API** generates JWT tokens for room access
- Both connect to same LiveKit room via WebRTC
- Audio flows: User → LiveKit → Agent → LiveKit → User

---

## Configuration

### Environment Variables

#### Frontend & Node.js API (`.env.local` in project root)

```bash
# LiveKit Configuration (required for voice calls)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
```

#### Python AI Agent (`server/agent/python-livekit/.env`)

```bash
# LiveKit Configuration (same credentials)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# Google Gemini Configuration (Required)
GOOGLE_API_KEY=your_google_api_key

# Optional: Other providers
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key
```

Get credentials from:
- **LiveKit Cloud**: https://cloud.livekit.io
- **Google Gemini**: https://aistudio.google.com/app/apikey

---

## How It Works

### 1. User Starts Voice Call

```typescript
// User clicks "Start Voice Call"
const { connect } = useLiveKitStore();
await connect(scenarioId);
```

### 2. Frontend Connects

```typescript
// 1. Get token from our API
const { token, url, roomName } = await fetchLiveKitToken(scenarioId);

// 2. Create LiveKit room
const room = new Room();

// 3. Connect
await room.connect(url, token);

// 4. Enable microphone
await room.localParticipant.setMicrophoneEnabled(true);
```

### 3. AI Agent Auto-Joins

The AI Agent service (running separately) detects the new room and automatically joins with appropriate persona.

### 4. Voice Conversation

- User speaks → Mic → LiveKit → Agent
- Agent responds → LiveKit → Frontend → Speakers

---

## Code Structure

### Frontend Components

| File | Purpose |
|------|---------|
| `src/lib/livekit.ts` | LiveKit client utilities |
| `src/stores/useLiveKitStore.ts` | Voice call state management |
| `src/components/livekit/` | LiveKit UI components |
| `server/livekit.ts` | Token generation API |

### Key Frontend Code

```typescript
// Connect to voice call
const connect = async (scenarioId: string) => {
  // Get token
  const { token, url } = await fetchLiveKitToken(scenarioId);
  
  // Create room
  const room = new Room({
    publishDefaults: { audioBitrate: 24000 }
  });
  
  // Connect
  await room.connect(url, token);
  
  // Enable mic
  await room.localParticipant.setMicrophoneEnabled(true);
  
  // Listen for agent audio
  room.on('trackSubscribed', (track) => {
    if (track.kind === 'audio') {
      const audioElement = track.attach();
      audioElement.play();
    }
  });
};
```

---

## Running the App

### Step 1: Start Frontend

```bash
npm run dev
```

### Step 2: Start Python AI Agent (Required for Voice)

The AI Agent is a **Python service** located in `server/agent/python-livekit/`. It must be running for voice calls to work.

```bash
# Navigate to agent directory
cd server/agent/python-livekit

# Install dependencies (using uv)
uv sync

# Run the agent in development mode (auto-reload)
uv run python livekit_basic_agent.py dev
```

**Requirements:**
- Python 3.9+ (project uses 3.13.3)
- [uv](https://github.com/astral-sh/uv) package manager
- Environment variables configured in `.env`

See [server/agent/python-livekit/README.md](../server/agent/python-livekit/README.md) for detailed setup instructions.

---

## Testing Voice Calls

1. Open http://localhost:3000
2. Login with demo account
3. Go to **Simulations**
4. Click **"Start Practice"** on any scenario
5. Click **"Start Voice Call"**
6. Allow microphone permission
7. Wait for AI Agent to join (if running)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No voice from agent" | Check AI Agent service is running |
| "Microphone blocked" | Click "Enable Audio" button first (browser requires user gesture) |
| "Can't connect to room" | Verify LiveKit credentials in `.env.local` |
| "Token invalid" | Check `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` |
| "Audio choppy" | Check internet connection; LiveKit requires stable connection |

---

## Persona System

The Python AI Agent uses **structured personas** defined in `server/agent/python-livekit/prompts.py`. Each persona includes:

### Persona Structure

```
#Persona: [Name]
[Character description and emotional state]

#Profile Data
- Customer identity, account info, history

#Scenario Context
[The specific issue causing the call]

#Emotional State & Behavior Rules
##Phase 1: Opening (0-30 seconds)
- Initial behavior and opening lines
- Emotional intensity

##Phase 2: Escalation Triggers
- Actions that make the customer angrier
- Specific response patterns

##Phase 3: De-escalation Points
- Actions that calm the customer
- Threshold for accepting resolution

##Phase 4: Resolution Acceptance
- Criteria for ending the call positively

#Test Objectives
[Skills trainees should demonstrate]

#Constraints
[Rules the AI must follow]
```

### Available Personas

| Scenario | Persona | Difficulty | Language |
|----------|---------|------------|----------|
| Billing Dispute | Sarah Thompson (Angry Gold Tier) | Hard | Thai |
| Technical Support | Frustrated Senior | Medium | English |
| Sales Upsell | Interested Customer | Easy | English |
| Retention | Canceling Customer | Medium | English |
| Compliance | Suspicious Caller | Hard | English |
| Returns | Upset Customer | Easy | English |
| VIP Support | Premium Customer | Medium | English |
| Fraud Alert | Panicked Customer | Hard | English |

> **Note:** The current implementation uses **Sarah Thompson** (Thai billing dispute scenario). More personas can be added by editing `prompts.py`.

---

## Browser Requirements

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (macOS/iOS)
- **Mobile**: iOS Safari, Chrome for Android

**Note**: Audio requires user interaction (click) due to browser autoplay policies.

---

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit React SDK](https://github.com/livekit/components-js)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)

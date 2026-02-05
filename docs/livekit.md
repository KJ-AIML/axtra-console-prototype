# LiveKit Voice Integration Guide

This guide explains how the Axtra Console integrates with LiveKit for real-time voice AI conversations.

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React Client  │  ←───→  │   LiveKit Cloud  │  ←───→  │   AI Agent      │
│   (Browser)     │  WebRTC │   (Media Relay)  │  WebRTC │   (External)    │
│                 │         │                  │         │                 │
│ • Get token     │         │ • Route audio    │         │ • Auto-join     │
│ • Connect room  │         │ • Handle streams │         │ • GPT-4o        │
│ • Enable mic    │         │                  │         │ • Voice output  │
│ • Play audio    │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Key Points:**
- **Frontend** uses `livekit-client` (browser SDK)
- **AI Agent** runs as separate service using `@livekit/agents`
- Both connect to same LiveKit room via WebRTC
- Audio flows: User → LiveKit → Agent → LiveKit → User

---

## Configuration

### Environment Variables

Add these to `.env.local`:

```bash
# LiveKit Configuration (required for voice calls)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
```

Get credentials from [LiveKit Cloud](https://cloud.livekit.io/).

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

### Step 2: Start AI Agent (Separately)

The AI Agent runs as a separate service. You have two options:

**Option A: Use LiveKit Playground**
- Go to [LiveKit Playground](https://playground.livekit.io/)
- Connect to your project
- Test voice calls

**Option B: Run Your Own Agent**
- The AI Agent code is in a separate repository/service
- It connects to LiveKit and uses GPT-4o Realtime API
- Must be running for voice calls to work

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

## Available Personas

When the AI Agent joins, it selects a persona based on the scenario:

| Scenario | Persona | Voice | Style |
|----------|---------|-------|-------|
| Billing Dispute | Angry Customer | ash | Aggressive |
| Technical Support | Frustrated User | echo | Stressed |
| Sales Upsell | Interested Customer | coral | Curious |
| Retention | Canceling Customer | sage | Disappointed |
| Compliance | Suspicious Caller | alloy | Cautious |
| Returns | Upset Customer | ballad | Frustrated |
| VIP Support | Premium Customer | shimmer | Professional |
| Fraud Alert | Panicked Customer | verse | Anxious |

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

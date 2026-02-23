# LiveKit Integration

Complete guide to LiveKit voice AI integration.

---

## 🏗️ Architecture

```
┌──────────────┐      WebRTC      ┌──────────────────┐
│   Browser    │ ◄──────────────► │   LiveKit Cloud  │
│   (React)    │   Audio/Data     │   (SFU Server)   │
└──────┬───────┘                  └────────┬─────────┘
       │                                    │
       │           WebRTC                   │
       │                                    │
┌──────┴────────────────────────────────────┴─────────┐
│              Python AI Agent                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │    Gemini    │  │  LangGraph   │  │ LiveKit  │  │
│  │   Realtime   │  │   Workflow   │  │  Client  │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Setup

### 1. Create LiveKit Account

1. Go to https://cloud.livekit.io
2. Sign up with GitHub or email
3. Create a new project

### 2. Get API Credentials

From your project dashboard:
- **API Key** (e.g., `APItmZGgjAJG5UC`)
- **API Secret** (long string)
- **WebSocket URL** (e.g., `wss://your-project.livekit.cloud`)

### 3. Configure Environment

Add to `.env.local`:

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

---

## 🚀 Running the System

### Start Frontend + Backend

```bash
npm run dev
```

### Start Python Agent (Required for Voice)

```bash
cd server/agent/python-livekit

# Install dependencies (first time)
uv sync

# Run agent
uv run python livekit_agent_langchain.py dev
```

---

## 🎙️ How It Works

### 1. Token Generation

When user starts a call:

```typescript
// Frontend requests token
const response = await fetch('/api/livekit/token', {
  method: 'POST',
  body: JSON.stringify({ scenarioId }),
});

const { token, url, roomName } = await response.json();
```

### 2. Room Connection

```typescript
import { Room } from 'livekit-client';

const room = new Room();
await room.connect(url, token);

// Enable microphone
await room.localParticipant.setMicrophoneEnabled(true);

// Listen for agent audio
room.on('trackSubscribed', (track) => {
  if (track.kind === 'audio') {
    const audioElement = track.attach();
    audioElement.play();
  }
});
```

### 3. Agent Auto-Join

Python agent detects the room:

```python
async def entrypoint(ctx: agents.JobContext):
    room = ctx.room
    
    # Auto-join when room created
    await session.start(room=room, agent=main_agent)
```

### 4. Voice Flow

```
User speaks → Microphone → LiveKit → Python Agent
                                               ↓
User hears ←  Speakers  ← LiveKit ←  Gemini Response
```

### 5. Coaching Data

```
Conversation → LangGraph → 3-Card Analysis → Data Channel → React UI
```

---

## 🐛 Troubleshooting

### "No voice from agent"

**Check:**
1. Python agent is running
2. LiveKit credentials are correct
3. Room name matches

**Debug:**
```bash
# Check agent logs
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

### "Can't connect to room"

**Check:**
1. Internet connection
2. Firewall (port 443)
3. LiveKit URL format (`wss://` not `https://`)

### "Microphone blocked"

**Solution:**
1. Click "Enable Audio" button first
2. Check browser permissions
3. Use HTTPS (not HTTP) in production

---

## 📚 Related

- [AXTRA Copilot](./axtra-copilot.md)
- [Python Agent Setup](../../05-deployment/environment-variables.md)

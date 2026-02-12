# LiveKit Voice Integration Guide

This guide explains how the Axtra Console integrates with LiveKit for real-time voice AI conversations with **AXTRA Copilot** - our AI-powered real-time coaching system.

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────────┐
│   React Client  │  ←───→  │   LiveKit Cloud  │  ←───→  │   Python AI Agent       │
│   (Browser)     │  WebRTC │   (Media Relay)  │  WebRTC │   (AXTRA Copilot)       │
│                 │         │                  │         │                         │
│ • Get token     │         │ • Route audio    │         │ • Auto-joins rooms      │
│ • Connect room  │         │ • Handle streams │         │ • Google Gemini Realtime│
│ • Enable mic    │         │                  │         │ • Parallel Supervisor   │
│ • Play audio    │         │                  │         │ • Real-time coaching    │
│ • Coaching UI   │         │                  │         │ • 3-Card Analysis       │
└─────────────────┘         └──────────────────┘         └─────────────────────────┘
         ↑                                                        ↑
         │         Node.js API (Token Generation)                 │
         └────────────────────────────────────────────────────────┘
```

**Key Points:**
- **Frontend** uses `livekit-client` (browser SDK)
- **Python AI Agent** runs as separate service using `livekit-agents` framework
- **AXTRA Copilot** provides real-time coaching via parallel LangGraph workflow
- **Node.js API** generates JWT tokens for room access
- Both connect to same LiveKit room via WebRTC
- Audio flows: User → LiveKit → Agent → LiveKit → User
- Coaching data flows: Agent → Supervisor → LiveKit Data Channel → Frontend

---

## AXTRA Copilot System

AXTRA Copilot is a **parallel AI coaching system** that analyzes conversations in real-time and provides actionable guidance to the trainee.

### How It Works

```
User Speech → Gemini Realtime → Agent Response
                                    ↓
                           Conversation Manager
                           (Tracks turns & triggers)
                                    ↓
                           LangGraph Supervisor
                           (3-Card Analysis)
                                    ↓
                           LiveKit Data Channel
                                    ↓
                           Frontend Coaching UI
```

### Trigger Conditions

Analysis runs automatically when:
1. **First analysis**: After 3 conversation turns
2. **Periodic**: Every 3 new turns after first analysis
3. **Character threshold**: 300+ characters accumulated
4. **Time threshold**: 30+ seconds since last analysis

### 3-Card Coaching System

| Card | Focus | Icon | Purpose |
|------|-------|------|---------|
| Card 1 | **Emotion** | 💝 Heart | Customer emotional state & empathy tips |
| Card 2 | **Leverage** | ⚖️ Scale | Negotiation position & deal dynamics |
| Card 3 | **Strategy** | 🎯 Target | Recommended approach & next steps |

Each card includes:
- **Title**: Brief label (translated to conversation language)
- **Detail**: Context explanation
- **Action**: Specific recommended action
- **Status**: `danger` | `warning` | `success` | `info`

### Suggested Script

The supervisor also generates a **context-aware suggested response** that considers:
- Who spoke last (agent or customer)
- What has already been discussed
- What action would be most appropriate next

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

# Debug Mode (Optional)
DEBUG_MODE=true  # Enable verbose logging
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

The AI Agent service detects the new room and automatically joins with the appropriate persona.

### 4. Voice Conversation with Coaching

- User speaks → Mic → LiveKit → Agent
- Agent responds → LiveKit → Frontend → Speakers
- **Parallel**: Supervisor analyzes conversation → Coaching cards → Frontend

### 5. Receiving Coaching Data

```typescript
// Frontend receives coaching via data channel
room.on(RoomEvent.DataReceived, (payload) => {
  const data = JSON.parse(new TextDecoder().decode(payload));
  
  if (data.type === 'coaching_update') {
    // Update UI with 3 cards + suggested script
    setCoachingData({
      analysisId: data.analysis_id,
      cards: data.cards,        // 3 coaching cards
      script: data.script       // suggested response
    });
  }
});
```

### 6. Ending Call & Viewing Summary

```typescript
// User clicks "End Call"
const handleEndCall = async () => {
  const result = await endCallAndSave();
  
  if (result) {
    // Show CallSummaryModal with:
    // - Overview: Summary, scores, strengths, improvements
    // - Transcript: Full conversation history
    // - Coaching History: All coaching cards received
    setShowSummary(true);
  }
};
```

**What happens on the backend:**
1. Save call session (duration, turns, sentiment, score)
2. Save all transcripts
3. Save coaching history
4. Generate summary (mock AI currently)
5. Mark simulation as "completed"

---

## Code Structure

### Frontend Components

| File | Purpose |
|------|---------|
| `src/lib/livekit.ts` | LiveKit client utilities |
| `src/stores/useLiveKitStore.ts` | Voice call state + coaching history |
| `src/components/livekit/` | LiveKit UI components |
| `src/components/livekit/AxtraCopilot.tsx` | Real-time coaching UI |
| `src/components/livekit/CallSummaryModal.tsx` | Post-call summary |
| `server/livekit.ts` | Token generation API |
| `server/call-sessions.ts` | Call saving & summary service |

### Python Agent Components

| File | Purpose |
|------|---------|
| `livekit_agent_langchain.py` | **Main entry point** with parallel architecture |
| `agents/workflow/build.py` | LangGraph workflow builder |
| `agents/workflow/nodes.py` | 3-card LLM nodes |
| `agents/prompts/agent_prompts.py` | LLM prompts for cards & script |
| `agents/agent_manager/agent.py` | Model configuration |

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
  
  // Listen for coaching data
  room.on(RoomEvent.DataReceived, (payload) => {
    const data = JSON.parse(new TextDecoder().decode(payload));
    if (data.type === 'coaching_update') {
      setCoachingData(data);
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
uv run python livekit_agent_langchain.py dev
```

**Requirements:**
- Python 3.9+ (project uses 3.13.3)
- [uv](https://github.com/astral-sh/uv) package manager
- Environment variables configured in `.env`

See [server/agent/python-livekit/README.md](../server/agent/python-livekit/README.md) for detailed setup instructions.

---

## Debug Mode

Enable verbose logging to trace conversation flow and coaching analysis:

### Enable Debug Mode

```bash
# In server/agent/python-livekit/.env
DEBUG_MODE=true
```

Or set environment variable:
```bash
export DEBUG_MODE=true
uv run python livekit_agent_langchain.py dev
```

### Debug Output

When debug mode is enabled, you'll see:

```
[13:44:14.738] [DEBUG:USER] Final Transcript
  → สวัสดีครับ...
[ConvManager] Turn 1 added (Customer): ...

============================================================
[TRIGGER CALCULATION] Turn 1
============================================================
  Buffer Size:      1 turns
  Chars Since Last: 72 chars
  Time Since Last:  13.4s
  Triggers Fired:   None
============================================================

🤖 [Agent Message]: นี่คือครั้งที่สองแล้วนะคะ!...
[ConvManager] Turn 2 added (Agent): ...

[MainAgent] Analysis triggered: Initial 3 turns complete
[MainAgent] Sending to supervisor queue...
[Supervisor] Queue message received: analyze
[Supervisor] Processing analysis request...
[Supervisor] 🔍 Analysis #1 starting...

============================================================
[WORKFLOW INPUT] Analysis #1
============================================================
User Info: {...}
Conversation Data (3 turns):
  [Customer]: ...
  [Agent]: ...
  [Customer]: ...
============================================================

[Supervisor] Workflow completed in 2.58s
[Supervisor] Cards generated: 3
[Supervisor] Script generated: True
[Supervisor] ✅ Data published to frontend

============================================================
AXTRA COPILOT UPDATE
============================================================
Card 1: ลูกค้าโกรธ
  Status: danger
  Action: แสดงความเข้าใจและขอโทษ...
Card 2: Gold Tier Benefits
  Status: success
  Action: เสนอสิทธิพิเศษระดับ Gold...
Card 3: การยกเลิกบริการ
  Status: warning
  Action: ใช้กลยุทธ์การรักษาลูกค้า...
Suggested Script: ขอโทษที่คุณลูกค้าประสบปัญหานี้...
============================================================
```

### Key Debug Events

| Event | Description |
|-------|-------------|
| `[DEBUG:USER] Streaming` | User speech in progress |
| `[DEBUG:USER] Final Transcript` | User finished speaking |
| `[Agent Message]` | AI agent response captured |
| `[TRIGGER CALCULATION]` | Shows why analysis fired (or didn't) |
| `[WORKFLOW INPUT]` | Data sent to LangGraph |
| `AXTRA COPILOT UPDATE` | Final coaching cards output |

---

## Testing Voice Calls

1. Open http://localhost:3000
2. Login with demo account
3. Go to **Simulations**
4. Click **"Start Practice"** on any scenario
5. Click **"Start Voice Call"**
6. Allow microphone permission
7. Wait for AI Agent to join ("Call in Progress" appears)
8. Start speaking - coaching cards will appear in the right panel after 3 turns

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **"No voice from agent"** | Check AI Agent service is running (`uv run python livekit_agent_langchain.py dev`) |
| **"Microphone blocked"** | Click "Enable Audio" button first (browser requires user gesture) |
| **"Can't connect to room"** | Verify LiveKit credentials in `.env.local` |
| **"Token invalid"** | Check `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` |
| **"Audio choppy"** | Check internet connection; LiveKit requires stable connection |
| **"Coaching cards not appearing"** | Check browser console for errors; ensure `DEBUG_MODE=true` to trace |
| **"Agent not responding"** | Check Python agent logs for errors; verify `GOOGLE_API_KEY` |

### Debugging Coaching Issues

If coaching cards don't appear:

1. **Check Python Agent Logs**
   ```bash
   # Look for these messages:
   [MainAgent] Analysis triggered: ...
   [Supervisor] 🔍 Analysis #X starting...
   [Supervisor] ✅ Data published to frontend
   ```

2. **Check Browser Console**
   ```javascript
   // Look for:
   🎯 AXTRA Copilot Update received: {...}
   ✅ Setting coaching data: {...}
   ```

3. **Verify Trigger Calculation**
   - Ensure conversation has at least 3 turns
   - Check that both Customer AND Agent turns are tracked
   - Look for `[TRIGGER CALCULATION]` in logs

4. **Common Causes**
   - Missing `supervisor.queue.put()` call (fixed in recent update)
   - Agent speech not being tracked (check `conversation_item_added` events)
   - Frontend not receiving data channel messages

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
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Google Gemini API](https://ai.google.dev/docs)

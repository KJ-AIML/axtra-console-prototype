# AXTRA Copilot - Implementation Guide

## Overview

AXTRA Copilot provides real-time AI coaching during voice simulations. It runs in parallel with the voice conversation:

1. **Main Voice Agent** - Handles conversation with customer (Gemini Realtime)
2. **Supervisor Process** - Analyzes conversation and generates coaching cards (LangGraph)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AXTRA COPILOT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐      ┌──────────────────────────┐   │
│  │   VOICE AGENT          │      │   SUPERVISOR             │   │
│  │   ───────────          │      │   ──────────             │   │
│  │                        │      │                          │   │
│  │   Gemini Realtime      │      │   LangGraph Workflow     │   │
│  │   • STT → LLM → TTS    │      │   • 3 Cards Parallel     │   │
│  │   • Voice I/O          │      │   • Aggregator Script    │   │
│  │                        │      │                          │   │
│  │   Triggers:            │─────►│   Triggered every:       │   │
│  │   • user_speech_committed   │  │   • 3 turns              │   │
│  │   • agent_speech_committed  │  │   • 300 chars            │   │
│  │                        │      │   • 30 seconds           │   │
│  └────────────────────────┘      └──────────┬───────────────┘   │
│                                              │                   │
│                                              │ publish_data()    │
│                                              ▼                   │
│                                     ┌──────────────────┐        │
│                                     │   FRONTEND       │        │
│                                     │   ─────────      │        │
│                                     │                  │        │
│                                     │   • 3 Cards UI   │        │
│                                     │   • Script UI    │        │
│                                     │                  │        │
│                                     └──────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `livekit_agent_langchain.py` | **Main entry point** - Parallel voice + analysis |
| `agents/workflow/build.py` | LangGraph workflow builder |
| `agents/workflow/nodes.py` | Workflow nodes (3 cards + aggregator) |
| `agents/schemas/types.py` | Pydantic schemas for structured output |
| `agents/prompts/agent_prompts.py` | LLM prompts for 3 cards |
| `agents/agent_manager/agent.py` | Model initialization |

## How It Works

### 1. Trigger Logic (ConversationManager)

Analysis triggers when ANY of these conditions are met:

- **First Analysis**: After 3 complete turns (user + agent exchanges)
- **Periodic**: Every 3 new turns after first analysis
- **Content**: When 300+ characters accumulated
- **Time**: When 30+ seconds passed with pending content

### 2. Data Flow

```
User speaks → Voice Agent hears → Turn recorded
                                    ↓
                              Check triggers
                                    ↓
                         Should analyze? ──No──→ Continue
                              ↓ Yes
                         Send to Supervisor
                              ↓
                         Run LangGraph Workflow
                              ↓
                         Generate 3 Cards + Script
                              ↓
                         Publish to Frontend
                              ↓
                         Console logs update
```

### 3. Output Format

Frontend receives:

```json
{
  "type": "coaching_update",
  "timestamp": 1709123456789,
  "analysis_id": 1,
  "cards": [
    {
      "title": "Frustrated Customer",
      "detail": "Customer is upset about billing...",
      "action": "Acknowledge frustration immediately",
      "status": "danger"
    },
    {
      "title": "Gold Tier Benefits",
      "detail": "Customer eligible for fee waiver",
      "action": "Offer courtesy credit",
      "status": "success"
    },
    {
      "title": "Retention Risk",
      "detail": "Mentioned canceling service",
      "action": "Use retention script",
      "status": "warning"
    }
  ],
  "script": {
    "summary": "Customer frustrated about billing, needs immediate resolution",
    "suggestion": "I understand your frustration. As a Gold member..."
  }
}
```

## Running the Agent

### 1. Start the Agent

```bash
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev
```

### 2. Check Console Output

You should see:

```
======================================================================
 AXTRA COPILOT AGENT STARTING 
======================================================================
Room: axtra-sim-xxxxx

[Setup] Building LangGraph workflow...
[Setup] Workflow built successfully
[Setup] Initializing Gemini Realtime...

======================================================================
 STARTING PARALLEL PROCESSES 
======================================================================
1. Voice Agent (Gemini Realtime)
2. Supervisor Process (LangGraph Analysis)
======================================================================
```

### 3. Make a Test Call

1. Open Axtra Console in browser
2. Go to Simulations
3. Select any scenario (e.g., "Billing Dispute")
4. Click "Start Voice Call"
5. Open browser console (F12)

### 4. Expected Console Logs

When you speak and analysis triggers:

```
[ConvManager] Turn 1 added (Customer): Hello, I have a problem...
[ConvManager] Buffer size: 1 turns, 50 chars

[Turn Complete - Agent]: Hello! How can I help you today?

[ConvManager] Turn 2 added (Customer): My bill is wrong!
[ConvManager] Buffer size: 2 turns, 120 chars

...

[ConvManager] 🔥 TRIGGER: First analysis (3 turns)
[MainAgent] Analysis triggered: Initial 3 turns complete

[Supervisor] 🔍 Analysis #1 starting...
[Supervisor] Workflow completed in 2.34s
[Supervisor] ✅ Data published to frontend

============================================================
AXTRA COPILOT UPDATE
============================================================

Card 1: Frustrated Customer
  Status: danger
  Action: Acknowledge frustration and apologize...

Card 2: Gold Tier Benefits  
  Status: success
  Action: Offer fee waiver as goodwill...

Card 3: Retention Risk
  Status: warning
  Action: Use retention script immediately...

Suggested Script: I understand your frustration. As a valued...
============================================================
```

In browser console, you should see:

```
🎯 AXTRA Copilot Update: {type: 'coaching_update', ...}
[AXTRA Copilot] {cards: [...], script: {...}}
```

## Frontend Integration

The store now has `coachingData` state:

```typescript
// In your component
const { coachingData } = useLiveKitStore();

// coachingData structure:
{
  analysisId: number;
  timestamp: number;
  cards: [
    { title, detail, action, status }, // Emotion card
    { title, detail, action, status }, // Leverage card  
    { title, detail, action, status }  // Strategy card
  ];
  script: {
    summary: string;
    suggestion: string;
  }
}
```

## Troubleshooting

### Agent won't start

```bash
# Check environment variables
cat .env | grep GOOGLE_API_KEY

# Verify workflow can be imported
uv run python -c "from agents.workflow.build import build_workflow; print('OK')"
```

### No console logs in browser

1. Check that `coaching_update` handler is in `useLiveKitStore.ts`
2. Verify data channel is connected
3. Check browser console for errors

### Workflow errors

```bash
# Test workflow alone
uv run python test_workflow.py
```

## Next Steps (After Console Logs Work)

1. ✅ Backend sending data - DONE
2. ✅ Frontend receiving data (console) - DONE
3. ⏳ Connect to UI (AIAnalysisPanel) - NEXT
4. ⏳ Replace mock data with real coaching data

# AXTRA Copilot - LiveKit Python Voice Agent with Real-Time Coaching

AI-powered voice agent for call center training simulations using LiveKit, Google's Gemini Realtime API, and LangGraph for parallel coaching analysis.

---

## Overview

This Python service provides the **AI Agent + AXTRA Copilot** system that connects to LiveKit rooms and engages in realistic voice conversations with trainees. It uses **Explicit Dispatch** - the agent is dispatched on-demand via API call rather than auto-joining rooms.

### Components

1. **Voice Agent**: Real-time voice conversation using Google Gemini Realtime API
2. **AXTRA Copilot**: Parallel coaching system using LangGraph for 3-card analysis

### Architecture

```
┌─────────────────┐   Dispatch API   ┌─────────────────┐   WebRTC + Data   ┌─────────────────┐
│  Node.js Backend│ ───────────────► │  LiveKit Cloud  │ ◄───────────────► │   Python Agent  │
│  POST /dispatch │   (Metadata)     │  (Agent Dispatch│   (Voice/Audio)   │  (AXTRA Copilot)│
│                 │                  │   + Media Relay)│                   │                 │
│ • Persona config│                  │                 │                   │ • Receives job  │
│ • Scenario info │                  │ • Routes to     │                   │ • Parses metadata
│ • Promotions    │                  │   axtra-training│                   │ • Gemini LLM    │
│ • User info     │                  │   -agent        │                   │ • LangGraph     │
└─────────────────┘                  └─────────────────┘                   └─────────────────┘
        │                                                                         │
        │        ┌─────────────────┐      WebRTC                                 │
        └──────► │  Axtra Console  │ ◄─────────────── (Voice + Coaching) ────────┘
                 │   (Frontend)    │
                 │                 │
                 │ • Browser mic   │
                 │ • Speaker out   │
                 │ • Coaching UI   │
                 └─────────────────┘
```

### Agent Dispatch Flow

```
1. User clicks "Start Voice Call" in Axtra Console
   ↓
2. Frontend requests token from Node.js API (/api/livekit/token)
   ↓
3. Frontend connects to LiveKit room
   ↓
4. Node.js backend DISPATCHES agent via LiveKit Agent API
   ↓   (POST to LiveKit with agent_name="axtra-training-agent")
   ↓   Metadata: {persona_config, scenario_config, user_info, available_promotions}
   ↓
5. Python agent receives job with metadata
   ↓
6. Agent joins room and starts voice conversation
   ↓
7. Parallel coaching analysis runs (LangGraph)
   ↓
8. Coaching cards sent to frontend via data channel
```

---

## Architecture

### Parallel Voice + Coaching System

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AXTRA Copilot Agent                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────┐    ┌─────────────────────────────────────────┐  │
│  │         VOICE AGENT PROCESS             │    │         SUPERVOR PROCESS                │  │
│  │                                         │    │                                         │  │
│  │  ┌─────────────────────────────────┐    │    │  ┌─────────────────────────────────┐    │  │
│  │  │ Google Gemini Realtime API      │    │    │  │ Conversation Manager            │    │  │
│  │  │                                 │    │    │  │ - Tracks Customer & Agent turns │    │  │
│  │  │ • STT: speech → text           │    │    │  │ - Calculates trigger conditions │    │  │
│  │  │ • LLM: generates response      │    │    │  │ - Maintains conversation buffer │    │  │
│  │  │ • TTS: text → speech           │    │    │  └───────────────┬─────────────────┘    │  │
│  │  └────────────┬────────────────────┘    │    │                  │                       │  │
│  │               │                         │    │  Triggers → Supervisor Queue           │  │
│  │  ┌────────────▼────────────────────┐    │    │                  │                       │  │
│  │  │ Event Handlers                  │    │    │                  ▼                       │  │
│  │  │                                 │    │    │  ┌─────────────────────────────────┐    │  │
│  │  │ user_input_transcribed          │────┼────┼──►│ LangGraph Workflow              │    │  │
│  │  │   → Customer turn → Manager     │    │    │  │                                 │    │  │
│  │  │                                 │    │    │  │  ┌─────┐ ┌─────┐ ┌─────┐         │    │  │
│  │  │ conversation_item_added         │────┼────┼──►│  │Card1│ │Card2│ │Card3│         │    │  │
│  │  │   → Agent turn → Manager        │    │    │  │  └──┬──┘ └──┬──┘ └──┬──┘         │    │  │
│  │  └─────────────────────────────────┘    │    │  │     │      │      │              │    │  │
│  │                                         │    │  │     └──────┼──────┘              │    │  │
│  └─────────────────────────────────────────┘    │  │            ▼                     │    │  │
│                                                  │  │     ┌─────────────┐              │    │  │
│                                                  │  │     │ Aggregator  │              │    │  │
│                                                  │  │     │ + Script    │              │    │  │
│                                                  │  │     └──────┬──────┘              │    │  │
│                                                  │  │            │                     │    │  │
│                                                  │  └────────────┼─────────────────────┘    │  │
│                                                  │               │                          │  │
│                                                  │               ▼                          │  │
│                                                  │   LiveKit.publish_data()                 │  │
│                                                  │   type: "coaching_update"                │  │
│                                                  │                                          │  │
│                                                  └──────────────────────────────────────────┘  │
│                                                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Trigger Logic

Analysis is triggered when:
1. **First analysis**: After 3 conversation turns
2. **Periodic**: Every 3 new turns after first analysis
3. **Character threshold**: 300+ characters accumulated
4. **Time threshold**: 30+ seconds since last analysis

### 3-Card Coaching System

| Card | Focus | LLM Role | Status Values |
|------|-------|----------|---------------|
| **Card 1** | Emotion | Emotional Intelligence Analyst | `danger` `warning` `success` |
| **Card 2** | Leverage | Customer Success & Policy Expert | `info` `success` |
| **Card 3** | Strategy | Strategic Sales & Support Coach | `danger` `warning` |

Each card includes: `title`, `detail`, `action`, `status`

### Suggested Script

Context-aware response suggestion considering:
- Who spoke last (customer or agent)
- What has already been discussed
- What action would be most appropriate next

---

## Prerequisites

- Python 3.9+ (project uses 3.13.3)
- [uv](https://github.com/astral-sh/uv) package manager (recommended)
- LiveKit Cloud account or self-hosted LiveKit server
- Google API key (for Gemini Realtime API)
- Node.js backend configured to dispatch agents (see [Integration](#integration-with-axtra-console))

**Important:** This agent uses **Explicit Dispatch** - it does NOT auto-join rooms. The Node.js backend must dispatch the agent via LiveKit's Agent Dispatch API.

---

## Installation

### 1. Install Dependencies

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -e ".[dev]"
```

### 2. Configure Environment Variables

Copy the example file and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:

```bash
# Required: LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Required: Google Gemini Configuration
GOOGLE_API_KEY=your_google_api_key

# Optional: Debug Mode
DEBUG_MODE=true  # Enable verbose logging

# Optional: Other providers
# OPENAI_API_KEY=your_openai_key
# DEEPGRAM_API_KEY=your_deepgram_key
```

**Get your API keys:**
- **LiveKit**: https://cloud.livekit.io (create a project → Settings → Keys)
- **Google Gemini**: https://aistudio.google.com/app/apikey

---

## Agent Configuration

### Agent Name

The agent is registered with a specific name that the Node.js backend uses to dispatch it:

```python
# In livekit_agent_langchain.py
agents.cli.run_app(
    agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="axtra-training-agent",  # Must match backend dispatch
    )
)
```

**This name must match** the agent name used in the Node.js backend dispatch call.

### Metadata Structure

When the Node.js backend dispatches the agent, it sends metadata that configures the conversation:

```json
{
  "persona_config": {
    "id": "angry-customer-sarah",
    "name": "Sarah Thompson",
    "tier": "Gold",
    "voice_id": "Zephyr",
    "system_prompt": "Detailed persona instructions...",
    "behavior_profile": {
      "initialMood": "angry",
      "patienceLevel": "low",
      "cooperationLevel": "medium"
    }
  },
  "scenario_config": {
    "id": "billing-dispute",
    "title": "Billing Dispute",
    "description": "Customer is disputing charges...",
    "difficulty": "Hard"
  },
  "user_info": {
    "userId": "user-123",
    "userName": "Agent Trainee"
  },
  "available_promotions": [
    {
      "id": "promo-1",
      "type": "personal",
      "name": "Loyalty Discount 20%",
      "discount_type": "percentage",
      "discount_value": 20,
      "urgency_score": 8
    }
  ],
  "dispatched_at": "2024-01-15T10:30:00Z"
}
```

### Metadata Usage

| Field | Used By | Purpose |
|-------|---------|---------|
| `persona_config` | Voice Agent | Defines customer personality, voice, behavior |
| `scenario_config` | Voice Agent | Sets context for the conversation |
| `user_info` | Supervisor | Identifies the trainee being coached |
| `available_promotions` | Coaching Cards | Suggests relevant offers during conversation |

---

## Running the Agent

The agent runs in **Explicit Dispatch** mode - it waits for the Node.js backend to dispatch it to a room. It will NOT auto-join rooms.

### Development Mode

```bash
# Run the agent with auto-reload on code changes
uv run python livekit_agent_langchain.py dev
```

You should see output like:
```
Starting AXTRA Copilot Agent...
Mode: Explicit Dispatch (On-Demand)
Usage: uv run python livekit_agent_langchain.py dev

# Agent is now waiting for dispatch from Node.js backend
```

### Production Mode

```bash
# Run the agent
uv run python livekit_agent_langchain.py start
```

The agent will:
1. Connect to LiveKit Cloud using your credentials
2. Monitor for new rooms matching the naming pattern `axtra-*`
3. Automatically join rooms when users connect
4. Start voice conversations using the configured persona
5. Run parallel coaching analysis and send updates via data channel

---

## Project Structure

```
python-livekit/
├── livekit_agent_langchain.py  # Main entry point - AXTRA Copilot Agent
│                               # Registers as "axtra-training-agent"
│                               # Receives dispatch from Node.js backend
│
├── livekit_basic_agent.py      # Basic agent (no coaching) - legacy
│
├── api/                        # Python AI Services API (FastAPI)
│   ├── server.py               # Summary + QA analysis endpoints
│   └── __init__.py
│
├── agents/                     # LangGraph components for coaching
│   ├── agent_manager/
│   │   └── agent.py            # LLM model configuration
│   ├── prompts/
│   │   └── agent_prompts.py    # 3-card coaching prompts
│   ├── schemas/
│   │   ├── types.py            # Data types (Promotions, etc.)
│   │   ├── call_summary_types.py
│   │   └── qa_types.py
│   ├── services/
│   │   └── hierarchical_summary.py
│   └── workflow/
│       ├── build.py            # LangGraph workflow builder
│       ├── nodes.py            # Card analysis nodes
│       ├── summary_nodes.py    # Call summary workflow
│       └── qa_analysis_nodes.py # QA scoring workflow
│
├── prompts.py                  # Persona definitions (Thai/English)
├── run_summary_api.py          # Script to run API server
├── test_workflow.py            # Workflow testing utilities
├── pyproject.toml              # Python dependencies
├── uv.lock                     # Locked dependency versions
├── .env                        # Environment variables (not in git)
├── .env.example                # Example environment file
├── .python-version             # Python version (3.13.3)
└── README.md                   # This file
```

---

## Key Components

### `livekit_agent_langchain.py`

The main agent implementation with AXTRA Copilot:

```python
# Parallel architecture
session = AgentSession(
    vad=silero.VAD.load(),
    stt=google.STT(...),
    llm=google.realtime.RealtimeModel(...),  # Voice conversation
    tts=google.TTS(...)
)

# Supervisor process for coaching
supervisor = SupervisorProcess(
    publish_data_callback=room.publish_data,
    user_info={...}
)
```

**Event Handlers:**
- `user_input_transcribed`: Captures customer speech → triggers analysis
- `conversation_item_added`: Captures agent speech → maintains conversation balance

**Conversation Manager:**
- Tracks both Customer and Agent turns
- Calculates trigger conditions
- Maintains rolling buffer of recent conversation

### `agents/workflow/build.py`

LangGraph workflow builder:

```python
# Parallel card analysis
workflow.add_node("card_1", call_model_card_1)
workflow.add_node("card_2", call_model_card_2)
workflow.add_node("card_3", call_model_card_3)
workflow.add_node("aggregator", aggregator_suggest_response)

# All cards run in parallel from START
workflow.add_edge(START, "card_1")
workflow.add_edge(START, "card_2")
workflow.add_edge(START, "card_3")

# Then aggregate
workflow.add_edge("card_1", "aggregator")
workflow.add_edge("card_2", "aggregator")
workflow.add_edge("card_3", "aggregator")
```

### `agents/prompts/agent_prompts.py`

Contains prompts for the 3 coaching cards:

- **LLM_1**: Emotional Intelligence Analyst (Card 1 - Emotion)
- **LLM_2**: Customer Success & Policy Expert (Card 2 - Leverage)
- **LLM_3**: Strategic Sales & Support Coach (Card 3 - Strategy)
- **LLM_SUGGEST**: Real-time Coaching Supervisor (generates suggested script)

### `prompts.py`

Contains persona definitions. Currently implements **Sarah Thompson** - an angry Gold Tier customer with a billing dispute scenario (Thai language).

---

## Debug Mode

Enable verbose logging to trace conversation flow:

```bash
# In .env
DEBUG_MODE=true
```

### Debug Output

When enabled, you'll see detailed logs:

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

---

## Persona System

Personas are defined in `prompts.py` using a structured format:

```python
CALLER_INSTRUCTIONS = """
#Persona: [Name]
[Character description and emotional state]

#Profile Data
- Name: ...
- Account ID: ...
- [Other relevant data]

#Scenario Context
[What issue the customer is calling about]

#Emotional State & Behavior Rules
##Phase 1: Opening
[Initial behavior and opening lines]

##Phase 2: Escalation Triggers
[What makes the customer angrier]

##Phase 3: De-escalation Points
[What calms the customer down]

##Phase 4: Resolution Acceptance
[When the customer will accept resolution]

#Test Objectives
[Skills trainees should demonstrate]

#Constraints
[Rules the AI must follow]
"""
```

---

## Testing

### Manual Testing

1. Start the agent: `uv run python livekit_agent_langchain.py dev`
2. Open Axtra Console in browser
3. Login and go to Simulations
4. Click "Start Practice" on any scenario
5. Click "Start Voice Call"
6. Allow microphone access
7. Speak to the AI agent
8. Watch for coaching cards to appear in the right panel after 3 turns

### Expected Behavior

- Agent joins the room within 1-2 seconds of user connecting
- Agent speaks first with the defined opening line
- Agent responds naturally to voice input
- Coaching cards appear after 3 turns (with DEBUG_MODE, you'll see trigger logs)
- Suggested script updates in real-time

---

## Integration with Axtra Console

### Agent Dispatch Mechanism

The Python agent uses **Explicit Dispatch** via LiveKit's Agent Dispatch API. The Node.js backend dispatches the agent to rooms on-demand.

#### Dispatch Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AGENT DISPATCH SEQUENCE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. User clicks "Start Voice Call" in Axtra Console                              │
│     ↓                                                                            │
│  2. Frontend → POST /api/simulations/:id/start (Node.js backend)                 │
│     ↓                                                                            │
│  3. Node.js creates LiveKit room + generates token                               │
│     ↓                                                                            │
│  4. Node.js → LiveKit Agent Dispatch API                                         │
│        AgentDispatchClient.createDispatch(roomName, "axtra-training-agent", {...})
│        Metadata: {persona_config, scenario_config, user_info, promotions}        │
│     ↓                                                                            │
│  5. LiveKit routes dispatch to connected Python agent                            │
│     ↓                                                                            │
│  6. Python agent receives job with metadata (entrypoint function)                │
│     ↓                                                                            │
│  7. Agent parses metadata, configures persona, joins room                        │
│     ↓                                                                            │
│  8. Voice conversation begins (WebRTC via LiveKit)                               │
│     ↓                                                                            │
│  9. Supervisor analyzes conversation (LangGraph)                                 │
│     ↓                                                                            │
│  10. Coaching data sent via LiveKit data channel                                 │
│     ↓                                                                            │
│  11. Frontend displays real-time coaching cards                                  │
│     ↓                                                                            │
│  12. User ends call → agent disconnects, ready for next dispatch                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Room Naming Convention

```
axtra-{scenarioId}-{userId}-{timestamp}
```

Example: `axtra-billing-dispute-01-abc123-1709123456789`

### Node.js Dispatch Code

The Node.js backend uses LiveKit's `AgentDispatchClient` to dispatch the agent:

```typescript
// In server/livekit.ts
import { AgentDispatchClient } from 'livekit-server-sdk';

const dispatchClient = new AgentDispatchClient(
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

// Dispatch agent to room
const dispatch = await dispatchClient.createDispatch(
  roomName,                    // e.g., "axtra-billing-dispute-01-abc123-..."
  'axtra-training-agent',      // Must match agent_name in Python worker
  { 
    metadata: JSON.stringify({
      persona_config: { ... },    // Customer personality
      scenario_config: { ... },   // Training scenario
      user_info: { ... },         // Trainee info
      available_promotions: [...] // Relevant offers
    })
  }
);
```

### Why Explicit Dispatch?

| Feature | Explicit Dispatch (Current) | Auto-Join (Alternative) |
|---------|---------------------------|------------------------|
| **Control** | Backend decides when agent joins | Agent joins any matching room |
| **Metadata** | Rich metadata passed at dispatch | Limited/no context |
| **Scalability** | Multiple agent types possible | One agent per room pattern |
| **Security** | Authenticated dispatch | Anyone can create matching room |
| **Use Case** | Training scenarios with specific personas | General voice AI assistant |

### Data Channel Format

```json
{
  "type": "coaching_update",
  "analysis_id": 1,
  "cards": [
    {
      "title": "ลูกค้าโกรธ",
      "detail": "ลูกค้าแสดงอารมณ์โกรธ...",
      "action": "แสดงความเข้าใจและขอโทษ...",
      "status": "danger"
    },
    ...
  ],
  "script": {
    "summary": "สรุปสถานการณ์...",
    "suggestion": "ข้อความแนะนำ..."
  }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Failed to connect to LiveKit" | Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| "Google API key invalid" | Verify `GOOGLE_API_KEY` is set correctly |
| **Agent not being dispatched** | Ensure Node.js backend is calling `AgentDispatchClient.createDispatch()` with correct `agent_name` |
| **Agent name mismatch** | Verify `agent_name="axtra-training-agent"` matches in both Python and Node.js code |
| **No metadata received** | Check that Node.js is passing metadata in the dispatch call |
| Agent not joining rooms | Agent uses explicit dispatch - it won't auto-join. Check dispatch logs |
| No audio from agent | Check microphone permissions in browser |
| Agent responds but no voice | Verify Gemini API has access to realtime models |
| High latency | Check network connection; Gemini Realtime requires low latency |
| Coaching cards not appearing | Enable `DEBUG_MODE=true` to trace trigger logic |

### Debug Checklist

#### Agent Dispatch Issues

If the agent is not joining the room:

1. **Check Python agent is running**: Look for `Starting AXTRA Copilot Agent...` in logs
2. **Verify agent_name matches**: Both Python (`agent_name="axtra-training-agent"`) and Node.js must use same name
3. **Check Node.js dispatch logs**: Look for `📡 LIVEKIT DISPATCH: Preparing to dispatch agent...`
4. **Verify metadata is sent**: Node.js logs should show `📦 METADATA PAYLOAD (sent to Python Agent)`
5. **Check Python receives metadata**: Look for `📦 METADATA RECEIVED FROM BACKEND` in Python logs

#### Coaching Cards Issues

If coaching cards don't appear:

1. Check Python logs for `[MainAgent] Analysis triggered:`
2. Check for `[Supervisor] ✅ Data published to frontend`
3. Verify browser console for `🎯 AXTRA Copilot Update received:`
4. Ensure both Customer AND Agent turns are tracked (check `conversation_item_added` handler)

---

## Development

### Code Style

```bash
# Format code
black livekit_agent_langchain.py agents/

# Lint code
ruff check livekit_agent_langchain.py agents/

# Type checking
mypy livekit_agent_langchain.py
```

### Adding New Card Types

1. Edit `agents/prompts/agent_prompts.py` - Add new LLM prompt
2. Edit `agents/workflow/nodes.py` - Add new node function
3. Edit `agents/workflow/build.py` - Wire node into workflow
4. Update frontend to display new card type

---

## Resources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Python SDK](https://github.com/livekit/python-sdks)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Google Gemini Realtime API](https://ai.google.dev/gemini-api/docs/realtime)
- [Axtra Console Documentation](../../docs/livekit.md)

---

## License

Private - Part of Axtra Console project

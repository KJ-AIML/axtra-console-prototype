# LiveKit Python Voice Agent

AI-powered voice agent for call center training simulations using LiveKit and Google's Gemini Realtime API.

---

## Overview

This Python service provides the **AI Agent** that connects to LiveKit rooms and engages in realistic voice conversations with trainees. It simulates various customer personas for call center training scenarios.

```
┌─────────────────┐      WebRTC       ┌─────────────────┐      WebRTC       ┌─────────────────┐
│  Axtra Console  │ ◄───────────────► │  LiveKit Cloud  │ ◄───────────────► │   Python Agent  │
│   (Frontend)    │   (Voice/Audio)   │  (Media Relay)  │   (Voice/Audio)   │  (This Service) │
│                 │                   │                 │                   │                 │
│ • React App     │                   │ • Route audio   │                   │ • Auto-joins    │
│ • Browser mic   │                   │ • Handle streams│                   │ • Gemini LLM    │
│ • Speaker out   │                   │                 │                   │ • STT/TTS       │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
```

---

## How It Works

1. **Trainee starts call** from Axtra Console frontend
2. **Frontend connects** to LiveKit room (gets token from Node.js API)
3. **This agent auto-detects** the new room and joins automatically
4. **Voice conversation** happens via LiveKit's WebRTC infrastructure
5. **Agent uses Gemini** for real-time speech-to-text and response generation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LiveKit Cloud                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Room: "axtra-{scenarioId}-{userId}-{timestamp}"                   │     │
│  │                                                                    │     │
│  │  ┌──────────────┐         ┌──────────────┐                         │     │
│  │  │   Trainee    │ ◄─────► │   AI Agent   │                         │     │
│  │  │ (Participant)│  Audio  │(Participant) │                         │     │
│  │  └──────────────┘         └──────────────┘                         │     │
│  │         ▲                         ▲                                │     │
│  └─────────┼─────────────────────────┼────────────────────────────────┘     │
│            │                         │                                      │
│            │ WebRTC                  │ WebRTC                               │
│            │                         │                                      │
└────────────┼─────────────────────────┼──────────────────────────────────────┘
             │                         │
             ▼                         ▼
┌─────────────────────┐      ┌─────────────────────┐
│   Axtra Console     │      │   Python Agent      │
│   (React + Browser) │      │   (This Service)    │
│                     │      │                     │
│ - livekit-client    │      │ - livekit-agents    │
│ - Microphone access │      │ - Google Gemini     │
│ - Audio playback    │      │ - Realtime STT/LLM  │
└─────────────────────┘      └─────────────────────┘
```

---

## Prerequisites

- Python 3.9+ (project uses 3.13.3)
- [uv](https://github.com/astral-sh/uv) package manager (recommended)
- LiveKit Cloud account or self-hosted LiveKit server
- Google API key (for Gemini Realtime API)

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

# Optional: Other providers (OpenAI, Deepgram, ElevenLabs)
# OPENAI_API_KEY=your_openai_key
# DEEPGRAM_API_KEY=your_deepgram_key
# ELEVEN_API_KEY=your_elevenlabs_key
```

**Get your API keys:**
- **LiveKit**: https://cloud.livekit.io (create a project → Settings → Keys)
- **Google Gemini**: https://aistudio.google.com/app/apikey

---

## Running the Agent

### Development Mode

```bash
# Run the agent with auto-reload on code changes
uv run python livekit_basic_agent.py dev
```

### Production Mode

```bash
# Run the agent
uv run python livekit_basic_agent.py start
```

The agent will:
1. Connect to LiveKit Cloud using your credentials
2. Monitor for new rooms matching the naming pattern `axtra-*`
3. Automatically join rooms when users connect
4. Start voice conversations using the configured persona

---

## Project Structure

```
python-livekit/
├── livekit_basic_agent.py    # Main agent entry point
├── prompts.py                 # Persona definitions (Thai/English)
├── pyproject.toml            # Python dependencies
├── uv.lock                   # Locked dependency versions
├── .env                      # Environment variables (not in git)
├── .env.example              # Example environment file
├── .python-version           # Python version (3.13.3)
└── README.md                 # This file
```

---

## Key Components

### `livekit_basic_agent.py`

The main agent implementation that:
- Creates an `AgentSession` with Google Gemini Realtime model
- Handles room connections via LiveKit Agents framework
- Processes voice input and generates responses
- Logs transcripts for debugging

### `prompts.py`

Contains persona definitions. Currently implements **Sarah Thompson** - an angry Gold Tier customer with a billing dispute scenario (Thai language).

Key persona elements:
- **Profile Data**: Customer identity, account info, history
- **Scenario Context**: The specific issue causing the call
- **Emotional States**: Phased behavior (Angry → De-escalated → Resolved)
- **Test Objectives**: Skills the trainee should demonstrate
- **Constraints**: Rules the AI must follow during conversation

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

## Customizing Personas

To create a new persona:

1. **Edit `prompts.py`** - Add a new instructions constant
2. **Update `livekit_basic_agent.py`** - Modify the `Assistant` class to use the new instructions
3. **Restart the agent** - Changes take effect immediately

Example:

```python
# prompts.py
TECH_SUPPORT_PERSONA = """
#Persona: Frustrated Senior User
[Your persona definition here]
"""

# livekit_basic_agent.py
from prompts import TECH_SUPPORT_PERSONA

class Assistant(Agent):
    def __init__(self):
        super().__init__(instructions=TECH_SUPPORT_PERSONA)
```

---

## Testing

### Manual Testing

1. Start the agent: `uv run python livekit_basic_agent.py dev`
2. Open Axtra Console in browser
3. Login and go to Simulations
4. Click "Start Practice" on any scenario
5. Click "Start Voice Call"
6. Allow microphone access
7. Speak to the AI agent

### Expected Behavior

- Agent joins the room within 1-2 seconds of user connecting
- Agent speaks first with the defined opening line
- Agent responds naturally to voice input
- Transcripts appear in the agent console
- Conversation follows the persona's emotional arc

---

## Integration with Axtra Console

### Room Naming Convention

The agent and frontend communicate via LiveKit room names:

```
axtra-{scenarioId}-{userId}-{timestamp}
```

Example: `axtra-billing-dispute-01-abc123-1709123456789`

The agent can parse this to:
- Determine which persona to use (from scenarioId)
- Log training sessions per user
- Track conversation history

### Data Flow

```
1. User clicks "Start Voice Call" in Axtra Console
   ↓
2. Frontend requests token from Node.js API (/api/livekit/token)
   ↓
3. Frontend connects to LiveKit room
   ↓
4. Python agent detects room, joins automatically
   ↓
5. Voice conversation begins (WebRTC via LiveKit)
   ↓
6. Frontend displays real-time transcription
   ↓
7. User ends call, frontend disconnects
   ↓
8. Agent leaves room, ready for next session
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to connect to LiveKit" | Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| "Google API key invalid" | Verify `GOOGLE_API_KEY` is set correctly |
| Agent not joining rooms | Ensure room name starts with `axtra-` or check agent logs |
| No audio from agent | Check microphone permissions in browser |
| Agent responds but no voice | Verify Gemini API has access to realtime models |
| High latency | Check network connection; Gemini Realtime requires low latency |

---

## Development

### Code Style

```bash
# Format code
black livekit_basic_agent.py prompts.py

# Lint code
ruff check livekit_basic_agent.py prompts.py

# Type checking
mypy livekit_basic_agent.py
```

### Adding New LLM Providers

The agent supports multiple LLM providers via LiveKit plugins:

```python
# OpenAI
from livekit.plugins import openai
llm = openai.LLM(model="gpt-4o-realtime-preview")

# Anthropic
from livekit.plugins import anthropic
llm = anthropic.LLM(model="claude-3-opus")

# Google (currently used)
from livekit.plugins import google
llm = google.realtime.RealtimeModel(...)
```

Install additional providers:

```bash
uv pip install livekit-plugins-anthropic livekit-plugins-groq
```

---

## Resources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Python SDK](https://github.com/livekit/python-sdks)
- [Google Gemini Realtime API](https://ai.google.dev/gemini-api/docs/realtime)
- [Axtra Console Documentation](../../docs/livekit.md)

---

## License

Private - Part of Axtra Console project

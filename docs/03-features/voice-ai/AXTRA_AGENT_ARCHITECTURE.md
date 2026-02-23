# AXTRA Copilot Agent Architecture

Complete guide to how the LiveKit Voice AI + LangGraph workflow works.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AXTRA VOICE AI SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      WebRTC       ┌──────────────────┐                │
│  │   React Frontend │ ◄────────────────► │  LiveKit Cloud   │                │
│  │   (Browser)      │    Voice + Data    │  (Media Relay)   │                │
│  └────────┬─────────┘                    └────────┬─────────┘                │
│           │                                        │                         │
│           │  1. Get Token                          │  2. Agent Joins         │
│           │  2. Connect Room                       │  3. Audio Exchange      │
│           │  3. Send/Receive Audio                 │  4. Data Channel        │
│           │                                        │                         │
│           │              ┌─────────────────────────┘                         │
│           │              │                                                   │
│           │              ▼                                                   │
│           │     ┌──────────────────┐                                         │
│           │     │  Python Agent    │                                         │
│           │     │  (livekit_agent_ │                                         │
│           │     │   langchain.py)  │                                         │
│           │     └────────┬─────────┘                                         │
│           │              │                                                   │
│           │              │  ┌──────────────────────────────────────┐         │
│           │              │  │     PARALLEL PROCESSING             │         │
│           │              │  │  ┌──────────┐    ┌──────────────┐   │         │
│           │              │  │  │ Voice    │    │ Supervisor   │   │         │
│           │              │  │  │ Agent    │◄──►│ (LangGraph)  │   │         │
│           │              │  │  │ (Gemini) │    │ (Analysis)   │   │         │
│           │              │  │  └──────────┘    └──────────────┘   │         │
│           │              │  └──────────────────────────────────────┘         │
│           │              │                                                   │
│           └──────────────┘                                                   │
│                          ▲                                                   │
│                          │  5. Coaching Data                                 │
│                          │     (via Data Channel)                            │
│  ┌───────────────────────┴────────────────────────┐                          │
│  │         AXTRA Copilot UI Component             │                          │
│  │   - 3 Coaching Cards (Emotion/Leverage/Strategy)│                          │
│  │   - Suggested Script                            │                          │
│  └────────────────────────────────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure & Responsibilities

```
server/agent/python-livekit/
│
├── livekit_agent_langchain.py    # Main entry point
│   ├── ConversationManager       # Tracks conversation & triggers analysis
│   ├── SupervisorProcess         # Runs LangGraph workflow in background
│   └── MainAgent                 # Voice agent with Gemini Realtime API
│
├── agents/
│   ├── agent_manager/
│   │   └── agent.py              # LangChain model initialization
│   │       - Google Gemini 2.5 Flash Lite
│   │       - Structured output models
│   │
│   ├── prompts/
│   │   └── agent_prompts.py      # LLM prompts for each analysis card
│   │       - LLM_1: Emotion Analysis
│   │       - LLM_2: Leverage/Benefits
│   │       - LLM_3: Strategy/Next Action
│   │       - LLM_SUGGEST: Final script synthesis
│   │
│   ├── schemas/
│   │   └── types.py              # Pydantic models for structured output
│   │       - SuggestionCard (title, detail, action, status)
│   │       - SuggestionResponse (summary, suggestion)
│   │
│   └── workflow/
│       ├── build.py              # LangGraph workflow builder
│       │   - Creates parallel workflow (Card 1, 2, 3 run simultaneously)
│       │   - Aggregator combines results
│       │
│       └── nodes.py              # Workflow node implementations
│           - call_model_card_1: Emotion analysis
│           - call_model_card_2: Leverage analysis
│           - call_model_card_3: Strategy analysis
│           - aggregator_suggest_response: Final script
│
└── prompts.py                    # Persona definitions (Sarah, Robert, etc.)
```

---

## How It Works

### 1. Voice Conversation Flow

```
Trainee speaks ──► LiveKit Cloud ──► Python Agent ──► Gemini Realtime API
                                                        │
                                                        ▼
Trainee hears ◄── LiveKit Cloud ◄── Python Agent ◄── AI Response
```

**Key Components:**
- **LiveKit**: Handles WebRTC audio streaming
- **Gemini Realtime API**: Speech-to-text + LLM + Text-to-speech in one
- **MainAgent**: Manages the voice conversation

### 2. Coaching Analysis Flow (Parallel)

While voice conversation happens, a **separate supervisor process** analyzes the conversation:

```
┌──────────────────────────────────────────────────────────────┐
│                    ANALYSIS TRIGGER                           │
│                                                               │
│  Analysis runs when ANY of these conditions are met:          │
│  • 3 conversation turns (after first 3 turns)                 │
│  • 300+ characters since last analysis                        │
│  • 30+ seconds since last analysis                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              LANGGRAPH WORKFLOW (Parallel)                    │
│                                                               │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │  Card 1     │   │  Card 2     │   │  Card 3     │       │
│   │  Emotion    │   │  Leverage   │   │  Strategy   │       │
│   │  (LLM_1)    │   │  (LLM_2)    │   │  (LLM_3)    │       │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│          │                 │                 │              │
│          └─────────────────┼─────────────────┘              │
│                            │                                │
│                            ▼                                │
│                    ┌───────────────┐                        │
│                    │  Aggregator   │                        │
│                    │  (LLM_SUGGEST)│                        │
│                    │  Combines all │                        │
│                    │  into script  │                        │
│                    └───────┬───────┘                        │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    DATA CHANNEL                              │
│                                                               │
│  JSON Payload sent to frontend:                               │
│  {                                                            │
│    "analysis_id": 1,                                          │
│    "cards": [                                                 │
│      {"title": "", "detail": "", "action": "", "status": ""},   │
│      {"title": "", "detail": "", "action": "", "status": ""},   │
│      {"title": "", "detail": "", "action": "", "status": ""}    │
│    ],                                                         │
│    "script": {                                                │
│      "summary": "",                                           │
│      "suggestion": ""                                         │
│    }                                                          │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 3. The 3-Card System

Each analysis produces 3 coaching cards:

| Card | Role | Focus | Status Options |
|------|------|-------|----------------|
| **Card 1** | Emotional Intelligence Analyst | Customer's emotional state | `danger`, `warning`, `success` |
| **Card 2** | Customer Success Expert | Benefits/leverage to offer | `info`, `success` |
| **Card 3** | Strategic Sales Coach | Risk mitigation/next action | `danger`, `warning` |

**Example Output:**
```json
{
  "cards": [
    {
      "title": "High Frustration",
      "detail": "Customer is angry about billing error",
      "action": "Acknowledge immediately, show empathy",
      "status": "danger"
    },
    {
      "title": "Gold Tier Benefits",
      "detail": "Customer entitled to priority support",
      "action": "Offer immediate credit + expedited handling",
      "status": "success"
    },
    {
      "title": "Churn Risk",
      "detail": "Mentioned switching to competitor",
      "action": "Escalate to retention specialist",
      "status": "danger"
    }
  ],
  "script": {
    "summary": "Customer upset about billing, mentioned competitor",
    "suggestion": "I sincerely apologize for this billing error. As a Gold member, I'm issuing an immediate $50 credit and prioritizing this..."
  }
}
```

---

## Key Classes Explained

### 1. `ConversationManager`

**Purpose:** Track conversation and decide when to analyze

```python
class ConversationManager:
    def add_turn(speaker, text) -> Dict:
        # Stores turn in buffer
        # Checks if analysis should trigger
        # Returns: {"should_analyze": True/False, ...}
    
    def _check_triggers() -> Dict:
        # Trigger 1: First 3 turns
        # Trigger 2: Every 3 new turns
        # Trigger 3: 300+ characters
        # Trigger 4: 30+ seconds
```

### 2. `SupervisorProcess`

**Purpose:** Run LangGraph workflow in background

```python
class SupervisorProcess:
    async def run():
        # Main loop waits for analysis requests
        # Runs workflow when triggered
        # Publishes results to frontend
```

### 3. `MainAgent` (Voice Agent)

**Purpose:** Handle voice conversation

```python
class MainAgent(Agent):
    # Uses Gemini Realtime API
    # STT -> LLM -> TTS in one API
    # Sends conversation turns to Supervisor
```

---

## Data Flow Summary

```
1. User clicks "Start Call" in React
   └─► Browser connects to LiveKit room

2. Python agent detects room
   └─► Automatically joins via LiveKit Agents framework

3. Voice conversation starts
   ├─► Trainee speaks → LiveKit → Python Agent → Gemini API
   └─► Gemini responds → Python Agent → LiveKit → Trainee hears

4. Conversation tracked
   └─► Each turn stored in ConversationManager

5. Analysis triggered (every 3 turns/300 chars/30 sec)
   └─► SupervisorProcess runs LangGraph workflow

6. Workflow executes (parallel)
   ├─► Card 1: Emotion analysis (LLM call)
   ├─► Card 2: Leverage analysis (LLM call)
   ├─► Card 3: Strategy analysis (LLM call)
   └─► Aggregator: Combines into script (LLM call)

7. Results published
   └─► Via LiveKit Data Channel → React frontend

8. Frontend displays
   └─► AxtraCopilot component shows 3 cards + script
```

---

## Technologies Used

| Component | Technology | Purpose |
|-----------|------------|---------|
| Voice Streaming | LiveKit (WebRTC) | Real-time audio |
| Voice AI | Google Gemini Realtime API | STT + LLM + TTS |
| Workflow | LangGraph | Parallel analysis |
| LLM | Gemini 2.5 Flash Lite | Coaching analysis |
| Structured Output | Pydantic | Type-safe responses |
| Data Transport | LiveKit Data Channel | Coaching to frontend |

---

## Running the Agent

```bash
cd server/agent/python-livekit

# Development (auto-reload)
uv run python livekit_agent_langchain.py dev

# Production
uv run python livekit_agent_langchain.py start

# Debug mode (verbose logging)
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

---

## Customizing Behavior

### Change Persona
Edit `prompts.py` to modify customer behavior:

```python
CALLER_INSTRUCTIONS = """
#Persona: [Name]
#Profile Data
- Name: ...
- Tier: ...

#Emotional State & Behavior Rules
##Phase 1: Opening
[Initial behavior]

##Phase 2: Escalation Triggers
[What makes customer angrier]
"""
```

### Change Analysis Prompts
Edit `agents/prompts/agent_prompts.py`:

```python
LLM_1 = """
ROLE: [Your custom role]
OBJECTIVE: [Your custom objective]
...
"""
```

### Change Trigger Conditions
Edit `livekit_agent_langchain.py`:

```python
class ConversationManager:
    def __init__(self):
        self.turns_between_analysis = 3  # Change this
        self.chars_threshold = 300        # Change this
        self.time_threshold = 30          # Change this
```

---

## Debugging

Enable debug mode to see detailed logs:

```bash
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

You'll see:
- Trigger calculations (turns, chars, time)
- Workflow node inputs/outputs
- LLM responses for each card
- Data channel publishing


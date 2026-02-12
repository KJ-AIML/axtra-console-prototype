# AXTRA Copilot

Real-time AI coaching system using LangGraph.

---

## 🎯 Overview

AXTRA Copilot analyzes conversations in real-time and provides actionable coaching through:
- **3-Card Analysis** (Emotion, Leverage, Strategy)
- **Suggested Scripts** - Context-aware responses
- **Knowledge Base Links** - Relevant articles

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AXTRA COPILOT                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Voice Agent                    Supervisor Process       │
│  ┌──────────────┐               ┌──────────────────┐    │
│  │    Gemini    │──Events─────▶│ Conversation     │    │
│  │   Realtime   │               │ Manager          │    │
│  └──────────────┘               └────────┬─────────┘    │
│                                          │              │
│  Events:                                 │ Triggers     │
│  • user_input_transcribed                │ (3 turns,    │
│  • conversation_item_added               │  300 chars,  │
│                                          │  30 sec)     │
│                                          ▼              │
│                              ┌──────────────────────┐   │
│                              │   LangGraph Workflow │   │
│                              │                      │   │
│                              │  ┌────┐┌────┐┌────┐ │   │
│                              │  │Card││Card││Card│ │   │
│                              │  │ 1  ││ 2  ││ 3  │ │   │
│                              │  └──┬─┘└─┬──┘└─┬──┘ │   │
│                              │     └────┼─────┘    │   │
│                              │          ▼          │   │
│                              │  ┌──────────────┐   │   │
│                              │  │  Aggregator  │   │   │
│                              │  │  + Script    │   │   │
│                              │  └──────┬───────┘   │   │
│                              └─────────┼───────────┘   │
│                                        │               │
│                              LiveKit   │   Data Channel│
│                              ◀─────────┘               │
│                                        │               │
└────────────────────────────────────────┼───────────────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │  React Frontend  │
                              │  AxtraCopilot.tsx│
                              └──────────────────┘
```

---

## 🎴 3-Card System

| Card | Icon | Focus | Status Values |
|------|------|-------|---------------|
| **1** | 💝 Heart | Emotion | `danger`, `warning`, `success` |
| **2** | ⚖️ Scale | Leverage | `info`, `success` |
| **3** | 🎯 Target | Strategy | `danger`, `warning` |

Each card includes:
- **Title** - Brief label
- **Detail** - Context explanation
- **Action** - Specific recommendation
- **Status** - Visual indicator (color-coded)

---

## 🔄 Trigger Conditions

Analysis runs when **any** threshold is met:

1. **First Analysis** - After 3 conversation turns
2. **Periodic** - Every 3 new turns
3. **Content** - 300+ characters accumulated
4. **Time** - 30+ seconds elapsed

---

## 📝 Data Structure

```typescript
interface CoachingData {
  analysisId: number;
  timestamp: number;
  cards: CoachingCard[];
  script: {
    summary: string;
    suggestion: string;
  };
}

interface CoachingCard {
  title: string;
  detail: string;
  action: string;
  status: 'danger' | 'warning' | 'success' | 'info';
}
```

---

## 🚀 Configuration

### Environment Variables

```bash
# Python Agent
GOOGLE_API_KEY=your_gemini_key
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
DEBUG_MODE=true  # Optional: verbose logging
```

### Persona Configuration

Edit `server/agent/python-livekit/prompts.py`:

```python
CALLER_INSTRUCTIONS = """
#Persona: [Name]
[Character description]

#Scenario Context
[Issue causing the call]

#Emotional State & Behavior Rules
##Phase 1: Opening
[Initial behavior]

##Phase 2: Escalation Triggers
[What makes customer angrier]

##Phase 3: De-escalation Points
[What calms them down]
"""
```

---

## 📊 Debug Mode

Enable verbose logging:

```bash
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

**Output includes:**
- Trigger calculations
- Conversation buffer state
- Workflow input/output
- Data channel publishing

---

## 🔧 Troubleshooting

### "Coaching cards not appearing"

1. Check Python agent logs for `[MainAgent] Analysis triggered`
2. Verify browser console for `🎯 AXTRA Copilot Update received`
3. Ensure both customer AND agent turns are tracked

### "Empty coaching cards"

Check LangGraph output - cards should have:
- `title`, `detail`, `action`, `status` fields

### "Analysis not triggering"

Verify trigger conditions:
- At least 3 turns
- Both speakers tracked
- Check `[TRIGGER CALCULATION]` in logs

---

## 📚 Related

- [LiveKit Integration](./livekit-integration.md)
- [System Architecture](../../02-architecture/index.md)

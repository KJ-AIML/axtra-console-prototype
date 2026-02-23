# Voice AI

LiveKit voice integration, AI coaching, and call analysis systems.

---

## 📖 Documents

| Document | Description |
|----------|-------------|
| [AXTRA Copilot](./axtra-copilot.md) | Real-time 3-card coaching |
| [AI Call Summary](./ai-call-summary.md) | AI-powered post-call summary |
| [Call Recording](./call-recording.md) | Dual-track audio recording |
| [LiveKit Integration](./livekit-integration.md) | Voice call setup |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Voice AI System                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                       │
│  │   Browser    │                                                       │
│  │   (React)    │                                                       │
│  └──────┬───────┘                                                       │
│         │ WebRTC                                                        │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      LiveKit Cloud                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   Room      │  │   Egress    │  │      Data Channel       │  │   │
│  │  │  (Media)    │  │ (Recording) │  │  (Coaching → Frontend)  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘  │   │
│  └─────────┼────────────────┼──────────────────────────────────────┘   │
│            │                │                                           │
│            │                │ WebSocket                                 │
│            │                ▼                                           │
│            │         ┌─────────────┐                                    │
│            │         │     R2      │                                    │
│            │         │  (Storage)  │                                    │
│            │         └─────────────┘                                    │
│            │                                                            │
│            ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Python AI Agent (Port 8000)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   Voice     │  │ Supervisor  │  │  Call Summary API       │  │   │
│  │  │   Agent     │  │  (3-Card)   │  │  (Port 8001)            │  │   │
│  │  │  (Gemini)   │  │ (LangGraph) │  │  - Hierarchical Summary │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Start Python Voice Agent + Copilot
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev

# 2. Start AI Call Summary API (separate terminal)
cd server/agent/python-livekit
uv run python api/server.py

# 3. Start Axtra Console
npm run dev

# 4. Open http://localhost:3000
# 5. Start a voice call
```

---

## 📊 Feature Comparison

| Feature | Real-Time | Post-Call | AI-Powered |
|---------|-----------|-----------|------------|
| **AXTRA Copilot** | ✅ | ❌ | ✅ |
| **Call Recording** | ✅ | ✅ | ❌ |
| **AI Summary** | ❌ | ✅ | ✅ |
| **QA Scoring** | ❌ | ✅ | ❌ |

---

## 📚 Next Steps

- [AXTRA Copilot](./axtra-copilot.md) - Learn about real-time coaching
- [AI Call Summary](./ai-call-summary.md) - Configure AI summary API
- [Call Recording](./call-recording.md) - Set up R2 storage
- [Troubleshooting](../../06-reference/troubleshooting.md) - Fix voice issues

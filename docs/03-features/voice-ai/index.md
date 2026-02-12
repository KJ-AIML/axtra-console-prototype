# Voice AI

LiveKit voice integration and AXTRA Copilot system.

---

## 📖 Documents

| Document | Description |
|----------|-------------|
| [AXTRA Copilot](./axtra-copilot.md) | Real-time 3-card coaching |
| [LiveKit Integration](./livekit-integration.md) | Voice call setup |

---

## 🏗️ Architecture

```
┌─────────────┐      WebRTC + Data      ┌─────────────────┐
│   Client    │◄──────────────────────►│  LiveKit Cloud  │
│  (Browser)  │                         │   (SFU/Media)   │
└──────┬──────┘                         └────────┬────────┘
       │                                          │
       │  1. Get token                            │  3. Agent joins
       │  2. Connect room                         │  4. Voice conversation
       │  3. Enable mic                           │  5. Coaching data
       │  4. Subscribe audio                      │
       └──────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Start Python Agent
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev

# 2. Start Axtra Console
npm run dev

# 3. Open http://localhost:3000
# 4. Start a voice call
```

---

## 📚 Next Steps

- [AXTRA Copilot](./axtra-copilot.md) - Learn about coaching
- [Troubleshooting](../../06-reference/troubleshooting.md) - Fix voice issues

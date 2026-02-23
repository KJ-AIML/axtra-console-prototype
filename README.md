# Axtra Console

AI-powered call center coaching and real-time assist platform.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.9+ with [uv](https://github.com/astral-sh/uv) package manager
- LiveKit Cloud account
- Google API key (for Gemini)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for voice agent)
cd server/agent/python-livekit
uv sync
cd ../../..
```

### 2. Setup Environment

```bash
# Copy example files
cp .env.local.example .env.local
cp server/agent/python-livekit/.env.example server/agent/python-livekit/.env

# Edit both files with your API keys
```

### 3. Start Services

```bash
# Terminal 1: Start frontend + Node.js backend (ports 3000 + 3001)
npm run dev

# Terminal 2: Start Python voice agent + AXTRA Copilot
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev
```

**Access:** http://localhost:3000  
**Demo Account:** admin@axtra.local / admin123

> **Note:** `npm run dev` starts **both** the Vite frontend (port 3000) AND the Node.js API backend (port 3001) automatically. You don't need a separate terminal for the Node.js backend during development!

### 📖 Python Agent Documentation

For detailed information about the AI Voice Agent + AXTRA Copilot system:

**[📚 Python Agent README](./server/agent/python-livekit/README.md)**

Includes:
- Architecture overview (parallel voice + coaching system)
- 3-card coaching analysis details
- Environment setup and configuration
- Debug mode and troubleshooting
- Persona system documentation

---

## 📚 Documentation

Complete documentation is organized by topic:

| Section | Description |
|---------|-------------|
| **[Getting Started](./docs/01-getting-started/)** | Installation, setup, first steps |
| **[Architecture](./docs/02-architecture/)** | System design, frontend, backend, database |
| **[Features](./docs/03-features/)** | Voice AI, AXTRA Copilot, training simulations |
| **[Development](./docs/04-development/)** | Coding standards, testing, design system |
| **[Deployment](./docs/05-deployment/)** | Environment variables, production setup |
| **[Reference](./docs/06-reference/)** | API docs, troubleshooting |
| **[Roadmap](./docs/07-roadmap/)** | Future plans, improvements |

### Additional References

| Document | Description |
|----------|-------------|
| **[Python Agent + AXTRA Copilot](./server/agent/python-livekit/README.md)** | AI voice agent with real-time 3-card coaching |
| **[AGENTS.md](./AGENTS.md)** | Detailed developer guide for AI coding agents |

**Start here:** [Documentation Index](./docs/README.md)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **State** | Zustand v5 |
| **Styling** | Tailwind CSS v4 |
| **Backend** | Node.js HTTP Server |
| **Database** | Turso (libsql) |
| **Voice AI** | LiveKit + Google Gemini Realtime API |
| **Coaching** | LangGraph + LangChain (Python) |
| **AI Agent** | Python 3.13, LiveKit Agents Framework |

---

## 🎯 Key Features

- **🔐 Authentication** - JWT-based with Turso
- **📊 Dashboard** - Real-time KPIs and progress tracking
- **🎙️ Voice AI** - Live voice calls with AI agents
- **💡 AXTRA Copilot** - Real-time 3-card coaching analysis (Emotion, Leverage, Strategy)
- **🎓 Training** - 8 AI-powered simulation scenarios
- **📹 Recordings** - Dual-track call playback
- **📈 Analytics** - Skill velocity, QA highlights

### 💡 AXTRA Copilot (Real-Time Coaching)

The AI-powered coaching system analyzes voice conversations in real-time using parallel processing:

| Card | Focus | Purpose |
|------|-------|---------|
| **Card 1** | Emotion | Emotional state analysis and empathy guidance |
| **Card 2** | Leverage | Customer tier benefits and policy utilization |
| **Card 3** | Strategy | Sales tactics and de-escalation strategies |

**How it works:**
1. Voice conversation flows through LiveKit WebRTC
2. Google Gemini Realtime API handles speech-to-text and responses
3. LangGraph workflow analyzes conversation every 3 turns/30 seconds
4. Coaching cards sent via data channel to frontend
5. Suggested script updates based on context

📖 **[Detailed Python Agent Documentation](./server/agent/python-livekit/README.md)**

---

Built with ❤️ using React, Vite, and Turso.

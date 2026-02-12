# Axtra Console

AI-powered call center coaching and real-time assist platform.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Terminal 1: Start frontend + Node.js backend (ports 3000 + 3001)
npm run dev

# Terminal 2: Start Python voice agent + Copilot
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev

# Terminal 3: Start Python AI services (summary + QA)
cd server/agent/python-livekit
uv run -m api.server
```

**Access:** http://localhost:3000  
**Demo Account:** admin@axtra.local / admin123

> **Note:** `npm run dev` starts **both** the Vite frontend (port 3000) AND the Node.js API backend (port 3001) automatically via the `apiPlugin()` in Vite config. You don't need a separate terminal for the Node.js backend during development!

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
| **Voice AI** | LiveKit + Google Gemini |
| **Coaching** | LangGraph + LangChain |

---

## 🎯 Key Features

- **🔐 Authentication** - JWT-based with Turso
- **📊 Dashboard** - Real-time KPIs and progress tracking
- **🎙️ Voice AI** - Live voice calls with AI agents
- **💡 AXTRA Copilot** - Real-time 3-card coaching analysis
- **🎓 Training** - 8 AI-powered simulation scenarios
- **📹 Recordings** - Dual-track call playback
- **📈 Analytics** - Skill velocity, QA highlights

---

## 🧪 Testing

```bash
npm test -- --run    # Run tests once
npm test             # Watch mode
npm run test:ui      # UI mode
```

---

## 📄 License

Proprietary and confidential.

---

Built with ❤️ using React, Vite, and Turso.

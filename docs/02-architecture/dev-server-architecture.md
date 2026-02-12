# Development Server Architecture

How the development servers work together and what runs on each port.

---

## 🎯 Quick Overview

During development, you run **3 terminals** that start **4 services** on **4 ports**:

| Terminal | Command | Services Started | Ports |
|----------|---------|------------------|-------|
| **1** | `npm run dev` | Vite Frontend + Node.js API | 3000 + 3001 |
| **2** | `uv run python livekit_agent_langchain.py dev` | Python Voice Agent | 8000 |
| **3** | `uv run -m api.server` | Python AI Services | 8001 |

> **Key Insight:** `npm run dev` starts **both** frontend and backend automatically!

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT SETUP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TERMINAL 1: npm run dev                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  VITE DEV SERVER (Port 3000)                                       │   │
│  │  ┌─────────────────┐                                                │   │
│  │  │  React Frontend │  ← Browser accesses http://localhost:3000      │   │
│  │  │  - UI Components│                                                │   │
│  │  │  - User clicks  │                                                │   │
│  │  └────────┬────────┘                                                │   │
│  │           │                                                         │   │
│  │           │ API calls to /api/*                                     │   │
│  │           │                                                         │   │
│  │           ▼ Proxy to port 3001                                      │   │
│  │                                                                     │   │
│  │  NODE.JS API SERVER (Port 3001)  ← Auto-started by apiPlugin()     │   │
│  │  ┌─────────────────┐                                                │   │
│  │  │  Backend Logic  │                                                │   │
│  │  │  - Auth/JWT     │                                                │   │
│  │  │  - Database API │  ← Talks to Turso                              │   │
│  │  │  - File uploads │  ← Uploads to R2                               │   │
│  │  └────────┬────────┘                                                │   │
│  │           │                                                         │   │
│  │           ├──▶ Turso Database (cloud SQLite)                        │   │
│  │           │                                                         │   │
│  │           └──▶ Python AI Service (Port 8001)                        │   │
│  │                    - Call summaries                                 │   │
│  │                    - QA analysis                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  TERMINAL 2: uv run python livekit_agent_langchain.py dev                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PYTHON VOICE AGENT (Port 8000)                                    │   │
│  │  ┌─────────────────┐                                                │   │
│  │  │  LiveKit Room   │  ← WebRTC connection to browser               │   │
│  │  │  - Audio I/O    │                                                │   │
│  │  │  - Gemini LLM   │  ← Google AI                                   │   │
│  │  │  - Copilot      │  ← LangGraph coaching                          │   │
│  │  └─────────────────┘                                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  TERMINAL 3: uv run -m api.server                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  PYTHON AI SERVICES (Port 8001)                                    │   │
│  │  ┌─────────────────┐                                                │   │
│  │  │  FastAPI Server │                                                │   │
│  │  │  - /api/summary │  ← Post-call summary generation                │   │
│  │  │  - /api/qa      │  ← QA analysis                                 │   │
│  │  │  - /health      │  ← Health check                                │   │
│  │  └─────────────────┘                                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 How `npm run dev` Works

### vite.config.ts

```typescript
import { apiPlugin } from './server';

export default defineConfig({
  server: {
    port: 3000,  // Frontend runs here
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Backend runs here
      }
    }
  },
  plugins: [
    react(),
    apiPlugin(),  // ← This starts the backend!
  ],
});
```

### server/index.ts - apiPlugin()

```typescript
export function apiPlugin() {
  return {
    name: 'api-server',
    async configureServer(server) {
      // 1. Initialize database
      await initDatabase();
      
      // 2. Start API server on port 3001
      await startServer();
      
      console.log('🚀 API Server running on http://localhost:3001');
    },
  };
}
```

When you run `npm run dev`:
1. Vite starts on port 3000 (frontend)
2. Vite calls `apiPlugin()` which starts Node.js API on port 3001 (backend)
3. Frontend API calls are proxied from 3000 → 3001

---

## 📡 Request Flow Example

### User Logs In

```
1. Browser (localhost:3000)
   └── User submits login form
   
2. Frontend calls: fetch('/api/auth/login', {...})
   └── Vite proxies to port 3001
   
3. Node.js API (localhost:3001)
   └── Receives /api/auth/login
   └── Validates credentials
   └── Queries Turso database
   └── Returns JWT token
   
4. Frontend receives response
   └── Stores token
   └── Redirects to dashboard
```

### Call Ends → AI QA Generated

```
1. User ends call in browser
   
2. Frontend calls: POST /api/calls/complete
   
3. Node.js API:
   ├── Save transcripts to Turso
   ├── Save coaching history
   ├── Call Python AI Service (port 8001) for summary
   └── Trigger AI QA analysis (async)
   
4. Python AI Service (port 8001):
   ├── Run LangGraph workflow
   ├── Generate summary
   └── Generate QA scores
   
5. Results saved to database
   
6. User sees call in QA queue at /qa-scoring
```

---

## 🌐 Port Reference

| Port | Service | Access From | Description |
|------|---------|-------------|-------------|
| **3000** | Vite Frontend | Browser | React app UI |
| **3001** | Node.js API | Browser (proxied) | Backend API routes |
| **8000** | Python Voice Agent | LiveKit | Voice call handling |
| **8001** | Python AI Services | Node.js API | AI summary & QA |

### Health Check URLs

```bash
# Frontend
curl http://localhost:3000
# → Returns React app HTML

# Node.js Backend
curl http://localhost:3001/api/health
# → {"status":"ok","database":"connected"}

# Python Voice Agent
curl http://localhost:8000/health
# → {"status":"healthy"}

# Python AI Services
curl http://localhost:8001/health
# → {"status":"healthy"}
```

---

## ⚠️ Common Confusion

### "Why not just `npm run dev` and everything works?"

**The Python services need separate terminals because:**

1. **Different Languages** - Python can't run inside Node.js
2. **Different Purposes** - 
   - Voice agent runs continuously (listens for LiveKit rooms)
   - AI services start on-demand (called by Node.js when needed)
3. **Different Dependencies** - Python uses `uv`, Node uses `npm`

### "Can I run backend separately?"

**Yes!** For production or debugging:

```bash
# Option A: Via Vite (development)
npm run dev  # Starts both frontend + backend

# Option B: Backend only
npx tsx server/index.ts  # Backend only on port 3001

# Then in another terminal, frontend only
npm run dev  # Frontend only (but will try to start backend again)
```

---

## 🎓 Summary

- **`npm run dev`** = Frontend (3000) + Backend (3001) ✅ Both auto-start
- **Voice AI** = Separate Python terminal (8000) - handles calls
- **AI Services** = Separate Python terminal (8001) - generates summaries & QA

**You need 3 terminals total, not 4!** The Node.js backend is included in `npm run dev`.

# Axtra Console Documentation

Welcome to the Axtra Console documentation. This is an AI-powered call center coaching and real-time assist platform.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture, data flow |
| [Design System](./design_system.md) | Design philosophy, visual language |
| [Style Guide](./style-guide.md) | Colors, components, spacing |
| [Contributing](./contributing.md) | Coding standards, guidelines |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your Turso credentials

# Start dev server (runs both frontend + backend)
npm run dev

# Run tests
npm test -- --run

# Build for production
npm run build
```

**Access the app at**: http://localhost:3000

---

## 📋 Project Overview

**Axtra Console** is a modern React 19 application for call center operators:

### Key Features

| Feature | Description |
|---------|-------------|
| **Authentication** | JWT-based login/registration with Turso |
| **Dashboard** | Real-time KPIs, skill velocity, QA highlights |
| **Training** | 8 AI-powered simulation scenarios |
| **Call Interface** | 3-panel view with AI coaching |
| **Progress Tracking** | Database-backed user progress |

---

## 🏗️ Tech Stack

```
Frontend          Backend           Database
─────────         ───────           ────────
React 19          Node.js HTTP      Turso (libsql)
TypeScript 5.8    API Server        Serverless SQLite
Vite 6            bcryptjs          
Tailwind v4       @libsql/client
React Router v7
Zustand v5
Vitest
```

---

## 📁 Folder Structure

```
axtra-console-prototype/
├── src/                      # Frontend
│   ├── components/           # UI components (Sidebar, Header, Dashboard)
│   ├── pages/                # Route pages (Login, Simulations, etc.)
│   ├── stores/               # Zustand stores
│   │   ├── useUserStore.ts       # Auth state
│   │   ├── useSimulationStore.ts # Simulation state
│   │   └── useDashboardDataStore.ts
│   ├── lib/                  # API client
│   └── App.tsx               # Main app with routing
│
├── server/                   # Backend API
│   ├── index.ts              # API server & routes
│   ├── db.ts                 # Turso/libsql config
│   ├── auth.ts               # Auth service
│   ├── dashboard.ts          # Dashboard service
│   └── simulations.ts        # Simulation service
│
├── docs/                     # Documentation
├── .env.local                # Environment variables
└── README.md                 # Project overview
```

---

## 🔐 Authentication

Complete auth system with:

- **Registration** - Name, email, password
- **Login** - JWT tokens with 7-day expiry
- **Protected Routes** - Auto-redirect if not logged in
- **Database Storage** - User data in Turso

### Demo Account
```
Email: admin@axtra.local
Password: admin123
```

---

## 🗄️ Database Setup

### 1. Get Turso Token

```bash
# Install CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create token
turso db tokens create axdb
```

### 2. Configure Environment

Create `.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
TURSO_DATABASE_URL=libsql://axdb-kjctsc.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your_token_here
API_PORT=3001
```

### 3. Tables

The app auto-creates these tables on startup:
- `users` - User accounts
- `sessions` - Auth sessions
- `accounts` - User account data
- `scenarios` - Training scenarios (8 seeded)
- `user_scenarios` - Progress tracking
- `user_metrics` - Dashboard KPIs
- `skill_velocity` - Skill levels
- `qa_highlights` - QA feedback

---

## 🎮 Training Simulations

Practice with AI-powered scenarios:

### Scenarios
1. **Billing Dispute** - Handle angry customer
2. **Technical Support** - Troubleshoot connectivity
3. **Upsell Opportunity** - Present promotions
4. **Privacy Verification** - Compliance training
5. **Service Cancellation** - Retention call
6. **Product Return** - Process refund
7. **VIP Handling** - Premium upgrade
8. **Fraud Alert** - Security case

### Call Interface (3 Panels)

```
┌──────────────┬──────────────────────┬──────────────┐
│  Customer    │   Call Center        │ AI Copilot   │
│  Data        │   (Transcription)    │ (Guidance)   │
│              │                      │              │
│ • Profile    │ Customer: "I'm..."   │ • Emotion    │
│ • Contract   │                      │   Monitor    │
│ • History    │ Operator: "I..."     │              │
│              │                      │ • Suggestions│
│              │ [Mute][Pause][End]   │ • Scripts    │
└──────────────┴──────────────────────┴──────────────┘
```

---

## 🧪 Testing

```bash
# Run tests once
npm test -- --run

# Run tests in watch mode
npm test

# Run with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

**67 tests** across components, stores, and utilities.

---

## 🌐 API Reference

### Auth Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Dashboard Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Full dashboard |
| GET | `/api/dashboard/metrics` | KPIs |
| GET | `/api/dashboard/scenarios` | Scenarios |
| GET | `/api/dashboard/skill-velocity` | Progress |
| GET | `/api/dashboard/qa-highlights` | QA data |

### Simulation Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenarios` | All scenarios |
| GET | `/api/scenarios/:id` | Single scenario |
| POST | `/api/scenarios/:id/start` | Start training |
| POST | `/api/scenarios/:id/complete` | Finish with score |
| GET | `/api/simulations/stats` | User stats |
| GET | `/api/simulations/recommended` | Recommended |

---

## 📚 More Documentation

- **Architecture** → [architecture.md](./architecture.md)
- **Design System** → [design_system.md](./design_system.md)
- **Style Guide** → [style-guide.md](./style-guide.md)
- **Contributing** → [contributing.md](./contributing.md)
- **Agent Guide** → [../AGENTS.md](../AGENTS.md)

---

## 💡 Tips

- **Hot reload** - Vite provides instant updates
- **Database changes** - Restart server after schema updates
- **Debug API** - Check browser Network tab
- **Tests** - Mock stores for component testing

---

## 📄 License

Proprietary and confidential.

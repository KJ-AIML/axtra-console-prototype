# Axtra Console

AI-powered call center coaching and real-time assist platform.

![Axtra Console](https://img.shields.io/badge/React-19-61DAFB?logo=react)
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
# Edit .env.local with your Turso credentials

# Start dev server
npm run dev

# Run tests
npm test -- --run
```

---

## ✨ Features

### 🎯 Core Platform
- **Authentication** - JWT-based auth with Turso database
- **Dashboard** - Real-time KPIs, skill velocity, QA highlights
- **Training Simulations** - AI-powered practice scenarios
- **Active Call Interface** - 3-panel call coaching view

### 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS v4, PostCSS |
| **Routing** | React Router DOM v7 |
| **State** | Zustand v5 |
| **Backend** | Node.js HTTP Server |
| **Database** | Turso (libsql) - Serverless SQLite |
| **Testing** | Vitest, React Testing Library |

---

## 📁 Project Structure

```
axtra-console-prototype/
├── src/                      # Frontend source
│   ├── components/           # UI components
│   ├── pages/                # Route pages
│   ├── stores/               # Zustand state
│   ├── lib/                  # API client
│   └── App.tsx               # Main app
├── server/                   # Backend API
│   ├── index.ts              # API server
│   ├── db.ts                 # Database config
│   ├── auth.ts               # Authentication
│   ├── dashboard.ts          # Dashboard data
│   └── simulations.ts        # Simulation service
├── docs/                     # Documentation
└── .env.local                # Environment variables
```

---

## 🔐 Authentication

The app includes a complete authentication system:

- **Registration** - Create account with name/email/password
- **Login** - JWT-based authentication
- **Sessions** - 7-day session expiration
- **Protected Routes** - Auto-redirect to login if not authenticated

### Demo Account
- **Email**: `admin@axtra.local`
- **Password**: `admin123`

---

## 🗄️ Database

Uses **Turso** (libsql) - Serverless SQLite database.

### Setup

1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Login and create token:
   ```bash
   turso auth login
   turso db tokens create axdb
   ```

3. Add to `.env.local`:
   ```
   TURSO_AUTH_TOKEN=your_token_here
   ```

### Tables
- `users` - User accounts
- `sessions` - Auth sessions
- `accounts` - User account data
- `scenarios` - Training scenarios
- `user_scenarios` - User progress
- `user_metrics` - Dashboard KPIs
- `skill_velocity` - User skill progress
- `qa_highlights` - QA feedback

---

## 🎮 Training Simulations

Interactive training platform with AI coaching:

### Features
- 8 training scenarios (Billing, Technical, Sales, Compliance, etc.)
- Real-time emotion analysis
- AI suggestions and scripts
- Progress tracking
- Call transcription simulation

### 3-Panel Call Interface
1. **Left** - Customer Data (profile, contract, history)
2. **Center** - Call Transcription (live chat view)
3. **Right** - Axtra Copilot (AI guidance, emotion monitor)

---

## 🧪 Testing

```bash
# Run all tests
npm test -- --run

# Run with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

**67 tests** covering components, stores, and utilities.

---

## 📝 Documentation

| Document | Description |
|----------|-------------|
| [docs/index.md](docs/index.md) | Quick start guide |
| [docs/architecture.md](docs/architecture.md) | System architecture |
| [docs/design_system.md](docs/design_system.md) | Design principles |
| [docs/style-guide.md](docs/style-guide.md) | Coding standards |
| [AGENTS.md](AGENTS.md) | AI agent guide |

---

## 🛠️ Development

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

### Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:3001/api
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token
API_PORT=3001
```

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard` - Full dashboard data
- `GET /api/dashboard/metrics` - KPI metrics
- `GET /api/dashboard/scenarios` - Recommended scenarios

### Simulations
- `GET /api/scenarios` - All scenarios
- `GET /api/scenarios/:id` - Single scenario
- `POST /api/scenarios/:id/start` - Start simulation
- `POST /api/scenarios/:id/complete` - Complete simulation
- `GET /api/simulations/stats` - User stats

---

## 📄 License

Proprietary and confidential.

---

Built with ❤️ using React, Vite, and Turso.

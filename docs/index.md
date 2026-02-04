# Axtra Console Documentation

Welcome to the Axtra Console documentation. This is an AI-powered call center coaching and real-time assist platform.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | How the app works, tech stack, data flow |
| [Style Guide](./style-guide.md) | Colors, components, spacing, typography |
| [Design System](./design_system.md) | Design philosophy, visual language |
| [Contributing](./contributing.md) | How to contribute, coding standards |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test -- --run

# Build for production
npm run build
```

---

## Project Overview

**Axtra Console** is a modern React 19 application built with Vite 6, designed for call center operators to:

- View real-time performance metrics (KPIs)
- Practice scenarios with AI coaching
- Monitor active calls
- Review QA scores and compliance
- Access knowledge base and insights

### Tech Stack

- **React 19** + **Vite 6** - Modern frontend tooling
- **TypeScript 5.8** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **React Router v7** - Client-side routing
- **Zustand v5** - State management
- **Vitest** - Testing framework

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | KPI metrics, skill velocity, recommended training |
| **Navigation** | Collapsible sidebar with route-based highlighting |
| **Error Handling** | Graceful error boundaries with recovery options |
| **API Client** | Centralized HTTP client with auth and interceptors |
| **State Management** | Zustand stores for navigation, user, dashboard state |
| **Testing** | 67 tests covering components, stores, and utilities |

---

## Folder Structure

```
src/
├── components/      # Reusable UI components
├── pages/          # Route page components
├── stores/         # Zustand state management
├── lib/            # API client, utilities
├── utils/          # Helper functions
└── types/          # TypeScript types
```

---

## Getting Help

- **Architecture questions?** → [architecture.md](./architecture.md)
- **Styling questions?** → [style-guide.md](./style-guide.md)
- **Design questions?** → [design_system.md](./design_system.md)
- **Contributing?** → [contributing.md](./contributing.md)
- **Claude Code guide?** → See [CLAUDE.md](../CLAUDE.md)

---

## License

This project is proprietary and confidential.

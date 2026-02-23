# Architecture

Understanding the system design and components.

---

## 📖 Documents

| Document | Description |
|----------|-------------|
| [Overview](./overview.md) | System architecture overview |
| [Dev Server Architecture](./dev-server-architecture.md) | How dev servers work & port reference |
| [Frontend](./frontend.md) | React + Vite + Tailwind architecture |
| [Backend](./backend.md) | Node.js HTTP API |
| [Database](./database.md) | Turso (libsql) schema |

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Axtra Console                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   Frontend  │   │   Backend   │   │   Python    │           │
│  │   (React)   │◄──►│   (Node)    │   │   Agent     │           │
│  │  Port 3000  │   │  Port 3001  │   │  Voice AI   │           │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼──────┐                             │
│                    │   Turso     │                             │
│                    │  (libsql)   │                             │
│                    └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 Next Steps

- [Voice AI](../03-features/voice-ai/) - Learn about AXTRA Copilot
- [Development](../04-development/) - Coding standards

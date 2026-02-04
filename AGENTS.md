# Axtra Console - Agent Guide

Essential information for AI coding agents working on the Axtra Console project.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite + API server |
| `npm test -- --run` | Run all tests |
| `npm run build` | Production build |

**Key Files:**
- `src/App.tsx` - Main app with routing
- `server/index.ts` - API server
- `server/db.ts` - Database config
- `.env.local` - Environment variables

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS v4 |
| **Routing** | React Router DOM v7 |
| **State** | Zustand v5 |
| **Backend** | Node.js HTTP server |
| **Database** | Turso (libsql) |
| **Testing** | Vitest |

---

## Project Structure

```
axtra-console-prototype/
├── src/                      # Frontend
│   ├── components/           # UI components
│   ├── pages/                # Route pages
│   ├── stores/               # Zustand stores
│   │   ├── useUserStore.ts       # Auth state
│   │   ├── useSimulationStore.ts
│   │   └── useDashboardDataStore.ts
│   ├── lib/                  # API client
│   └── App.tsx               # Main app
├── server/                   # Backend
│   ├── index.ts              # API server
│   ├── db.ts                 # Database
│   ├── auth.ts               # Auth service
│   ├── dashboard.ts          # Dashboard data
│   └── simulations.ts        # Simulation service
└── docs/                     # Documentation
```

---

## Database (Turso/libsql)

**Database URL:** `libsql://axdb-kjctsc.aws-ap-south-1.turso.io`

### Tables
- `users` - User accounts
- `sessions` - Auth sessions
- `accounts` - User account data
- `scenarios` - Training scenarios
- `user_scenarios` - User progress tracking
- `user_metrics` - Dashboard KPIs
- `skill_velocity` - User skill progress
- `qa_highlights` - QA feedback

### Key Patterns
```typescript
// Query with parameters
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE email = ?',
  args: [email],
});

// Insert
await db.execute({
  sql: 'INSERT INTO scenarios (id, title) VALUES (?, ?)',
  args: [id, title],
});
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Dashboard
- `GET /api/dashboard` - Full dashboard
- `GET /api/dashboard/metrics` - KPIs
- `GET /api/dashboard/scenarios` - Scenarios
- `GET /api/dashboard/skill-velocity` - Progress
- `GET /api/dashboard/qa-highlights` - QA data

### Simulations
- `GET /api/scenarios` - All scenarios
- `GET /api/scenarios/:id` - Single scenario
- `POST /api/scenarios/:id/start` - Start
- `POST /api/scenarios/:id/complete` - Complete
- `GET /api/simulations/stats` - User stats
- `GET /api/simulations/recommended` - Recommended

---

## State Management (Zustand)

### Pattern
```typescript
import { create } from 'zustand';

interface StoreState {
  data: DataType[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  data: [],
  isLoading: false,
  fetchData: async () => {
    set({ isLoading: true });
    const response = await apiClient.get('/endpoint');
    set({ data: response.data, isLoading: false });
  },
}));
```

### Usage in Components
```typescript
const { data, isLoading, fetchData } = useStore();
```

---

## Coding Conventions

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Sidebar.tsx` |
| Functions | camelCase | `fetchData()` |
| Stores | camelCase with `use` prefix | `useUserStore` |
| Types | PascalCase | `UserProps` |
| Booleans | `is` prefix | `isLoading` |

### Import Order
1. React and core libraries
2. Third-party (lucide-react grouped)
3. Zustand stores
4. Local/relative imports

### Example
```typescript
import { useEffect } from 'react';
import { User, Settings } from 'lucide-react';
import { useUserStore } from '../stores';
import { cn } from '../utils/classnames';
```

---

## Component Pattern

```typescript
interface Props {
  className?: string;
}

export const Component: React.FC<Props> = ({ className }) => {
  const data = useStore((state) => state.data);
  
  return (
    <div className={cn('base-classes', className)}>
      {/* JSX */}
    </div>
  );
};
```

---

## Testing

### Mock Pattern
```typescript
vi.mock('../stores', () => ({
  useStore: ((selector?: any) => {
    const state = { data: [], fetchData: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Test Location
Place tests next to source files:
```
src/
├── Component.tsx
└── Component.test.tsx
```

---

## Environment Variables

Create `.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
TURSO_DATABASE_URL=libsql://axdb-kjctsc.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your_token_here
API_PORT=3001
```

**Never commit `.env.local` to git!**

---

## Common Tasks

### Add New API Route
1. Add route handler in `server/index.ts`
2. Add service function in appropriate service file
3. Add store method in `src/stores/`
4. Use in component

### Add New Component
1. Create file in `src/components/`
2. Add interface with `className?: string`
3. Use `cn()` for conditional classes
4. Add test file

### Database Migration
1. Update schema in `server/db.ts`
2. Add `ALTER TABLE` in seed function for existing DBs
3. Restart server

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Route not found" | Check segment matching in `server/index.ts` |
| "Database error" | Verify `TURSO_AUTH_TOKEN` in `.env.local` |
| "Module not found" | Run `npm install` |
| Tests failing | Check mock setup in test files |

---

## Links

- [Documentation](./docs/index.md)
- [Architecture](./docs/architecture.md)
- [Design System](./docs/design_system.md)
- [README](./README.md)

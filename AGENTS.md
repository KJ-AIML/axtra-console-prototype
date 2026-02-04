# Axtra Console - Agent Guide

This document provides essential information for AI coding agents working on the Axtra Console project.

---

## Project Overview

**Axtra Console** is an AI-powered call center coaching and real-time assist platform. It provides call center operators with a modern dashboard to view performance metrics, practice scenarios with AI coaching, monitor active calls, review QA scores, and access knowledge base resources.

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| React DOM | 19.2.4 | DOM rendering |
| React Router DOM | 7.13.0 | Client-side routing |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool and dev server |
| Tailwind CSS | 4.1.18 | Utility-first styling |
| Zustand | 5.0.11 | State management |
| Vitest | 4.0.18 | Testing framework |
| Lucide React | 0.563.0 | Icon library |

---

## Build and Test Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server on port 3000
```

### Build
```bash
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Testing
```bash
npm test             # Run all tests in watch mode
npm test -- --run    # Run tests once (CI mode)
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

---

## Project Structure

```
axtra-console-prototype/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Sidebar.tsx       # Navigation sidebar with workspace switcher
│   │   ├── Header.tsx        # Top bar with breadcrumbs and user menu
│   │   ├── Dashboard.tsx     # Main dashboard with KPI metrics
│   │   ├── ErrorBoundary.tsx # Error catching wrapper
│   │   └── ErrorFallback.tsx # Error UI display
│   ├── pages/           # Page components for routes
│   │   ├── Scenarios.tsx
│   │   ├── Personas.tsx
│   │   ├── Simulations.tsx
│   │   ├── Copilot.tsx
│   │   ├── ActiveCalls.tsx
│   │   ├── Recordings.tsx
│   │   ├── QAScoring.tsx
│   │   ├── Insights.tsx
│   │   ├── KnowledgeBase.tsx
│   │   ├── Offers.tsx
│   │   ├── Settings.tsx
│   │   ├── DeveloperAPI.tsx
│   │   ├── Dashboard.tsx
│   │   └── index.ts         # Barrel export
│   ├── stores/          # Zustand state management
│   │   ├── useNavigationStore.ts  # Active nav, route sync, ROUTE_PATHS
│   │   ├── useSidebarStore.ts     # Sidebar collapse state
│   │   ├── useUserStore.ts        # User session data
│   │   ├── useDashboardStore.ts   # Dashboard tabs, simulation state
│   │   └── index.ts               # Barrel export
│   ├── lib/             # Utility libraries
│   │   ├── api-client.ts    # Centralized HTTP client
│   │   ├── api-types.ts     # TypeScript types for API
│   │   └── index.ts         # Barrel export
│   ├── utils/           # Helper functions
│   │   └── classnames.ts    # cn() utility for merging classes
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── test/            # Test configuration
│   │   └── setup.ts         # Global test setup, mocks
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles with Tailwind v4
├── docs/                # Documentation files
│   ├── architecture.md
│   ├── contributing.md
│   ├── design_system.md
│   ├── index.md
│   └── style-guide.md
├── index.html           # HTML template (Vite 6 convention: at root)
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── vite.config.ts       # Vite build configuration
├── vitest.config.ts     # Vitest configuration
├── tsconfig.json        # TypeScript compiler configuration
└── package.json         # Dependencies and scripts
```

---

## Entry Points

| File | Purpose |
|------|---------|
| `index.html` | HTML template (root level, Vite 6 convention) |
| `src/main.tsx` | Application entry point, imports CSS and mounts React root |
| `src/index.css` | Global styles with Tailwind v4 `@import "tailwindcss"` |
| `src/App.tsx` | Main application component with BrowserRouter and ErrorBoundary |

---

## Code Style Guidelines

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Sidebar.tsx`, `Dashboard.tsx` |
| Functions | camelCase | `fetchScenarios()`, `handleClick()` |
| Variables | camelCase | `activeTab`, `isLoading` |
| Booleans | `is` prefix | `isCollapsed`, `isAlpha` |
| Constants | UPPER_SNAKE_CASE | `ROUTE_PATHS`, `API_CONFIG` |
| TypeScript types/interfaces | PascalCase | `UserProps`, `ApiResponse` |
| Component props interfaces | PascalCase with `Props` suffix | `SidebarProps`, `DashboardProps` |

### Import Order
1. React and core library imports
2. Third-party imports (lucide-react grouped together)
3. Zustand stores
4. Local/relative imports

### Component Pattern
```typescript
// Use Zustand stores instead of props drilling
import { useNavigationStore } from './stores';

interface Props {
  className?: string;
}

export const Sidebar: React.FC<Props> = ({ className }) => {
  const activeNav = useNavigationStore((state) => state.activeNav);
  const setActiveNav = useNavigationStore((state) => state.setActiveNav);

  return ( <JSX /> );
};
```

### Path Aliases
- `@/*` maps to `./src/*` (configured in both `vite.config.ts` and `tsconfig.json`)

---

## Testing Instructions

### Test File Location
Place tests next to the file they test:
```
src/
├── components/
│   ├── Sidebar.tsx
│   └── Sidebar.test.tsx
├── lib/
│   ├── api-client.ts
│   └── api-client.test.ts
```

### Mocking Stores in Tests
```typescript
vi.mock('../stores', () => ({
  useNavigationStore: ((selector?: any) => {
    const state = { activeNav: 'home', setActiveNav: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Test Goals
- **67 tests** currently passing across 8 test files
- Aim for 80%+ coverage on critical paths
- Test user behaviors, not implementation
- Keep tests fast with mocks for API calls

### Test Setup Configuration
Located in `src/test/setup.ts`:
- Configures `@testing-library/jest-dom`
- Mocks `IntersectionObserver`
- Mocks `ResizeObserver`
- Mocks `window.matchMedia`
- Automatic cleanup after each test

---

## State Management (Zustand)

### Store Structure
| Store | Purpose | Key State |
|-------|---------|-----------|
| `useNavigationStore` | Active navigation, route sync | `activeNav`, `setActiveNav`, `syncWithPath` |
| `useSidebarStore` | Sidebar collapse state | `isCollapsed`, `toggle()`, `collapse()`, `expand()` |
| `useUserStore` | User session data | User profile, authentication |
| `useDashboardStore` | Dashboard tabs, simulation state | `activeTab`, `setActiveTab` |

### Route Paths
Defined in `useNavigationStore.ts`:
```typescript
export const ROUTE_PATHS: Record<string, string> = {
  'home': '/',
  'scenarios': '/scenarios',
  'personas': '/personas',
  'simulations': '/simulations',
  'copilot': '/copilot',
  'active-calls': '/active-calls',
  'recordings': '/recordings',
  'qa-scoring': '/qa-scoring',
  'trends': '/insights',
  'kb': '/knowledge-base',
  'offers': '/offers',
  'settings': '/settings',
  'devs': '/developer-api',
};
```

### Best Practices
- **Select only what you need** - Use selectors for reactivity
- **Keep stores simple** - One store per domain
- **No props drilling** - Components access stores directly

---

## API Client

Located in `src/lib/api-client.ts`:

### Features
- Methods: `get()`, `post()`, `put()`, `patch()`, `delete()`
- Auth token management (`setAuthToken`, `getAuthToken`)
- Request/response interceptors
- Timeout handling (30s default)
- Custom `ApiError` class with status codes

### Configuration
- Base URL: `import.meta.env.VITE_API_BASE_URL || '/api'`
- Default timeout: 30000ms
- Headers: `Content-Type: application/json`

### Type Definitions
Located in `src/lib/api-types.ts`:
- `PaginatedResponse<T>`
- `ApiResponse<T>`
- `User`, `LoginRequest`, `LoginResponse`
- `Scenario`, `CreateScenarioRequest`
- `Simulation`, `CreateSimulationRequest`
- `DashboardMetrics`, `SkillVelocity`, `QaHighlight`
- `ActiveCall`, `Insight`, and more

---

## Error Handling

### Error Boundary
- `ErrorBoundary` class component wraps the entire app
- `ErrorFallback` component displays user-friendly error UI
- Actions: Try Again, Refresh Page, Go Home
- Error details shown in development mode
- Console logging in DEV mode

---

## Design System

### Core Principles
- **Clarity over Decoration** - Every border/shadow serves structural purpose
- **Micro-Feedback** - 200ms ease-in-out transitions for interactive elements
- **Information Density** - Data-rich KPI grids with 4px/8px grid system

### Colors
| Role | Color | HEX |
|------|-------|-----|
| Brand/Action | Indigo 600 | `#4F46E5` |
| Background | Slate 50 | `#F8FAFC` |
| Surface | White | `#FFFFFF` |
| Border | Gray 200 | `#E5E7EB` |
| Success | Emerald 500 | `#10B981` |
| Warning | Amber 500 | `#F59E0B` |
| Error | Rose 500 | `#F43F5E` |

### Typography
- **Font:** Inter (Google Fonts)
- **Labels:** `text-[11px] font-semibold text-gray-400 uppercase tracking-tight`
- **Body:** Medium (500) for UI, Regular (400) for descriptions

### Iconography
- Use `lucide-react` for all icons
- 18px in sidebar, 14px/16px in cards

---

## Configuration Files

### Vite Config (`vite.config.ts`)
- Server: port 3000, host 0.0.0.0
- React plugin integration
- Path alias: `@/*` → `./src`
- Environment variables: `GEMINI_API_KEY`

### Vitest Config (`vitest.config.ts`)
- Globals enabled
- Environment: jsdom
- Setup file: `./src/test/setup.ts`
- CSS: enabled for Tailwind
- Coverage: v8 provider

### TypeScript Config (`tsconfig.json`)
- Target: ES2022
- JSX: react-jsx transform
- Path aliases: `@/*` → `./src/*`
- Module: ESNext

### Tailwind Config (`tailwind.config.js`)
- Content paths: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- Extended theme with Inter font family

### PostCSS Config (`postcss.config.js`)
- Plugins: `@tailwindcss/postcss`, `autoprefixer`

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_BASE_URL` | API base URL | `/api` |
| `GEMINI_API_KEY` | Google Gemini API key | (optional) |

---

## Routing

- React Router DOM v7 with `BrowserRouter`
- Routes defined in `src/App.tsx`
- Navigation automatically synced with Zustand store via `useLocation` hook
- Catch-all route redirects to Dashboard

### Route Table
| Path | Component |
|------|-----------|
| `/` | Dashboard |
| `/scenarios` | Scenarios |
| `/personas` | Personas |
| `/simulations` | Simulations |
| `/copilot` | Copilot |
| `/active-calls` | ActiveCalls |
| `/recordings` | Recordings |
| `/qa-scoring` | QAScoring |
| `/insights` | Insights |
| `/knowledge-base` | KnowledgeBase |
| `/offers` | Offers |
| `/settings` | Settings |
| `/developer-api` | DeveloperAPI |
| `*` | Dashboard (fallback) |

---

## Dependencies

### Production
- `react@19.2.4` + `react-dom@19.2.4`
- `react-router-dom@7.13.0`
- `zustand@5.0.11`
- `lucide-react@0.563.0`
- `clsx@2.1.1` + `tailwind-merge@3.4.0`

### Development
- `vite@6.2.0`
- `@vitejs/plugin-react@5.1.3`
- `typescript@5.8.2`
- `tailwindcss@4.x`
- `@tailwindcss/postcss`
- `postcss` + `autoprefixer`
- `vitest@4.0.18`
- `@testing-library/react@16.3.2`
- `@testing-library/jest-dom@6.9.1`
- `@testing-library/user-event@14.6.1`
- `jsdom@28.0.0`

---

## Documentation References

| Document | Description |
|----------|-------------|
| `docs/architecture.md` | Detailed architecture, data flow, component communication |
| `docs/contributing.md` | Contribution guidelines, commit conventions |
| `docs/design_system.md` | Design philosophy, visual language |
| `docs/index.md` | Quick start guide, feature overview |
| `docs/style-guide.md` | Colors, components, spacing, typography |
| `CLAUDE.md` | Claude Code specific guidance |

---

## Security Considerations

- API client includes auth token management via `setAuthToken`/`getAuthToken`
- Auth tokens are stored in memory (not localStorage in current implementation)
- API client has timeout handling to prevent hanging requests
- Error boundaries prevent UI crashes from exposing sensitive information
- Environment variables for sensitive configuration (API keys)

---

## Performance Notes

- Uses React.memo for component memoization where appropriate
- Zustand selectors prevent unnecessary re-renders
- Tailwind v4 provides smaller bundles via PostCSS integration
- Vite build includes tree shaking and code splitting
- Static data moved outside components to prevent re-creation

---

## Notes for AI Agents

1. **Always use Zustand stores** for state management - don't add new Context providers
2. **Follow the import order** - React → Third-party → Stores → Local
3. **Use the `cn()` utility** from `utils/classnames` for conditional classes
4. **Place tests next to source files** - `Component.tsx` + `Component.test.tsx`
5. **Mock stores in tests** using the pattern shown in Testing Instructions
6. **Use Tailwind utility classes** - Avoid custom CSS unless necessary
7. **Follow the design system** - Colors, typography, spacing from `docs/design_system.md`
8. **Add displayName** to memoized subcomponents for debugging
9. **Use path aliases** - `@/components` instead of `../components`

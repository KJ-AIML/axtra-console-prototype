# Axtra Console - Architecture Overview

## How It Works

### Tech Stack
```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React 19 Components (UI Layer)                     │   │
│  │  - Sidebar, Header, Dashboard, Pages               │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  React Router DOM v7 (Routing)                     │   │
│  │  - Client-side routing, URL sync                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  Zustand v5 (State Management)                      │   │
│  │  - Navigation, Sidebar, User, Dashboard state      │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  API Client (HTTP Layer)                            │   │
│  │  - Auth, interceptors, error handling               │   │
│  └──────────────────┬──────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Backend API   │
              │ (Future)      │
              └───────────────┘
```

### Application Flow

1. **Initialization** (`main.tsx`)
   - Import global styles (`index.css` with Tailwind)
   - Mount React app to `<div id="root">`

2. **App Setup** (`App.tsx`)
   - `<ErrorBoundary>` wraps entire app for error handling
   - `<BrowserRouter>` enables client-side routing
   - `useLocation` + `useEffect` syncs URL with Zustand navigation state

3. **Layout Rendering**
   ```
   AppContent
   ├── Sidebar (uses navigationStore, sidebarStore)
   ├── Header (uses userStore)
   └── Main Content Area
       └── <Routes>
           └── Each Route renders a Page Component
   ```

4. **State Updates**
   - User interacts → Component calls Zustand store action
   - Zustand updates state → All subscribed components re-render
   - No props drilling needed!

### Key Architectural Decisions

| Decision | Why |
|----------|-----|
| **Zustand over Redux/Context** | Simpler API, no providers, built-in TypeScript support |
| **React Router v7** | Latest features, excellent TypeScript support |
| **Tailwind v4** | Modern CSS pipeline, smaller bundles, PostCSS integration |
| **Vitest over Jest** | Faster, native ESM support, better Vite integration |
| **Error Boundary** | Graceful error handling, better UX than white screens |

---

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── Header.tsx       # Top bar with breadcrumbs, user menu
│   ├── Dashboard.tsx    # Main dashboard with KPIs
│   ├── ErrorBoundary.tsx # Error catching wrapper
│   └── ErrorFallback.tsx # Error UI display
│
├── pages/              # Route page components
│   ├── Scenarios.tsx   # /scenarios
│   ├── Personas.tsx    # /personas
│   ├── Simulations.tsx # /simulations
│   ├── Copilot.tsx     # /copilot
│   ├── ActiveCalls.tsx # /active-calls
│   ├── Recordings.tsx  # /recordings
│   ├── QAScoring.tsx   # /qa-scoring
│   ├── Insights.tsx    # /insights
│   ├── KnowledgeBase.tsx # /knowledge-base
│   ├── Offers.tsx      # /offers
│   ├── Settings.tsx    # /settings
│   ├── DeveloperAPI.tsx # /developer-api
│   └── index.ts        # Barrel export
│
├── stores/             # Zustand state management
│   ├── useNavigationStore.ts # Active nav, route sync
│   ├── useSidebarStore.ts    # Collapse state
│   ├── useUserStore.ts       # User session
│   ├── useDashboardStore.ts  # Tabs, simulation state
│   └── index.ts              # Barrel export
│
├── lib/                # Utility libraries
│   ├── api-client.ts   # Centralized HTTP client
│   ├── api-types.ts    # TypeScript types for API
│   └── index.ts        # Barrel export
│
├── utils/              # Helper functions
│   └── classnames.ts   # cn() utility for merging classes
│
├── test/               # Test configuration
│   └── setup.ts        # Global test setup (mocks, cleanup)
│
├── types/              # Shared TypeScript types
│   └── index.ts
│
├── App.tsx             # Main app with routing
├── main.tsx            # Entry point
└── index.css           # Global styles + Tailwind
```

---

## Data Flow Examples

### Example 1: User Clicks Navigation Item
```
User clicks "Scenarios" in Sidebar
        ↓
Sidebar: navigate('/scenarios')
        ↓
React Router: URL changes to /scenarios
        ↓
App.tsx: useEffect detects location change
        ↓
useNavigationStore.syncWithPath('/scenarios')
        ↓
Zustand updates activeNav to 'scenarios'
        ↓
Sidebar re-renders with "Scenarios" highlighted
        ↓
<Scenarios /> page component renders
```

### Example 2: API Request
```
Component: apiClient.get('/scenarios')
        ↓
api-client: Add auth token (if set)
        ↓
api-client: Make fetch request with timeout
        ↓
api-client: Parse response, handle errors
        ↓
Return typed data to component
```

### Example 3: Error Boundary
```
Component throws error
        ↓
ErrorBoundary.componentDidCatch catches it
        ↓
Log error (console in DEV, service in PROD)
        ↓
Render <ErrorFallback />
        ↓
User sees "Something went wrong" with recovery options
```

---

## Component Communication

### Before (Props Drilling - Removed)
```typescript
// ❌ Old way - props through 3 levels
<App>
  <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
  <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
</App>
```

### After (Zustand - Current)
```typescript
// ✅ New way - direct store access
export const Sidebar = () => {
  const activeNav = useNavigationStore(s => s.activeNav);
  const setActiveNav = useNavigationStore(s => s.setActiveNav);
  // No props needed!
};

export const Dashboard = () => {
  const activeTab = useDashboardStore(s => s.activeTab);
  const setActiveTab = useDashboardStore(s => s.setActiveTab);
  // Independent state management!
};
```

---

## Routing Table

| Path | Component | Store Used |
|------|-----------|------------|
| `/` | Dashboard | useDashboardStore |
| `/scenarios` | Scenarios | - |
| `/personas` | Personas | - |
| `/simulations` | Simulations | - |
| `/copilot` | Copilot | - |
| `/active-calls` | ActiveCalls | - |
| `/recordings` | Recordings | - |
| `/qa-scoring` | QAScoring | - |
| `/insights` | Insights | - |
| `/knowledge-base` | KnowledgeBase | - |
| `/offers` | Offers | - |
| `/settings` | Settings | - |
| `/developer-api` | DeveloperAPI | - |
| `*` | Dashboard (fallback) | - |

---

## Build Pipeline

```
Source Files (TSX/TS/CSS)
        ↓
    Vite Build
        ↓
┌───────────────────────┐
│  PostCSS Pipeline     │
│  - @tailwindcss/postcss
│  - autoprefixer       │
└───────────────────────┘
        ↓
┌───────────────────────┐
│  Tailwind CSS v4      │
│  - Scan for classes   │
│  - Generate utilities │
│  - Minify             │
└───────────────────────┘
        ↓
┌───────────────────────┐
│  TypeScript Compiler  │
│  - Type checking      │
│  - JSX transform      │
└───────────────────────┘
        ↓
┌───────────────────────┐
│  Rollup Bundler       │
│  - Tree shaking       │
│  - Code splitting     │
│  - Minification       │
└───────────────────────┘
        ↓
    dist/ folder
├── index.html
├── assets/
│   ├── index-xxxx.js (300KB → 91KB gzipped)
│   └── index-xxxx.css (25KB → 5.6KB gzipped)
```

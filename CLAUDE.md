# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

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

## Architecture

This is a React 19 + Vite 6 call center coaching console with a component-based UI architecture.

### Tech Stack
- **React 19** - UI framework
- **Vite 6** - Build tool and dev server
- **TypeScript 5.8** - Type safety
- **Tailwind CSS v4** - Styling (npm-based, PostCSS)
- **React Router DOM v7** - Client-side routing
- **Zustand v5** - State management
- **Vitest v4** - Testing framework
- **React Testing Library** - Component testing

### Entry Points
- `index.html` - HTML template (at root, Vite 6 convention)
- `src/main.tsx` - Application entry point, imports CSS and mounts React root
- `src/index.css` - Global styles with Tailwind v4 `@import "tailwindcss"`
- `src/App.tsx` - Main application component with BrowserRouter and ErrorBoundary

### Component Structure
```
src/App.tsx (layout orchestrator with ErrorBoundary wrapper)
├── src/components/Sidebar.tsx (navigation sidebar with workspace switcher)
├── src/components/Header.tsx (top bar with breadcrumbs and user menu)
├── src/components/Dashboard.tsx (main content with KPI metrics, scenarios, skill tracking)
├── src/components/ErrorBoundary.tsx (error boundary wrapper)
└── src/pages/ (page components for each route)
    ├── Scenarios.tsx
    ├── Personas.tsx
    ├── Simulations.tsx
    ├── Copilot.tsx
    ├── ActiveCalls.tsx
    ├── Recordings.tsx
    ├── QAScoring.tsx
    ├── Insights.tsx
    ├── KnowledgeBase.tsx
    ├── Offers.tsx
    ├── Settings.tsx
    └── DeveloperAPI.tsx
```

### State Management (Zustand)
- **No props drilling** - State managed centrally in Zustand stores
- Located in `src/stores/`:
  - `useNavigationStore.ts` - Active navigation, route sync
  - `useSidebarStore.ts` - Sidebar collapse state
  - `useUserStore.ts` - User session data
  - `useDashboardStore.ts` - Dashboard tabs, simulation state

### Routing
- React Router DOM v7 withBrowserRouter
- Routes defined in `src/App.tsx`
- Navigation automatically synced with Zustand store via `useLocation` hook
- Route paths defined in `src/stores/useNavigationStore.ts`

### API Client
- Centralized API client in `src/lib/api-client.ts`
- Methods: `get()`, `post()`, `put()`, `patch()`, `delete()`
- Features:
  - Auth token management (`setAuthToken`, `getAuthToken`)
  - Request/response interceptors
  - Timeout handling (30s default)
  - Custom `ApiError` class with status codes
- Type definitions in `src/lib/api-types.ts`

### Error Handling
- `ErrorBoundary` class component wraps the entire app
- `ErrorFallback` component displays user-friendly error UI
- Actions: Try Again, Refresh Page, Go Home
- Error details shown in development mode
- Console logging in DEV mode

## Design System

The application follows the **Axtra Console Design System** documented in `docs/design_system.md`.

### Core Principles
- **Clarity over Decoration** - Every border/shadow serves structural purpose
- **Micro-Feedback** - 200ms ease-in-out transitions for interactive elements
- **Information Density** - Data-rich KPI grids with 4px/8px grid system

### Colors
- **Brand/Action:** Indigo 600 (`#4F46E5`) - Primary buttons, active tabs
- **Background:** Slate 50 (`#F8FAFC`) - Main app background
- **Surface:** White (`#FFFFFF`) - Component cards
- **Semantic:** Emerald 500 (success), Amber 500 (warning), Rose 500 (error)

### Typography
- **Font:** Inter (Google Fonts)
- **Labels:** `text-[11px] font-semibold text-gray-400 uppercase tracking-tight`
- **Body:** Medium (500) for UI, Regular (400) for descriptions

### Iconography
- Use `lucide-react` for all icons
- 18px in sidebar, 14px/16px in cards

## File Organization

### Project Structure
```
axtra-console-prototype/
├── src/
│   ├── components/       # React UI components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ErrorFallback.tsx
│   ├── pages/           # Page components for routes
│   │   └── index.ts     # Barrel export
│   ├── stores/          # Zustand state management
│   │   ├── useNavigationStore.ts
│   │   ├── useSidebarStore.ts
│   │   ├── useUserStore.ts
│   │   ├── useDashboardStore.ts
│   │   └── index.ts
│   ├── lib/             # Utility libraries
│   │   ├── api-client.ts
│   │   ├── api-types.ts
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   └── classnames.ts
│   ├── test/            # Test configuration
│   │   └── setup.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── docs/                # Documentation files
├── .planning/           # GSD planning directory
├── index.html           # HTML template (Vite 6 convention: at root)
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── vite.config.ts       # Vite build configuration
├── vitest.config.ts     # Vitest configuration
├── tsconfig.json        # TypeScript compiler configuration
└── package.json         # Dependencies and scripts
```

### Path Aliases
- `@/*` maps to `./src/*` (configured in both `vite.config.ts` and `tsconfig.json`)

## Coding Conventions

### Naming
- **Components:** PascalCase (`Sidebar.tsx`, `Dashboard.tsx`)
- **Functions/Variables:** camelCase with `on` prefix for handlers (`onClick`, `onToggle`)
- **Booleans:** `is` prefix (`isCollapsed`, `isAlpha`)
- **Types:** PascalCase interfaces with `Props` suffix for component props (`SidebarProps`)

### Import Order
1. React and core library imports
2. Third-party imports (lucide-react grouped together)
3. Zustand stores
4. Local/relative imports

### Component Pattern
```typescript
// Use Zustand stores instead of props
import { useNavigationStore } from './stores';

export const Sidebar: React.FC<Props> = ({ className }) => {
  const activeNav = useNavigationStore((state) => state.activeNav);
  const setActiveNav = useNavigationStore((state) => state.setActiveNav);

  return ( <JSX /> );
};
```

### Testing Pattern
```typescript
// Mock stores in tests
vi.mock('../stores', () => ({
  useNavigationStore: ((selector?: any) => {
    const state = { activeNav: 'home', setActiveNav: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

## Configuration

### Vite Config (`vite.config.ts`)
- Server: port 3000, host 0.0.0.0
- React plugin integration
- Path alias: `@/*` → `./src`

### Vitest Config (`vitest.config.ts`)
- Globals enabled
- Environment: jsdom
- Setup file: `./src/test/setup.ts`
- CSS: enabled for Tailwind

### TypeScript Config
- Target: ES2022
- JSX: react-jsx transform
- Path aliases: `@/*` → `./src/*`

### Tailwind Config (`tailwind.config.js`)
- Content paths: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- Extended theme with Inter font family

## Environment Variables

- `VITE_API_BASE_URL` - API base URL (defaults to `/api`)
- `GEMINI_API_KEY` - Google Gemini API key (optional, configured but not actively used)

## External Dependencies

### Production Dependencies
- `react@19.2.4` + `react-dom@19.2.4` - UI framework
- `react-router-dom@7.13.0` - Client-side routing
- `zustand@5.0.11` - State management
- `lucide-react@0.563.0` - Icon library
- `clsx@2.1.1` + `tailwind-merge@3.4.0` - Class name utilities

### Dev Dependencies
- `vite@6.2.0` - Build tool
- `@vitejs/plugin-react@5.1.3` - React plugin for Vite
- `typescript@5.8.2` - TypeScript compiler
- `tailwindcss@4.x` - Styling framework
- `@tailwindcss/postcss` - Tailwind PostCSS plugin
- `postcss` + `autoprefixer` - CSS processing
- `vitest@4.0.18` - Testing framework
- `@testing-library/react@16.3.2` - React testing utilities
- `@testing-library/jest-dom@6.9.1` - Jest DOM matchers
- `@testing-library/user-event@14.6.1` - User interaction simulation
- `jsdom@28.0.0` - DOM implementation for tests

## Frontend Skills Reference

When working on this codebase, the following Claude Code skills may be helpful:

### UI/UX & Design
- **web-design-guidelines** - Review UI code for Web Interface Guidelines compliance, accessibility, and UX best practices
- **ram** - Run accessibility and visual design reviews

### React & Component Development
- **frontend-code-review** - Review frontend files (.tsx, .ts) with checklist rules
- **frontend-testing** - Generate Vitest + React Testing Library tests for components
- **component-refactoring** - Refactor high-complexity React components (when complexity > 50 or lines > 300)
- **vercel-react-best-practices** - React and Next.js performance optimization guidelines

### Testing & Quality
- **code-reviewer** - Review code changes (local or PR) for correctness and maintainability

### Documentation
- **docs-writer** - Write documentation for the /docs directory

### Development Tools
- **hotkey** - Guide for adding keyboard shortcuts to components
- **orpc-contract-first** - Implement contract-first API patterns with TanStack Query (when adding API layers)

### Browser Automation
- **browser-use** / **playwright-cli** - Automate browser interactions for testing forms, screenshots, data extraction

## Test Status

All tests passing: 67 tests across 8 test files

- `src/utils/classnames.test.ts` - 8 tests
- `src/lib/api-client.test.ts` - 16 tests
- `src/components/Header.test.tsx` - 5 tests
- `src/components/Sidebar.test.tsx` - 10 tests
- `src/components/Dashboard.test.tsx` - 13 tests
- `src/components/ErrorBoundary.test.tsx` - 7 tests
- `src/pages/index.test.tsx` - 4 tests
- `src/App.test.tsx` - 4 tests

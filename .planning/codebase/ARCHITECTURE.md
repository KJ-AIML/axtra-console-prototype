# Architecture

**Analysis Date:** 2026-02-03

## Pattern Overview

**Overall:** Component-Based UI Architecture with Props Drilling

**Key Characteristics:**
- React functional components with TypeScript interfaces
- Flat component hierarchy with centralized state in parent App component
- Props-based data flow without external state management
- Tailwind CSS for styling via CDN (no CSS modules or styled-components)
- No routing or complex state containers

## Layers

**Presentation Layer (Components):**
- Purpose: UI rendering and user interactions
- Location: `components/`
- Contains: React functional components (Sidebar, Header, Dashboard)
- Depends on: React, lucide-react, parent component state via props
- Used by: App.tsx (main layout orchestrator)

**Application Layer (App Root):**
- Purpose: Layout composition and state management
- Location: `App.tsx`
- Contains: State hooks (useState), component composition
- Depends on: components/, React
- Used by: index.tsx (entry point)

**Type Definitions:**
- Purpose: TypeScript interfaces and type contracts
- Location: `types.ts`
- Contains: Component props interfaces (NavItem, MetricCardProps, TabItem)
- Depends on: React (for React.ReactNode)
- Used by: Components for type safety

## Data Flow

**State Management Flow:**

1. User interacts with UI element (e.g., clicks sidebar navigation)
2. Child component calls callback prop (e.g., `setActiveNav('home')`)
3. State update in App.tsx triggers re-render
4. Updated props flow down to child components
5. Components re-render with new state

**Sidebar State:**
- `activeNav`: String tracking current navigation selection
- `isSidebarCollapsed`: Boolean controlling sidebar width

**Dashboard State:**
- `activeTab`: String tracking currently selected dashboard tab

**State Management:**
- React useState hooks in parent components
- Props drilling for state distribution
- No Redux, Zustand, or Context API usage

## Key Abstractions

**Navigation Component Pattern:**
- Purpose: Reusable sidebar navigation with collapsible state
- Examples: `components/Sidebar.tsx`, `components/Header.tsx`
- Pattern: Functional component with typed props interface

**Dashboard Layout Pattern:**
- Purpose: Main content area with tabs and metrics
- Examples: `components/Dashboard.tsx`
- Pattern: Container component with child sub-components (MetricCard, ScenarioItem)

**Type Contract Pattern:**
- Purpose: Type-safe component interfaces
- Examples: `types.ts` (NavItem, MetricCardProps, TabItem)
- Pattern: Shared TypeScript interfaces imported by multiple components

## Entry Points

**Application Entry Point:**
- Location: `index.tsx`
- Triggers: DOM load via script tag in `index.html`
- Responsibilities: Mount React app to DOM, create root element

**Component Root:**
- Location: `App.tsx`
- Triggers: Rendered by index.tsx
- Responsibilities: Layout composition, state management, component orchestration

**Vite Entry:**
- Location: `vite.config.ts`
- Triggers: Build process
- Responsibilities: Plugin configuration, path aliases, environment variable injection

## Error Handling

**Strategy:** Minimal error handling, relying on React's built-in error boundaries

**Patterns:**
- Simple error checking for root element existence in index.tsx
- No custom error boundaries or error handling middleware
- No try-catch blocks in components

## Cross-Cutting Concerns

**Styling:** Tailwind CSS classes directly in components (CDN-based, no build step)
**Validation:** TypeScript interfaces provide compile-time validation
**Authentication:** Not implemented (no auth providers or flows)
**API Integration:** Environment variable injection for GEMINI_API_KEY (in vite.config.ts) but no API calls in code

---

*Architecture analysis: 2026-02-03*

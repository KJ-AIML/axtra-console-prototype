# Coding Conventions

**Analysis Date:** 2025-02-03

## Naming Patterns

**Files:**
- **Components:** PascalCase (e.g., `Dashboard.tsx`, `Header.tsx`, `Sidebar.tsx`)
- **Entry points:** camelCase (e.g., `index.tsx`, `types.ts`)
- **Configuration:** lowercase with extensions (e.g., `vite.config.ts`, `tsconfig.json`)

**Functions:**
- camelCase for function names (e.g., `setActiveNav`, `onToggle`)
- Event handlers prefixed with `on` (e.g., `onClick`, `onToggle`)

**Variables:**
- camelCase (e.g., `activeTab`, `isCollapsed`, `sidebarWidth`)
- Boolean variables prefixed with `is` (e.g., `isCollapsed`, `isAlpha`)

**Types:**
- Interfaces: PascalCase (e.g., `NavItem`, `SidebarProps`)
- Props interfaces: Component name + Props suffix (e.g., `SidebarProps`, `MetricCardProps`)
- Generic types: Standard TypeScript generic syntax (e.g., `React.FC`, `React.ReactNode`)

## Code Style

**Formatting:**
- No formatting tool configured (no Prettier or Biome configuration found)
- Manual formatting with consistent indentation (2 spaces)
- No linting tool configured (no ESLint, Biome, or other linter setup)

**Linting:**
- Not applicable - no linting tools present in codebase

## Import Organization

**Order:**
1. React and core library imports
2. Third-party imports (grouped together, e.g., all `lucide-react` imports)
3. Local/relative imports (e.g., `./components/Sidebar`)

**Example from `App.tsx`:**
```typescript
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
```

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json` paths)
- Example usage: `import { NavItem } from '@/types'` (though currently not used in favor of relative paths)

## Error Handling

**Patterns:**
- Minimal error handling in current codebase
- Error thrown for missing DOM elements (see `index.tsx`):
```typescript
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
```
- No try-catch blocks in components
- No error boundaries implemented
- No error logging framework configured

## Logging

**Framework:** console (no logging library configured)

**Patterns:**
- No structured logging patterns detected
- Console not used for production logging in current codebase

## Comments

**When to Comment:**
- Minimal inline comments, mainly to explain UI sections or layout structure
- Example from `App.tsx`:
```typescript
{/* Sidebar with collapse state management */}
{/* Main Content Area */}
```
- Fix comments for past issues (e.g., `// Fix: Added React import...` in `types.ts`)

**JSDoc/TSDoc:**
- Not used in codebase
- No function documentation comments
- Interface comments minimal or absent

## Function Design

**Size:** No explicit guidelines - functions range from single-line arrow functions to ~170-line components

**Parameters:**
- Props interfaces for component parameters
- Destructured inline for subcomponents
- Optional props marked with `?` (e.g., `subtext?: string`)

**Return Values:**
- Functional components return JSX elements
- Event handlers typically return `void`
- No explicit return type annotations on functions (rely on inference)

**Example from `Dashboard.tsx`:**
```typescript
const MetricCard: React.FC<{ label: string; value: string; subtext?: string; isFirst?: boolean }> = ({ label, value, subtext, isFirst }) => (
  // JSX returned
);
```

## Module Design

**Exports:**
- Default exports for main components (e.g., `export default App;`)
- Named exports for types and subcomponents (e.g., `export const Dashboard: React.FC = () => {...}`)
- Interface exports from type files (e.g., `export interface NavItem`)

**Barrel Files:**
- Not used - components imported directly from their files
- Types centralized in `types.ts` with multiple exports

**Component Structure:**
- Subcomponents defined above main component (e.g., `MetricCard`, `ScenarioItem` above `Dashboard`)
- Helper components defined inline when simple
- Props interfaces defined inline for simple components, or in `types.ts` for shared types

---

*Convention analysis: 2025-02-03*

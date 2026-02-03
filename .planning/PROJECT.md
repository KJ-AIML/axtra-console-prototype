# Axtra Console Restructure

## What This Is

Reorganize existing React/Vite application from flat structure to production-ready `src/` layout. The codebase currently has components and source files scattered at the root level, which needs restructuring to meet production standards.

## Core Value

Zero breaking changes — the application must function identically after restructure.

## Requirements

### Validated

<!-- Existing capabilities from codebase that must be preserved -->

- ✓ React 19.2.4 UI components with TypeScript — existing
- ✓ Vite 6.2.0 build system with HMR — existing
- ✓ Tailwind CSS styling via CDN — existing
- ✓ App.tsx layout orchestration — existing
- ✓ Sidebar, Header, Dashboard components — existing
- ✓ TypeScript type definitions (types.ts) — existing

### Active

<!-- Current scope: reorganization goals -->

- [ ] Move source files into `src/` directory
- [ ] Create `src/components/` for UI components
- [ ] Create `src/types/` for type definitions
- [ ] Create `src/App.tsx` and `src/main.tsx` entry points
- [ ] Create `public/` for static assets
- [ ] Update Vite config paths and entry points
- [ ] Update TypeScript config path aliases
- [ ] Verify development server starts
- [ ] Verify production build works
- [ ] Clean up root directory (remove moved files)

### Out of Scope

<!-- Explicit boundaries -->

- Testing infrastructure — defer to v2
- State management refactor (add Redux/Zustand) — defer to v2
- Routing implementation — defer to v2
- New features or functionality changes — out of scope

## Context

**Code review feedback:** Current structure doesn't meet production standards. Code files are mixed at root level with config files, making it hard to scale and confusing for new developers.

**Current state:**
- components/, docs/ directories exist
- App.tsx, index.tsx, types.ts at root
- Configuration files at root (vite.config.ts, tsconfig.json, package.json)
- No clear separation of source vs config

**Target state:**
- `src/` directory containing all application code
- `src/components/` for React components
- `src/types/` for TypeScript definitions
- `src/App.tsx`, `src/main.tsx` for entry points
- `public/` for static assets (index.html moved here)
- Configuration files remain at root (standard Vite pattern)

## Constraints

- **Functionality**: Zero breaking changes — app must work identically after restructure
- **Tech stack**: Must maintain React 19.2.4, Vite 6.2.0, TypeScript
- **Tooling**: Keep existing npm scripts, build configuration
- **Deployment**: Maintain ability to deploy as static site

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| src/ convention | Industry standard for production apps | — Pending |
| Keep Vite entry point config | Update vite.config.ts entry point | — Pending |
| Preserve existing imports | Update path aliases in tsconfig.json | — Pending |

---
*Last updated: 2026-02-03 after initialization*

# Codebase Structure

**Analysis Date:** 2026-02-03

## Directory Layout

```
axtra-console-prototype/
├── components/          # React UI components
├── docs/               # Documentation files
├── .planning/          # GSD planning directory
├── .git/               # Git repository
├── App.tsx             # Main application component (layout orchestrator)
├── index.tsx           # Application entry point (DOM mounting)
├── index.html          # HTML template with CDN imports
├── types.ts            # Shared TypeScript type definitions
├── package.json        # Node.js dependencies and scripts
├── tsconfig.json       # TypeScript compiler configuration
├── vite.config.ts      # Vite build tool configuration
├── metadata.json       # Application metadata
├── README.md           # Project documentation (empty)
└── .env.local          # Local environment variables (gitignored)
```

## Directory Purposes

**components/:**
- Purpose: Contains all reusable React UI components
- Contains: Functional React components with TypeScript interfaces
- Key files: `Sidebar.tsx`, `Header.tsx`, `Dashboard.tsx`

**docs/:**
- Purpose: Project documentation and design specifications
- Contains: Design system documentation
- Key files: `design_system.md`

**.planning/:**
- Purpose: GSD (Get Stuff Done) planning and codebase analysis documents
- Contains: Architecture, structure, stack, and testing documentation
- Key files: This directory receives generated analysis documents

**.git/:**
- Purpose: Git version control repository
- Contains: Version history and configuration
- Generated: Yes, Committed: No (standard Git behavior)

## Key File Locations

**Entry Points:**
- `index.tsx`: Application entry point, creates and mounts React root
- `index.html`: HTML template with Tailwind CSS CDN and importmap for React modules
- `App.tsx`: Main application component, layout orchestrator with state management

**Configuration:**
- `vite.config.ts`: Vite build configuration, plugins, path aliases (@/*), environment variables
- `tsconfig.json`: TypeScript compiler configuration, path aliases, JSX settings
- `package.json`: Project dependencies (React 19.2.4, lucide-react 0.563.0, Vite 6.2.0)
- `metadata.json`: Application metadata (name, description, frame permissions)

**Core Logic:**
- `components/Sidebar.tsx`: Navigation sidebar with collapsible state and workspace switcher
- `components/Header.tsx`: Top navigation bar with breadcrumbs, notifications, and user menu
- `components/Dashboard.tsx`: Main dashboard with KPI metrics, training scenarios, and skill tracking

**Testing:**
- Not present (no test files detected)

## Naming Conventions

**Files:**
- PascalCase for React components: `Sidebar.tsx`, `Header.tsx`, `Dashboard.tsx`
- kebab-case for configuration: `package.json`, `vite.config.ts`, `tsconfig.json`
- lowercase for root files: `index.tsx`, `types.ts`, `metadata.json`

**Directories:**
- Lowercase: `components/`, `docs/`, `.planning/`
- Dot-prefixed for hidden/config directories: `.git/`, `.planning/`

## Where to Add New Code

**New Feature/Component:**
- Primary code: `components/[FeatureName].tsx` (e.g., `components/Simulations.tsx`)
- Related components: `components/[FeatureName]/` if component requires sub-components (not currently used)
- Types: Add to `types.ts` if reused across components, or inline in component file

**New Layout Sections:**
- Implementation: `components/[SectionName].tsx` (e.g., `components/Footer.tsx`)
- Integration: Import and render in `App.tsx`

**Shared Types:**
- Reusable interfaces: `types.ts` (e.g., add `export interface SimulationProps {...}`)

**Styling:**
- Tailwind classes directly in component files (no separate CSS files)
- Global styles: Inline in `index.html` (currently has custom scrollbar and gradient button styles)

**Configuration:**
- Build changes: `vite.config.ts`
- Type aliases: `tsconfig.json` paths section
- Dependencies: `package.json`

## Special Directories

**components/:**
- Purpose: UI component library
- Generated: No
- Committed: Yes

**docs/:**
- Purpose: Design system documentation
- Generated: No
- Committed: Yes

**.planning/:**
- Purpose: GSD framework planning and analysis
- Generated: Partially (this file and others are generated)
- Committed: Yes (typically committed for team reference)

**.git/:**
- Purpose: Version control
- Generated: Yes (by git init)
- Committed: No (Git doesn't track its own internals)

---

*Structure analysis: 2026-02-03*

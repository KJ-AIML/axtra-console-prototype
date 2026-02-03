# Technology Stack

**Analysis Date:** 2026-02-03

## Languages

**Primary:**
- TypeScript 5.8.2 - All application code (`.ts`, `.tsx` files)
- React JSX - Component templates

**Secondary:**
- Not applicable

## Runtime

**Environment:**
- Node.js - JavaScript runtime for development and build
- Browser - Runtime environment for deployed application

**Package Manager:**
- npm - Inferred from `package.json` scripts structure
- Lockfile: Not present (packages installed fresh each time)

## Frameworks

**Core:**
- React 19.2.4 - UI component framework
- Vite 6.2.0 - Build tool and development server

**Testing:**
- Not applicable (no testing framework detected)

**Build/Dev:**
- TypeScript ~5.8.2 - Type checking and transpilation
- Vite 6.2.0 - Fast build tool with HMR
- @vitejs/plugin-react ^5.0.0 - Vite plugin for React support

## Key Dependencies

**Critical:**
- react ^19.2.4 - Core UI framework for component-based architecture
- react-dom ^19.2.4 - React DOM renderer for web applications
- lucide-react ^0.563.0 - Icon library providing consistent iconography throughout the UI

**Infrastructure:**
- esm.sh - CDN-based ESM module delivery (configured in `index.html` import map)
- Tailwind CSS - Utility-first CSS framework via CDN

## Configuration

**Environment:**
- Vite's `loadEnv` API - Loads environment variables from `.env.local`
- Key config: `vite.config.ts` defines build settings and environment variable injection

**Build:**
- `vite.config.ts` - Vite configuration including:
  - Server: port 3000, host 0.0.0.0
  - React plugin integration
  - Path alias: `@/*` maps to root directory
  - Environment variable definitions for `GEMINI_API_KEY`
- `tsconfig.json` - TypeScript compiler options:
  - Target: ES2022
  - Module: ESNext
  - JSX: react-jsx transform
  - Path aliases: `@/*` to `./`

## Platform Requirements

**Development:**
- Node.js - For running Vite dev server and build process
- Modern browser with ES module support - For development preview
- Camera and microphone permissions (requested in `metadata.json`)

**Production:**
- Static web hosting - Vite builds to static files
- Any CDN or static hosting service (Vercel, Netlify, etc.)
- Browser supporting ES2022 features

---

*Stack analysis: 2026-02-03*

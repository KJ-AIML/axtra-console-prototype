# Codebase Concerns

**Analysis Date:** 2026-02-03

## Tech Debt

**No Package Lock File:**
- Issue: No `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` exists, despite `package.json` being present
- Files: `package.json` (no lockfile in root directory)
- Impact: Dependencies cannot be installed consistently across different environments or by different developers. Production builds may install different dependency versions than development.
- Fix approach: Run `npm install` to generate `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml` depending on preferred package manager) and commit it to version control.

**Missing index.css:**
- Issue: `index.html` references `/index.css` at line 43, but the file does not exist in the codebase
- Files: `index.html:43`, missing `index.css`
- Impact: 404 error on page load, potentially affecting styling that should be in the CSS file. Development tools will show console warnings/errors.
- Fix approach: Create `index.css` file with global styles, or remove the `<link>` tag from `index.html` if styles are handled differently.

**Undefined CSS Class:**
- Issue: `no-scrollbar` class is used in Dashboard.tsx but never defined in any stylesheet
- Files: `components/Dashboard.tsx:86`, `index.html` (styles section)
- Impact: The `no-scrollbar` class will have no effect, meaning the horizontal tabs will display browser default scrollbars on overflow.
- Fix approach: Add `.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }` and `.no-scrollbar::-webkit-scrollbar { display: none; }` to `index.html` style block or create `index.css`.

**Unused Type Definitions:**
- Issue: `types.ts` defines interfaces (`NavItem`, `MetricCardProps`, `TabItem`) that are not used consistently across the codebase. Components use inline prop types instead.
- Files: `types.ts`, `components/Sidebar.tsx:29-34`, `components/Dashboard.tsx:18-24`
- Impact: Redundant type definitions increase maintenance burden. Inline types scattered across components are harder to reuse and maintain centrally.
- Fix approach: Either use the types from `types.ts` consistently or remove unused type definitions. Move reusable types to their component files.

**Redundant React Imports:**
- Issue: Some components explicitly import React when using JSX with React 19's new JSX transform
- Files: `components/Sidebar.tsx:2`, `components/Header.tsx:2`, `types.ts:2`
- Impact: Unnecessary imports add to bundle size and are a legacy pattern no longer required with React 17+ JSX transform.
- Fix approach: Remove `import React` statements from files using JSX transform, keeping only when using React types or React object directly.

## Known Bugs

**Non-functional Navigation:**
- Issue: Navigation items in Sidebar have onClick handlers that only update local state (`activeNav`) but do not render different content or route to new pages
- Files: `components/Sidebar.tsx:126-152`, `App.tsx:8`
- Symptoms: Clicking navigation items updates the active state visually, but the content area always shows the same Dashboard component
- Trigger: Click any navigation item in sidebar other than "Dashboard"
- Workaround: None - navigation is non-functional

**Missing index.css Reference:**
- Issue: Page loads with 404 error for `/index.css`
- Files: `index.html:43`
- Symptoms: Browser console shows 404 error for `index.css`
- Trigger: Page load in any browser
- Workaround: The page still renders because styles are primarily handled via Tailwind CDN

**Broken no-scrollbar Class:**
- Issue: Horizontal tab overflow in Dashboard shows default scrollbar despite `no-scrollbar` class
- Files: `components/Dashboard.tsx:86`
- Symptoms: Browser default horizontal scrollbar appears on tabs when content overflows
- Trigger: View dashboard on smaller screen widths or with many tabs
- Workaround: None - UX issue only, doesn't break functionality

## Security Considerations

**API Key Configuration Risk:**
- Risk: `vite.config.ts` references `GEMINI_API_KEY` environment variable but the `.env.local` file is empty. If a developer accidentally commits a populated `.env.local`, API keys will be exposed.
- Files: `vite.config.ts:14-15`, `.env.local`, `.gitignore` (should contain `.env.local`)
- Current mitigation: `.gitignore` includes `.env.local`, protecting committed secrets
- Recommendations:
  - Add `.env.local` to `.gitignore` explicitly if not already present (verify `.gitignore` contents)
  - Add `.env` and `.env.*.local` patterns to `.gitignore`
  - Consider using a secrets management solution for production deployments
  - Document required environment variables in README or `.env.example`

**No Input Validation:**
- Risk: No validation or sanitization on any user inputs (search, form fields, etc.)
- Files: All components (App.tsx, Dashboard.tsx, Header.tsx, Sidebar.tsx)
- Current mitigation: None - no user input handling detected
- Recommendations: Add input validation and sanitization when implementing form inputs, search fields, or user data entry

**External Resource Dependencies:**
- Risk: Application depends on external CDNs (Google Fonts, Tailwind CDN) that could fail or be blocked
- Files: `index.html:8-11`, `index.html:34-40`
- Current mitigation: No fallback mechanism
- Recommendations: Consider bundling critical resources or implementing fallback strategies for production deployments

## Performance Bottlenecks

**External CDNs for Core Dependencies:**
- Problem: React and related libraries are loaded from esm.sh CDN via importmap instead of bundled locally
- Files: `index.html:34-40`
- Cause: Development-time convenience decision to use CDN instead of local bundling
- Impact on performance:
  - Slower initial page load (multiple network requests to CDN)
  - Dependency on external service availability
  - No tree-shaking or optimization of unused code
  - CORS and network policy issues in some corporate environments
- Improvement path: Configure Vite to bundle dependencies locally. Remove importmap and install dependencies via npm (package.json already lists them).

**No Code Splitting:**
- Problem: All components are loaded immediately on app mount, no lazy loading of routes or components
- Files: `index.tsx:11-16`, `App.tsx`
- Cause: Single-page app structure without routing or code splitting implementation
- Impact: Larger initial bundle size, slower time-to-interactive on slow networks
- Improvement path: Implement React.lazy() for components, add routing library, or implement code splitting with Vite's dynamic imports

**Unoptimized Font Loading:**
- Problem: Google Fonts loaded via external CDN without preloading or font-display optimization
- Files: `index.html:9-11`
- Cause: Standard font embed code without performance optimizations
- Impact: Flash of Unstyled Text (FOUT), potential layout shift when fonts load
- Improvement path: Add `rel="preload"` for font files, use `font-display: swap` or `font-display: optional`, or self-host fonts

## Fragile Areas

**Dashboard Component Complexity:**
- Files: `components/Dashboard.tsx` (173 lines)
- Why fragile: Large single component with multiple responsibilities (KPI grid, scenarios list, skill velocity, QA highlights, tabs). Changes to one section risk breaking others. Hardcoded data makes refactoring risky.
- Safe modification:
  - Extract child components (MetricCard, ScenarioItem, SkillVelocityCard, QAHighlights)
  - Create separate component files for each major section
  - Add tests before refactoring
- Test coverage: No tests exist for Dashboard component. Any changes are unverified.

**Navigation State Management:**
- Files: `App.tsx:8`, `components/Sidebar.tsx:88-153`
- Why fragile: Navigation state (`activeNav`) is managed in App.tsx and passed as props, but only the visual state changes. Actual content/routing is not implemented. Adding real routing will require major refactoring of the navigation pattern.
- Safe modification:
  - Add a routing library (react-router-dom or similar)
  - Create route components for each navigation item
  - Keep navigation state in a context or routing solution, not App.tsx
- Test coverage: No tests for navigation logic.

**Environment Configuration:**
- Files: `vite.config.ts:5-16`, `.env.local`
- Why fragile: Vite config defines environment variable placeholders (`process.env.API_KEY`, `process.env.GEMINI_API_KEY`) that are never used in application code. Empty `.env.local` suggests configuration is incomplete. Changes to environment handling could break app if not tested across all environments.
- Safe modification:
  - Remove unused environment variable definitions from vite.config.ts
  - Create `.env.example` documenting required variables
  - Add proper environment variable loading pattern (using `import.meta.env.VAR_NAME`)
- Test coverage: No tests for environment-specific behavior.

## Scaling Limits

**Local Development Only:**
- Current capacity: Single developer, no CI/CD, no deployment configuration
- Limit: Cannot deploy to production environments. No automated testing. No deployment pipeline.
- Scaling path:
  - Add CI/CD configuration (GitHub Actions, GitLab CI, etc.)
  - Configure build and deployment scripts
  - Set up staging and production environments
  - Add automated testing pipeline

**No Backend Integration:**
- Current capacity: Frontend-only prototype with hardcoded data
- Limit: Cannot handle real user data, authentication, or dynamic content. No API integration.
- Scaling path:
  - Design and implement API contracts
  - Add API client (fetch, axios, or custom wrapper)
  - Implement authentication/authorization
  - Add loading and error states for async operations

**No State Management:**
- Current capacity: Local component state only
- Limit: Difficult to share state across components, no global state management, no persistence.
- Scaling path:
  - Implement state management solution (Zustand, Redux, Jotai, React Context)
  - Add local storage or session persistence where appropriate
  - Design state architecture for larger app needs

## Dependencies at Risk

**External CDN Dependencies:**
- Risk: esm.sh CDN for React dependencies could change, be deprecated, or have downtime
- Impact: Application will fail to load if CDN is unavailable
- Files: `index.html:34-40`
- Migration plan:
  - Install dependencies via npm/yarn (already in package.json but not used)
  - Remove importmap from index.html
  - Configure Vite to bundle dependencies locally
  - Test production build with local dependencies

**React 19 (Latest Version):**
- Risk: React 19.2.4 is very recent and may have breaking changes or ecosystem incompatibilities
- Impact: Some third-party libraries may not support React 19 yet
- Files: `package.json:12-13`, `index.html:36-38`
- Migration plan:
  - Pin to specific patch version in package.json
  - Test all functionality with current React 19 features
  - Monitor React ecosystem for React 19 support updates
  - Consider downgrading to React 18 if critical dependencies are incompatible

**Missing Lock File:**
- Risk: Without package-lock.json, dependency resolution is not deterministic
- Impact: Different developers may install different versions of transitive dependencies
- Files: Root directory (no lockfile present)
- Migration plan: Run `npm install` to generate `package-lock.json` and commit to version control

## Missing Critical Features

**No Routing Implementation:**
- Problem: Navigation items exist but no actual routing or page switching
- Blocks: Multi-page application, navigation, deep linking
- Impact: Users cannot navigate to different sections. Only Dashboard is viewable.
- Recommended action: Add routing library (react-router-dom, wouter, or similar)

**No Backend Connectivity:**
- Problem: All data is hardcoded in components
- Blocks: Dynamic content, user authentication, real-time updates, data persistence
- Impact: Application is a prototype only, not a functional product
- Recommended action: Design API contracts, implement API client, add loading/error states

**No Authentication/Authorization:**
- Problem: No login/logout functionality, user identification, or access control
- Blocks: Multi-user support, personalized dashboards, secure operations
- Impact: Application is not ready for production use with real users
- Recommended action: Implement authentication flow (OAuth, JWT, or custom), add protected routes

**No Error Handling:**
- Problem: No error boundaries, no try-catch blocks, no error UI states
- Blocks: Graceful failure handling, user feedback on errors
- Impact: Application crashes will show blank screen or error stack to users
- Recommended action: Add React Error Boundary, wrap async operations in try-catch, implement error UI states

**No Loading States:**
- Problem: No skeleton loaders, spinners, or loading indicators
- Blocks: Data fetching UX, perceived performance
- Impact: Users see blank screens or incomplete content while data loads
- Recommended action: Add loading components, implement suspense for data fetching

## Test Coverage Gaps

**No Tests for Any Components:**
- What's not tested: All functionality across App.tsx, Dashboard.tsx, Sidebar.tsx, Header.tsx
- Files: `App.tsx`, `components/Dashboard.tsx`, `components/Sidebar.tsx`, `components/Header.tsx`
- Risk: Refactoring can break functionality silently. No regression detection. Manual testing only.
- Priority: High - Implement test framework (Vitest + React Testing Library) and add basic tests

**No Test Framework:**
- What's not tested: No testing infrastructure exists at all
- Files: Root directory (no vitest.config, jest.config, or test files)
- Risk: No way to verify code correctness. Cannot implement automated testing.
- Priority: High - Install and configure testing framework before adding features

**No Type Testing:**
- What's not tested: TypeScript type definitions and type safety
- Files: `types.ts`, all .tsx files
- Risk: Type errors may not be caught before runtime if TypeScript compilation is bypassed
- Priority: Medium - Ensure TypeScript strict mode, add type checking to build process

**No Integration Tests:**
- What's not tested: Component interactions, state management, user flows
- Files: All components and interactions
- Risk: Complex interactions (sidebar collapse, tab switching) may break without detection
- Priority: Medium - Add integration tests for key user flows after unit tests are established

**No E2E Tests:**
- What's not tested: Full application workflows, cross-browser compatibility, end-to-end scenarios
- Files: Application as a whole
- Risk: Critical user journeys (login to dashboard, navigation flows) not verified
- Priority: Low - Implement after unit and integration tests cover core functionality

---

*Concerns audit: 2026-02-03*

# Contributing to Axtra Console

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Conventions](#commit-conventions)

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Git** for version control
- **Code editor** (VS Code recommended)

### Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/axtra-console-prototype.git
   cd axtra-console-prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

4. **Run tests**
   ```bash
   npm test           # Watch mode
   npm test -- --run  # Single run
   ```

---

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes
- Edit files in `src/`
- Follow coding standards (below)
- **Write tests** for new functionality

### 3. Test Your Changes
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Build to verify no errors
npm run build
```

### 4. Commit Your Changes
Follow our commit conventions (see below).

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with:
- Clear title describing the change
- Description of what you changed and why
- Reference any related issues

---

## Coding Standards

### File Organization
```
src/
├── components/     # Reusable UI components
├── pages/         # Route page components
├── stores/        # Zustand state stores
├── lib/           # Utilities (API client, etc.)
├── utils/         # Helper functions
└── types/         # TypeScript types
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Sidebar.tsx`, `Dashboard.tsx` |
| Functions | camelCase | `fetchScenarios()`, `handleClick()` |
| Variables | camelCase | `activeTab`, `isLoading` |
| Booleans | `is` prefix | `isCollapsed`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| TypeScript types/interfaces | PascalCase | `UserProps`, `ApiResponse` |

### Component Structure
```typescript
// 1. Imports (React → Third-party → Local)
import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigationStore } from './stores';

// 2. Types/Interfaces
interface Props {
  className?: string;
}

// 3. Subcomponents (if any)
const MetricCard: React.FC<MetricProps> = ({ ... }) => { ... };

// 4. Main component
export const Dashboard: React.FC<Props> = ({ className }) => {
  // 5. Hooks (state, effects, stores)
  const activeTab = useDashboardStore(s => s.activeTab);
  const [data, setData] = useState([]);

  // 6. Event handlers
  const handleClick = () => { ... };

  // 7. Effects
  useEffect(() => { ... }, []);

  // 8. Derived values
  const filteredData = data.filter(...);

  // 9. Render
  return (
    <div className={cn('...', className)}>
      ...
    </div>
  );
};
```

### State Management
- **Use Zustand stores** - Don't create new context providers
- **Select only what you need** - Use selectors for reactivity
- **Keep stores simple** - One store per domain (navigation, user, dashboard, etc.)

```typescript
// ✅ Good - Select specific state
const activeNav = useNavigationStore(s => s.activeNav);

// ❌ Bad - Grabs entire store (causes unnecessary re-renders)
const state = useNavigationStore();
```

### Styling
- **Use Tailwind utility classes** - Don't write custom CSS unless necessary
- **Follow design tokens** - Use colors from `design_system.md`
- **Responsive by default** - Add mobile-first responsive classes
- **Accessibility** - Use semantic HTML, ARIA labels where needed

```typescript
// ✅ Good - Tailwind utilities
<div className="flex items-center gap-2 p-4 bg-white rounded-lg">

// ❌ Bad - Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

### TypeScript
- **Always type props** - Use interfaces for component props
- **Avoid `any`** - Use proper types or `unknown`
- **Use type inference** - Let TypeScript infer when obvious
- **Export types** when used by other modules

```typescript
// ✅ Good
interface Props {
  title: string;
  count: number;
  onAction: () => void;
}

export const Card: React.FC<Props> = ({ title, count, onAction }) => { ... };
```

---

## Testing Guidelines

### Test File Location
Place tests next to the file they test:
```
src/
├── components/
│   ├── Sidebar.tsx
│   ├── Sidebar.test.tsx
│   └── Dashboard.test.tsx
├── lib/
│   ├── api-client.ts
│   └── api-client.test.ts
```

### What to Test
- **Components**: Render correctly with props, handle user interactions
- **Stores**: State updates work as expected
- **Utils**: Pure functions return correct output
- **API Client**: Request/response handling, error cases

### What NOT to Test
- Implementation details (internal functions)
- Third-party libraries (trust they work)
- PropTypes/TypeScript (that's what TS is for)

### Example Test
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock stores
vi.mock('../stores', () => ({
  useNavigationStore: ((selector?: any) => {
    const state = { activeNav: 'home', setActiveNav: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));

describe('Sidebar Component', () => {
  it('should render navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should call navigate when item clicked', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Scenarios'));
    // Assert navigation happened
  });
});
```

### Test Goals
- **Aim for 80%+ coverage** on critical paths
- **Test user behaviors**, not implementation
- **Keep tests fast** - Use mocks for API calls
- **Make tests readable** - They're also documentation

---

## Commit Conventions

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't change functionality |
| `style` | Styling changes (CSS, Tailwind classes) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Maintenance tasks (deps, config) |
| `perf` | Performance improvements |

### Examples
```bash
feat(dashboard): add KPI metrics display

Implement MetricCard component with:
- Average Handle Time
- First Call Resolution
- QA Score
- Compliance Rate

Closes #123

---

fix(sidebar): navigation not updating on route change

The syncWithPath function wasn't being called when
location changed. Added useEffect to fix this.

Fixes #145

---

test(api-client): add timeout error handling tests

Verify that ApiError is thrown with 408 status
when request times out.
```

---

## Pull Request Guidelines

### PR Title
Use the same format as commit messages:
```
feat(dashboard): add real-time metrics
fix(auth): handle token expiration
```

### PR Description
Include:
- **What** you changed
- **Why** you changed it
- **How** to test the changes
- Screenshots for UI changes
- Related issue numbers

### PR Checklist
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] Code follows style guide
- [ ] Commit messages follow conventions

---

## Questions?

- **Architecture questions?** See `docs/architecture.md`
- **Design questions?** See `docs/design_system.md`
- **Style questions?** Check `CLAUDE.md`

Happy contributing! 🚀

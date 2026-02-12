# Coding Standards

Coding conventions and best practices for Axtra Console.

---

## 📝 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase | `Sidebar.tsx`, `Dashboard.tsx` |
| **Functions** | camelCase | `fetchData()`, `handleClick()` |
| **Variables** | camelCase | `userData`, `isLoading` |
| **Constants** | UPPER_SNAKE_CASE | `API_URL`, `MAX_RETRY` |
| **Types/Interfaces** | PascalCase | `UserProps`, `LoginRequest` |
| **Files** | camelCase | `api-client.ts` |
| **Event Handlers** | `on` prefix | `onClick`, `onSubmit` |
| **Boolean** | `is` prefix | `isActive`, `isLoading` |

---

## 📦 Import Order

```typescript
// 1. React and core libraries
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party (group lucide-react)
import { User, Settings, Loader2 } from 'lucide-react';

// 3. Zustand stores
import { useUserStore, useDashboardStore } from '../stores';

// 4. Local utilities
import { cn } from '../utils/classnames';
import { apiClient } from '../lib/api-client';

// 5. Types
import type { User } from '../types';
```

---

## 🧩 Component Pattern

```typescript
interface Props {
  className?: string;
  children?: React.ReactNode;
}

export const Component: React.FC<Props> = ({ className, children }) => {
  // Use Zustand store (not props drilling)
  const data = useStore((state) => state.data);
  
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  );
};
```

---

## 🎨 Styling Guidelines

### Tailwind Classes

```typescript
// Use cn() for conditional classes
className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'opacity-50',
  className  // Allow override
)}

// Avoid arbitrary values when possible
// ❌ Bad
<div className="w-[123px]">

// ✅ Good  
<div className="w-32">
```

### Color Usage

| Purpose | Color |
|---------|-------|
| Primary | `indigo-600` |
| Success | `emerald-500` |
| Warning | `amber-500` |
| Error | `rose-500` |
| Background | `slate-50` |
| Surface | `white` |

---

## 🔒 TypeScript Guidelines

### Strict Types

```typescript
// Use explicit return types for functions
const calculateScore = (turns: number, satisfaction: number): number => {
  return Math.round((turns * satisfaction) / 10);
};

// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Avoid `any`
// ❌ Bad
const data: any = fetchData();

// ✅ Good
const data: ApiResponse = fetchData();
```

### Type Exports

```typescript
// Export types from barrel file
export type { User, UserRole } from './types';
export { useUserStore } from './stores';
```

---

## ✅ Code Quality Checklist

- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings
- [ ] Tests pass (`npm test -- --run`)
- [ ] Proper types for all functions
- [ ] Error handling for async operations
- [ ] Loading states for data fetching
- [ ] Accessibility attributes

---

## 🧪 Testing Standards

### Mock Pattern

```typescript
vi.mock('../stores', () => ({
  useStore: ((selector?: any) => {
    const state = { data: [], fetchData: vi.fn() };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Test Structure

```typescript
describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
  
  it('handles user interaction', () => {
    render(<Component />);
    fireEvent.click(screen.getByText('Button'));
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

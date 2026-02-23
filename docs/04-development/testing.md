# Testing Guide

Testing strategy and patterns for Axtra Console.

---

## 📋 Overview

| Aspect | Tool |
|--------|------|
| **Framework** | Vitest v4 |
| **Environment** | jsdom |
| **Helpers** | React Testing Library |
| **Matchers** | jest-dom |
| **Setup** | `src/test/setup.ts` |

---

## 🚀 Running Tests

```bash
# Run all tests once (CI mode)
npm test -- --run

# Run tests in watch mode (development)
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

---

## 📝 Test Patterns

### Component Test

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Store Test

```typescript
// useUserStore.test.ts
import { describe, it, expect } from 'vitest';
import { useUserStore } from './useUserStore';

describe('useUserStore', () => {
  it('initializes with no user', () => {
    expect(useUserStore.getState().user).toBeNull();
  });

  it('sets user', () => {
    const user = { id: '1', name: 'Test' };
    useUserStore.getState().setUser(user);
    expect(useUserStore.getState().user).toEqual(user);
  });
});
```

### API Test

```typescript
// api-client.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('apiClient', () => {
  it('includes auth token in headers', async () => {
    localStorage.setItem('token', 'test-token');
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });
});
```

---

## 🎯 Mocking Patterns

### Mock Zustand Store

```typescript
// Before all tests
vi.mock('../stores', () => ({
  useStore: ((selector?: any) => {
    const state = { 
      data: [], 
      fetchData: vi.fn(),
      isLoading: false,
    };
    return selector ? selector(state) : state;
  }) as any,
}));
```

### Mock API Calls

```typescript
vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));
```

### Mock Router

```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});
```

---

## 📊 Coverage Goals

| Category | Target |
|----------|--------|
| Components | 80% |
| Stores | 90% |
| Utilities | 90% |
| API Client | 70% |

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "act()" warnings | Wrap state changes in `act()` |
| Mock not working | Check path is correct |
| Store state persists | Call `store.setState()` in `beforeEach` |
| Test timeout | Increase with `vi.setTimeout(10000)` |

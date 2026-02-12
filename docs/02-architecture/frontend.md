# Frontend Architecture

Detailed overview of the React frontend architecture.

---

## 🏗️ Component Architecture

```
Browser
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                     React 19 App                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              BrowserRouter                      │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │           AppContent                     │  │   │
│  │  │                                          │  │   │
│  │  │  ┌──────────────┐    ┌──────────────┐  │  │   │
│  │  │  │  MainLayout  │ or │  AuthPages   │  │  │   │
│  │  │  │              │    │              │  │  │   │
│  │  │  │  ┌────────┐  │    │  - Login     │  │  │   │
│  │  │  │  │Sidebar │  │    │  - Register  │  │  │   │
│  │  │  │  └────────┘  │    └──────────────┘  │  │   │
│  │  │  │              │                      │  │   │
│  │  │  │  ┌────────┐  │                      │  │   │
│  │  │  │  │ Header │  │                      │  │   │
│  │  │  │  └────────┘  │                      │  │   │
│  │  │  │              │                      │  │   │
│  │  │  │  ┌────────┐  │                      │  │   │
│  │  │  │  │ Routes │  │                      │  │   │
│  │  │  │  │ - /    │  │                      │  │   │
│  │  │  │  │ - /sim │  │                      │  │   │
│  │  │  │  │ - /rec │  │                      │  │   │
│  │  │  │  └────────┘  │                      │  │   │
│  │  │  └──────────────┘                      │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 State Management (Zustand)

### Store Structure

```typescript
// Each store is independent and can be subscribed to individually
stores/
├── useUserStore.ts           # Authentication state
├── useLiveKitStore.ts        # Voice call state
├── useDashboardDataStore.ts  # Dashboard data
├── useSimulationStore.ts     # Simulation state
├── useNavigationStore.ts     # Navigation state
├── useToastStore.ts          # Notifications
└── index.ts                  # Barrel exports
```

### Example Store Pattern

```typescript
// stores/useUserStore.ts
import { create } from 'zustand';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    const response = await apiClient.post('/auth/login', { email, password });
    set({ user: response.data.user, isAuthenticated: true, isLoading: false });
  },
  
  logout: async () => {
    await apiClient.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  },
  
  fetchCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    set({ user: response.data.user, isAuthenticated: true });
  },
}));
```

### Using Stores in Components

```typescript
// Select specific state (re-renders only when this changes)
const user = useUserStore((state) => state.user);

// Or use actions
const { login } = useUserStore();

// Multiple selections
const { user, isLoading, login } = useUserStore();
```

---

## 🎨 Component Patterns

### 1. Presentational Components

Simple UI components with props:

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg font-medium transition-colors',
        variant === 'primary' && 'bg-indigo-600 text-white',
        size === 'md' && 'px-4 py-2',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
};
```

### 2. Container Components

Components that connect to stores:

```typescript
export const Dashboard: React.FC = () => {
  const { metrics, scenarios, isLoading, fetchDashboardData } = useDashboardDataStore();
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  if (isLoading) return <LoadingState />;
  
  return (
    <div>
      <MetricCards metrics={metrics} />
      <ScenarioList scenarios={scenarios} />
    </div>
  );
};
```

### 3. Compound Components

For complex UI with shared state:

```typescript
// Card compound component
export const Card = {
  Root: ({ children }) => <div className="bg-white rounded-lg border">{children}</div>,
  Header: ({ children }) => <div className="p-4 border-b">{children}</div>,
  Body: ({ children }) => <div className="p-4">{children}</div>,
  Footer: ({ children }) => <div className="p-4 border-t bg-gray-50">{children}</div>,
};

// Usage
<Card.Root>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card.Root>
```

---

## 🔄 Routing (React Router v7)

### Route Structure

```typescript
// App.tsx
<BrowserRouter>
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<Login />} />
    
    {/* Protected Routes - Full Screen */}
    <Route path="/simulations/:scenarioId" element={
      <ProtectedRoute>
        <ActiveSimulation />
      </ProtectedRoute>
    } />
    
    {/* Protected Routes - With Layout */}
    <Route path="/*" element={
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    } />
  </Routes>
</BrowserRouter>
```

### Route Configuration

```typescript
// stores/useNavigationStore.ts
export const ROUTES = {
  HOME: '/',
  SCENARIOS: '/scenarios',
  SIMULATIONS: '/simulations',
  ACTIVE_SIMULATION: (id: string) => `/simulations/${id}`,
  RECORDINGS: '/recordings',
  SETTINGS: '/settings',
} as const;
```

---

## 🎨 Styling (Tailwind CSS v4)

### Class Name Utilities

Using `cn()` utility for conditional classes:

```typescript
import { cn } from '../utils/classnames';

// Basic usage
className={cn('base-classes', className)}

// Conditional classes
className={cn(
  'px-4 py-2 rounded-lg',
  isActive && 'bg-indigo-600 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className  // Allow override
)}

// Variant patterns
const variants = {
  primary: 'bg-indigo-600 text-white',
  secondary: 'bg-gray-100 text-gray-900',
  danger: 'bg-rose-600 text-white',
};

className={cn(
  'px-4 py-2 rounded-lg font-medium',
  variants[variant],
  className
)}
```

### Responsive Design

```tsx
<div className="
  grid
  grid-cols-1        /* Mobile: 1 column */
  md:grid-cols-2     /* Tablet: 2 columns */
  lg:grid-cols-3     /* Desktop: 3 columns */
  gap-4
  p-4
  md:p-6
  lg:p-8
">
```

---

## 📡 API Integration

### API Client

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  }
  
  setAuthToken(token: string | null) {
    this.token = token;
  }
  
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }
  
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }
  
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
}

export const apiClient = new ApiClient();
```

---

## 🧪 Testing Strategy

### Component Testing

```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the store
vi.mock('../stores', () => ({
  useStore: (selector: any) => {
    const state = { data: [], fetchData: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

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

---

## 📚 Related Documentation

- [Design System](../04-development/design-system.md)
- [Coding Standards](../04-development/coding-standards.md)
- [Testing Guide](../04-development/testing.md)

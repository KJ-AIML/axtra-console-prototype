import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-router-dom first
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock the stores module with a simple factory
vi.mock('../stores', () => {
  // Create mock state
  const userState = {
    user: {
      id: 'user-1',
      name: 'Operator Kj',
      initials: 'KJ',
      email: 'kj@axtra.example.com',
    },
    isAuthenticated: true,
    setUser: vi.fn(),
    logout: vi.fn(),
  };

  return {
    useUserStore: ((selector?: any) => {
      return selector ? selector(userState) : userState;
    }) as any,
  };
});

// Import Header after mocking
import { Header } from './Header';

describe('Header Component', () => {
  it('should render breadcrumbs', () => {
    render(<Header />);
    expect(screen.getByText('Axtra Console')).toBeInTheDocument();
    expect(screen.getByText('Global Ops')).toBeInTheDocument();
  });

  it('should render escalation button', () => {
    render(<Header />);
    expect(screen.getByText('2 Escalations')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<Header />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Copilot Help')).toBeInTheDocument();
  });

  it('should render notification bell', () => {
    const { container } = render(<Header />);
    const bell = container.querySelector('svg');
    expect(bell).toBeInTheDocument();
  });

  it('should render user avatar with initials', () => {
    render(<Header />);
    expect(screen.getByText('KJ')).toBeInTheDocument();
  });
});

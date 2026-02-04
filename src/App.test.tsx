import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock the stores module
vi.mock('./stores', () => {
  // Create mock states
  const navigationState = {
    activeNav: 'home',
    setActiveNav: vi.fn(),
    syncWithPath: vi.fn(),
  };

  const sidebarState = {
    isCollapsed: false,
    toggle: vi.fn(),
    collapse: vi.fn(),
    expand: vi.fn(),
  };

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
    useNavigationStore: ((selector?: any) => {
      return selector ? selector(navigationState) : navigationState;
    }) as any,
    useSidebarStore: ((selector?: any) => {
      return selector ? selector(sidebarState) : sidebarState;
    }) as any,
    useUserStore: ((selector?: any) => {
      return selector ? selector(userState) : userState;
    }) as any,
  };
});

// Import components after mocking
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

describe('App Integration', () => {
  const renderWithStores = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  it('should render sidebar component', () => {
    renderWithStores(<Sidebar />);
    expect(screen.getByText('Axtra Console')).toBeInTheDocument();
  });

  it('should render header component', () => {
    renderWithStores(<Header />);
    expect(screen.getByText('Global Ops')).toBeInTheDocument();
  });

  it('should toggle sidebar collapse on button click', () => {
    renderWithStores(<Sidebar />);
    const toggleButton = screen.getByTitle('Collapse Sidebar');
    fireEvent.click(toggleButton);
    expect(toggleButton).toBeInTheDocument();
  });

  it('should render all status indicators in header', () => {
    renderWithStores(<Header />);
    expect(screen.getByText('2 Escalations')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Copilot Help')).toBeInTheDocument();
  });
});

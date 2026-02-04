import { create } from 'zustand';

// Route path mapping for navigation
export const ROUTE_PATHS: Record<string, string> = {
  'home': '/',
  'scenarios': '/scenarios',
  'personas': '/personas',
  'simulations': '/simulations',
  'copilot': '/copilot',
  'active-calls': '/active-calls',
  'recordings': '/recordings',
  'qa-scoring': '/qa-scoring',
  'trends': '/insights',
  'kb': '/knowledge-base',
  'offers': '/offers',
  'settings': '/settings',
  'devs': '/developer-api',
} as const;

// Reverse mapping for active nav state from path
const getActiveNavFromPath = (pathname: string): string => {
  const entry = Object.entries(ROUTE_PATHS).find(([_, path]) => path === pathname);
  return entry?.[0] || 'home';
};

interface NavigationState {
  activeNav: string;
  setActiveNav: (navId: string) => void;
  syncWithPath: (pathname: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeNav: 'home',

  setActiveNav: (navId) => set({ activeNav: navId }),

  syncWithPath: (pathname) => set({ activeNav: getActiveNavFromPath(pathname) }),
}));

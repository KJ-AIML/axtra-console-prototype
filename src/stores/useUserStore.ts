import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  initials: string;
  email?: string;
  avatar?: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: {
    id: 'user-1',
    name: 'Operator Kj',
    initials: 'KJ',
    email: 'kj@axtra.example.com',
  },
  isAuthenticated: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: () => set({ user: null, isAuthenticated: false }),
}));

import { create } from 'zustand';
import { apiClient, setAuthToken } from '../lib/api-client';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Account {
  id: string;
  userId: string;
  accountName: string;
  accountType: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  user: User | null;
  accounts: Account[];
  activeAccount: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setAccounts: (accounts: Account[]) => void;
  setActiveAccount: (account: Account) => void;
  clearError: () => void;
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  
  // Init
  init: () => Promise<void>;
}

// Load token from storage
const loadToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('axtra_token');
};

// Save token to storage
const saveToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('axtra_token', token);
  } else {
    localStorage.removeItem('axtra_token');
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  accounts: [],
  activeAccount: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: true }),
  
  setAccounts: (accounts) => set({ accounts }),
  
  setActiveAccount: (account) => set({ activeAccount: account }),
  
  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          user: User;
          token: string;
          expiresIn: number;
        };
      }>('/auth/login', { email, password });
      
      const { user, token } = response.data;
      
      // Save token
      saveToken(token);
      setAuthToken(token);
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null,
      });
      
      // Fetch user's accounts
      await get().fetchAccounts();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ 
        isLoading: false, 
        error: message,
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          user: User;
          token: string;
          expiresIn: number;
        };
      }>('/auth/register', { name, email, password });
      
      const { user, token } = response.data;
      
      // Save token
      saveToken(token);
      setAuthToken(token);
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null,
      });
      
      // Fetch user's accounts
      await get().fetchAccounts();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ 
        isLoading: false, 
        error: message,
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      // Ignore logout errors
    }
    
    // Clear token
    saveToken(null);
    setAuthToken(null);
    
    set({ 
      user: null, 
      accounts: [],
      activeAccount: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchCurrentUser: async () => {
    const token = loadToken();
    
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    
    setAuthToken(token);
    set({ isLoading: true });
    
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { user: User };
      }>('/auth/me');
      
      const { user } = response.data;
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false,
      });
      
      // Fetch accounts
      await get().fetchAccounts();
      
    } catch (error) {
      // Token is invalid or expired
      saveToken(null);
      setAuthToken(null);
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
      });
    }
  },

  fetchAccounts: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { accounts: Account[] };
      }>('/accounts');
      
      const { accounts } = response.data;
      
      set({ 
        accounts,
        activeAccount: accounts[0] || null,
      });
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      set({ accounts: [], activeAccount: null });
    }
  },

  init: async () => {
    await get().fetchCurrentUser();
  },
}));

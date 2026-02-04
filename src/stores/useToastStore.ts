import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? 5000;
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for common toast types
export const showSuccess = (title: string, message?: string, duration?: number) => {
  useToastStore.getState().addToast({
    type: 'success',
    title,
    message,
    duration,
  });
};

export const showError = (title: string, message?: string, duration?: number) => {
  useToastStore.getState().addToast({
    type: 'error',
    title,
    message,
    duration: duration ?? 8000, // Errors stay longer
  });
};

export const showWarning = (title: string, message?: string, duration?: number) => {
  useToastStore.getState().addToast({
    type: 'warning',
    title,
    message,
    duration,
  });
};

export const showInfo = (title: string, message?: string, duration?: number) => {
  useToastStore.getState().addToast({
    type: 'info',
    title,
    message,
    duration,
  });
};

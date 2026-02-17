import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category: string;
  persona: string;
  isRecommended: boolean;
  rating: number;
  completions: number;
  sortOrder: number;
  status?: 'not_started' | 'in_progress' | 'completed';
  userScore?: number;
}

export interface SimulationStats {
  total: number;
  completed: number;
  inProgress: number;
  averageScore: number;
}

interface SimulationState {
  scenarios: Scenario[];
  recommendedScenarios: Scenario[];
  stats: SimulationStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchScenarios: () => Promise<void>;
  fetchRecommendedScenarios: () => Promise<void>;
  fetchStats: () => Promise<void>;
  startSimulation: (scenarioId: string, personaId?: string) => Promise<{
    callSessionId: string;
    roomName: string;
    token: string;
    url: string;
    dispatchId: string;
    agentName: string;
    persona: { id: string; name: string };
    scenario: { id: string; title: string };
  }>;
  completeSimulation: (scenarioId: string, score: number, feedback?: string) => Promise<void>;
  createScenario: (data: Partial<Scenario>) => Promise<Scenario | null>;
  updateScenario: (id: string, data: Partial<Scenario>) => Promise<boolean>;
  deleteScenario: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  scenarios: [],
  recommendedScenarios: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchScenarios: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { scenarios: Scenario[] };
      }>('/scenarios');
      
      set({ 
        scenarios: response.data.scenarios,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch scenarios';
      set({ isLoading: false, error: message });
    }
  },

  fetchRecommendedScenarios: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { scenarios: Scenario[] };
      }>('/simulations/recommended');
      
      set({ recommendedScenarios: response.data.scenarios });
    } catch (error) {
      console.error('Failed to fetch recommended scenarios:', error);
    }
  },

  fetchStats: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { stats: SimulationStats };
      }>('/simulations/stats');
      
      set({ stats: response.data.stats });
    } catch (error) {
      console.error('Failed to fetch simulation stats:', error);
    }
  },

  startSimulation: async (scenarioId: string, personaId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          callSessionId: string;
          roomName: string;
          token: string;
          url: string;
          dispatchId: string;
          agentName: string;
          persona: { id: string; name: string };
          scenario: { id: string; title: string };
        };
      }>('/simulations/start', { scenarioId, personaId });
      
      // Update local state
      const scenarios = get().scenarios.map(s => 
        s.id === scenarioId ? { ...s, status: 'in_progress' as const } : s
      );
      set({ 
        scenarios,
        isLoading: false,
        error: null,
      });
      
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start simulation';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  completeSimulation: async (scenarioId: string, score: number, feedback?: string) => {
    try {
      await apiClient.post(`/scenarios/${scenarioId}/complete`, { score, feedback });
      
      // Update local state
      const scenarios = get().scenarios.map(s => 
        s.id === scenarioId ? { ...s, status: 'completed' as const, userScore: score } : s
      );
      set({ scenarios });
      
      // Refresh stats
      await get().fetchStats();
    } catch (error) {
      console.error('Failed to complete simulation:', error);
      throw error;
    }
  },

  createScenario: async (data: Partial<Scenario>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { scenario: Scenario };
      }>('/scenarios', data);
      
      const newScenario = response.data.scenario;
      set({ 
        scenarios: [...get().scenarios, newScenario],
        isLoading: false,
        error: null,
      });
      
      return newScenario;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create scenario';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  updateScenario: async (id: string, data: Partial<Scenario>) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.put(`/scenarios/${id}`, data);
      
      // Update local state
      const scenarios = get().scenarios.map(s => 
        s.id === id ? { ...s, ...data } : s
      );
      set({ scenarios, isLoading: false, error: null });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update scenario';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  deleteScenario: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.delete(`/scenarios/${id}`);
      
      // Update local state
      const scenarios = get().scenarios.filter(s => s.id !== id);
      set({ scenarios, isLoading: false, error: null });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete scenario';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

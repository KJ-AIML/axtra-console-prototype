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
  startSimulation: (scenarioId: string) => Promise<void>;
  completeSimulation: (scenarioId: string, score: number, feedback?: string) => Promise<void>;
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

  startSimulation: async (scenarioId: string) => {
    try {
      await apiClient.post(`/scenarios/${scenarioId}/start`, {});
      
      // Update local state
      const scenarios = get().scenarios.map(s => 
        s.id === scenarioId ? { ...s, status: 'in_progress' as const } : s
      );
      set({ scenarios });
    } catch (error) {
      console.error('Failed to start simulation:', error);
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

  clearError: () => set({ error: null }),
}));

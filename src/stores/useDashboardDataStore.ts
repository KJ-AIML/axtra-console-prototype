import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

export interface UserMetric {
  id: string;
  userId: string;
  metricKey: string;
  metricValue: string;
  subtext?: string;
  sortOrder: number;
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

export interface SkillVelocity {
  id: string;
  userId: string;
  level: number;
  currentXp: number;
  maxXp: number;
  progressPercentage: number;
  description?: string;
}

export interface QaHighlight {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'positive' | 'improvement';
  callId?: string;
  createdAt: string;
}

export interface RecentCall {
  id: string;
  scenarioTitle: string;
  difficulty: string;
  duration: string;
  score?: number;
  customerSentiment: string;
  completedAt: string;
}

export interface CallStats {
  totalCalls: number;
  averageScore: number;
  totalCoaching: number;
  completionRate: number;
}

export interface DashboardData {
  metrics: UserMetric[];
  scenarios: Scenario[];
  skillVelocity: SkillVelocity | null;
  qaHighlights: QaHighlight[];
  recentCalls: RecentCall[];
  callStats: CallStats;
}

interface DashboardDataState extends DashboardData {
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchDashboardData: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchScenarios: () => Promise<void>;
  fetchSkillVelocity: () => Promise<void>;
  fetchQaHighlights: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardDataStore = create<DashboardDataState>((set, get) => ({
  metrics: [],
  scenarios: [],
  skillVelocity: null,
  qaHighlights: [],
  recentCalls: [],
  callStats: { totalCalls: 0, averageScore: 0, totalCoaching: 0, completionRate: 0 },
  isLoading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: DashboardData;
      }>('/dashboard');
      
      set({
        metrics: response.data.metrics,
        scenarios: response.data.scenarios,
        skillVelocity: response.data.skillVelocity,
        qaHighlights: response.data.qaHighlights,
        recentCalls: response.data.recentCalls || [],
        callStats: response.data.callStats || { totalCalls: 0, averageScore: 0, totalCoaching: 0, completionRate: 0 },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      set({ isLoading: false, error: message });
    }
  },

  fetchMetrics: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { metrics: UserMetric[] };
      }>('/dashboard/metrics');
      
      set({ metrics: response.data.metrics });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  },

  fetchScenarios: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { scenarios: Scenario[] };
      }>('/dashboard/scenarios');
      
      set({ scenarios: response.data.scenarios });
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    }
  },

  fetchSkillVelocity: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { skillVelocity: SkillVelocity | null };
      }>('/dashboard/skill-velocity');
      
      set({ skillVelocity: response.data.skillVelocity });
    } catch (error) {
      console.error('Failed to fetch skill velocity:', error);
    }
  },

  fetchQaHighlights: async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { qaHighlights: QaHighlight[] };
      }>('/dashboard/qa-highlights');
      
      set({ qaHighlights: response.data.qaHighlights });
    } catch (error) {
      console.error('Failed to fetch QA highlights:', error);
    }
  },

  clearError: () => set({ error: null }),
}));

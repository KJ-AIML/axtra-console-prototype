/**
 * Recordings Store
 * Manage recordings library state with Zustand
 */

import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import type {
  RecordingListItem,
  RecordingDetail,
  RecordingFilters,
  RecordingStats,
  PaginatedRecordings,
} from '../lib/api-types';

// ============================================
// State Interface
// ============================================

interface RecordingsState {
  // Data
  recordings: RecordingListItem[];
  selectedRecording: RecordingDetail | null;
  stats: RecordingStats | null;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;
  
  // Filters
  filters: RecordingFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Loading states
  isLoading: boolean;
  isLoadingDetail: boolean;
  isDeleting: string | null; // ID of recording being deleted
  
  // Error
  error: string | null;
  
  // Actions
  fetchRecordings: (page?: number) => Promise<void>;
  fetchRecordingDetail: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  deleteRecording: (id: string) => Promise<boolean>;
  
  // Filter actions
  setFilters: (filters: Partial<RecordingFilters>) => void;
  clearFilters: () => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  
  // Selection
  selectRecording: (recording: RecordingDetail | null) => void;
  clearSelection: () => void;
  
  // Error handling
  clearError: () => void;
}

// ============================================
// Store Implementation
// ============================================

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  // Initial state
  recordings: [],
  selectedRecording: null,
  stats: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  filters: {},
  sortBy: 'started_at',
  sortOrder: 'desc',
  isLoading: false,
  isLoadingDetail: false,
  isDeleting: null,
  error: null,

  // ============================================
  // Data Fetching
  // ============================================

  fetchRecordings: async (page = get().currentPage) => {
    const { filters, sortBy, sortOrder, pageSize } = get();
    
    set({ isLoading: true, error: null, currentPage: page });
    
    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', pageSize.toString());
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);
      
      if (filters.scenario_id) params.set('scenario_id', filters.scenario_id);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.status) params.set('status', filters.status);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.min_score !== undefined) params.set('min_score', filters.min_score.toString());
      if (filters.max_score !== undefined) params.set('max_score', filters.max_score.toString());
      if (filters.search) params.set('search', filters.search);
      
      const response = await apiClient.get<PaginatedRecordings>(
        `/recordings?${params.toString()}`
      );
      
      set({
        recordings: response.recordings,
        totalCount: response.total,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recordings';
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchRecordingDetail: async (id: string) => {
    set({ isLoadingDetail: true, error: null });
    
    try {
      const response = await apiClient.get<{ recording: RecordingDetail }>(`/recordings/${id}`);
      set({
        selectedRecording: response.recording,
        isLoadingDetail: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recording';
      set({ error: errorMessage, isLoadingDetail: false });
    }
  },

  fetchStats: async () => {
    try {
      const response = await apiClient.get<{ stats: RecordingStats }>('/recordings/stats');
      set({ stats: response.stats });
    } catch (error) {
      console.error('Failed to load recording stats:', error);
      // Don't set error state - stats are non-critical
    }
  },

  deleteRecording: async (id: string) => {
    set({ isDeleting: id, error: null });
    
    try {
      await apiClient.delete(`/recordings/${id}`);
      
      // Remove from list
      const { recordings } = get();
      set({
        recordings: recordings.filter(r => r.id !== id),
        totalCount: get().totalCount - 1,
        isDeleting: null,
      });
      
      // Clear selection if deleted recording was selected
      if (get().selectedRecording?.id === id) {
        set({ selectedRecording: null });
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recording';
      set({ error: errorMessage, isDeleting: null });
      return false;
    }
  },

  // ============================================
  // Filter Actions
  // ============================================

  setFilters: (newFilters: Partial<RecordingFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1, // Reset to first page when filters change
    }));
    // Auto-fetch with new filters
    get().fetchRecordings(1);
  },

  clearFilters: () => {
    set({
      filters: {},
      currentPage: 1,
    });
    get().fetchRecordings(1);
  },

  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    set({ sortBy, sortOrder, currentPage: 1 });
    get().fetchRecordings(1);
  },

  // ============================================
  // Selection Actions
  // ============================================

  selectRecording: (recording: RecordingDetail | null) => {
    set({ selectedRecording: recording });
  },

  clearSelection: () => {
    set({ selectedRecording: null });
  },

  // ============================================
  // Error Handling
  // ============================================

  clearError: () => {
    set({ error: null });
  },
}));

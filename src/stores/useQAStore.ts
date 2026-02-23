/**
 * QA Review Store
 * State management for QA Review system
 */

import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

// Types
export type ScoringType = 'scale' | 'binary';

export interface QAConfigWeight {
  id: string;
  config_id: string;
  criteria_id: string;
  weight: number;
  auto_calculate: boolean;
}

export interface QACriteria {
  id: string;
  name: string;
  description: string;
  ai_prompt: string;
  scoring_type: ScoringType;
  max_score: number;
  weight: number;
  is_required: boolean;
  sort_order: number;
  // Sub-criteria support
  parent_criteria_id?: string;
  level?: number;
  children?: QACriteria[];
  config_weight?: QAConfigWeight;
  calculated_weight?: number;
}

export interface QACriteriaHierarchy extends QACriteria {
  children: QACriteriaHierarchy[];
  calculated_weight: number;
}

export interface AIQACriteriaScore {
  criteria_id: string;
  criteria_name: string;
  score: number;
  reasoning: string;
  evidence_quote: string;
  evidence_timestamp: number;
}

export interface AIQAResult {
  id: string;
  call_id: string;
  overall_score: number;
  summary_feedback: string;
  status: 'pending_review' | 'reviewed';
  created_at: string;
  criteria_scores: AIQACriteriaScore[];
}

export interface HumanQACriteriaScore {
  criteria_id: string;
  score: number;
  comment?: string;
}

export interface HumanQAComment {
  timestamp_seconds: number;
  comment: string;
}

export interface QAReviewQueueItem {
  call_id: string;
  scenario_title: string;
  operator_name: string;
  duration_seconds: number;
  total_turns: number;
  ai_overall_score: number;
  created_at: string;
}

export interface CompleteQAData {
  config?: {
    id: string;
    code: string;
    name: string;
    version: {
      id: string;
      config_id: string;
      version_no: number;
      status: 'draft' | 'published' | 'archived';
      published_at?: string | null;
      created_by?: string | null;
      created_at: string;
    };
  } | null;
  criteria_tree?: QACriteriaHierarchy[];
  ai_qa: AIQAResult | null;
  human_qa: {
    id: string;
    overall_score: number;
    general_feedback: string;
    status: 'draft' | 'submitted';
    criteria_scores: Array<{
      criteria_id: string;
      score: number;
      comment: string;
    }>;
    comments: Array<{
      timestamp_seconds: number;
      comment: string;
    }>;
  } | null;
  criteria: QACriteria[];
  comparison: {
    ai_overall: number;
    human_overall: number;
    difference: number;
    variance: 'aligned' | 'minor' | 'significant';
  } | null;
}

export interface ReviewedCall {
  call_id: string;
  scenario_title: string;
  operator_name: string;
  duration_seconds: number;
  ai_overall_score: number;
  human_overall_score: number;
  reviewer_name: string;
  reviewed_at: string;
}

interface QAState {
  // Queue
  reviewQueue: QAReviewQueueItem[];
  isLoadingQueue: boolean;
  queueError: string | null;
  
  // Reviewed calls
  reviewedCalls: ReviewedCall[];
  isLoadingReviewed: boolean;
  reviewedError: string | null;
  
  // Selected QA data
  selectedQAData: CompleteQAData | null;
  isLoadingQA: boolean;
  qaError: string | null;
  
  // Criteria definitions
  criteria: QACriteria[];
  criteriaHierarchy: QACriteriaHierarchy[];
  isLoadingCriteria: boolean;
  configWeights: QAConfigWeight[];
  isLoadingWeights: boolean;
  
  // Human review form
  humanScores: Record<string, number>;
  humanComments: Record<string, string>;
  generalFeedback: string;
  timestampedComments: HumanQAComment[];
  
  // Actions
  fetchReviewQueue: () => Promise<void>;
  fetchReviewedCalls: (myReviewsOnly?: boolean) => Promise<void>;
  fetchQAData: (callId: string) => Promise<void>;
  fetchCriteria: () => Promise<void>;
  fetchCriteriaHierarchy: () => Promise<void>;
  fetchConfigWeights: (configId?: string) => Promise<void>;
  saveConfigWeight: (criteriaId: string, weight: number, autoCalculate: boolean, configId?: string) => Promise<boolean>;
  autoDistributeWeights: (configId?: string) => Promise<boolean>;
  
  // Weighted score calculation
  calculateWeightedScore: (scores: Record<string, number>) => { overall: number; breakdown: Array<{ criteria_id: string; name: string; score: number; weight: number; weighted_score: number }> };
  
  // Form actions
  setHumanScore: (criteriaId: string, score: number) => void;
  setHumanComment: (criteriaId: string, comment: string) => void;
  setGeneralFeedback: (feedback: string) => void;
  addTimestampedComment: (timestamp: number, comment: string) => void;
  removeTimestampedComment: (index: number) => void;
  
  // Submit review
  submitReview: (callId: string, status: 'draft' | 'submitted') => Promise<boolean>;
  
  // Reset
  resetForm: () => void;
  clearErrors: () => void;
}

export const useQAStore = create<QAState>((set, get) => ({
  // Initial state
  reviewQueue: [],
  isLoadingQueue: false,
  queueError: null,
  
  reviewedCalls: [],
  isLoadingReviewed: false,
  reviewedError: null,
  
  selectedQAData: null,
  isLoadingQA: false,
  qaError: null,
  
  criteria: [],
  criteriaHierarchy: [],
  isLoadingCriteria: false,
  configWeights: [],
  isLoadingWeights: false,
  
  humanScores: {},
  humanComments: {},
  generalFeedback: '',
  timestampedComments: [],

  // Fetch review queue
  fetchReviewQueue: async () => {
    set({ isLoadingQueue: true, queueError: null });
    
    try {
      const response = await apiClient.get('/qa/queue');
      set({ reviewQueue: response.data || [], isLoadingQueue: false });
    } catch (error: any) {
      console.error('Failed to fetch QA queue:', error);
      set({ 
        queueError: error.message || 'Failed to load review queue', 
        isLoadingQueue: false 
      });
    }
  },

  // Fetch reviewed calls
  fetchReviewedCalls: async (myReviewsOnly = false) => {
    set({ isLoadingReviewed: true, reviewedError: null });
    
    try {
      const response = await apiClient.get('/qa/reviewed', {
        params: { my: myReviewsOnly ? 'true' : 'false' }
      });
      set({ reviewedCalls: response.data || [], isLoadingReviewed: false });
    } catch (error: any) {
      console.error('Failed to fetch reviewed calls:', error);
      set({ 
        reviewedError: error.message || 'Failed to load reviewed calls', 
        isLoadingReviewed: false 
      });
    }
  },

  // Fetch complete QA data for a call
  fetchQAData: async (callId: string) => {
    set({ isLoadingQA: true, qaError: null });
    
    try {
      const response = await apiClient.get(`/qa/${callId}`);
      const data: CompleteQAData = response.data;
      
      set({ 
        selectedQAData: data, 
        isLoadingQA: false,
        criteria: data.criteria || [],
        criteriaHierarchy: data.criteria_tree || []
      });
      
      // Initialize form with existing human review if available
      if (data.human_qa) {
        const scores: Record<string, number> = {};
        const comments: Record<string, string> = {};
        
        data.human_qa.criteria_scores.forEach(cs => {
          scores[cs.criteria_id] = cs.score;
          if (cs.comment) comments[cs.criteria_id] = cs.comment;
        });
        
        set({
          humanScores: scores,
          humanComments: comments,
          generalFeedback: data.human_qa.general_feedback || '',
          timestampedComments: data.human_qa.comments || []
        });
      } else {
        // Initialize with AI scores as starting point
        const scores: Record<string, number> = {};
        data.ai_qa?.criteria_scores.forEach(cs => {
          scores[cs.criteria_id] = cs.score;
        });
        set({ 
          humanScores: scores,
          humanComments: {},
          generalFeedback: '',
          timestampedComments: []
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch QA data:', error);
      set({ 
        qaError: error.message || 'Failed to load QA data', 
        isLoadingQA: false 
      });
    }
  },

  // Fetch criteria definitions
  fetchCriteria: async () => {
    set({ isLoadingCriteria: true });
    
    try {
      const response = await apiClient.get<any>('/qa/criteria');
      const payload = response?.data;
      const criteria = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.criteria)
        ? payload.criteria
        : [];
      set({ criteria, isLoadingCriteria: false });
    } catch (error) {
      console.error('Failed to fetch criteria:', error);
      set({ isLoadingCriteria: false });
    }
  },

  // Fetch criteria hierarchy (with sub-criteria)
  fetchCriteriaHierarchy: async () => {
    set({ isLoadingCriteria: true });
    
    try {
      const response = await apiClient.get('/qa/criteria/hierarchy');
      set({ criteriaHierarchy: response.data || [], isLoadingCriteria: false });
    } catch (error) {
      console.error('Failed to fetch criteria hierarchy:', error);
      set({ isLoadingCriteria: false });
    }
  },

  // Fetch config weights
  fetchConfigWeights: async (configId = 'default') => {
    set({ isLoadingWeights: true });
    
    try {
      const response = await apiClient.get(`/qa/weights/${configId}`);
      set({ configWeights: response.data || [], isLoadingWeights: false });
    } catch (error) {
      console.error('Failed to fetch config weights:', error);
      set({ isLoadingWeights: false });
    }
  },

  // Save config weight for a criteria
  saveConfigWeight: async (criteriaId: string, weight: number, autoCalculate: boolean, configId = 'default') => {
    try {
      // Ensure proper types before sending
      const sanitizedWeight = Math.min(100, Math.max(0, Math.round(Number(weight) || 0)));
      await apiClient.post(`/qa/weights/${configId}`, {
        criteria_id: String(criteriaId),
        weight: sanitizedWeight,
        auto_calculate: autoCalculate ? true : false
      });
      // Refresh weights
      await get().fetchConfigWeights(configId);
      return true;
    } catch (error: any) {
      console.error('Failed to save config weight:', error);
      return false;
    }
  },

  // Auto-distribute weights equally
  autoDistributeWeights: async (configId = 'default') => {
    try {
      await apiClient.post('/qa/weights/auto-distribute', { config_id: configId });
      // Refresh weights and hierarchy
      await get().fetchConfigWeights(configId);
      await get().fetchCriteriaHierarchy();
      return true;
    } catch (error: any) {
      console.error('Failed to auto-distribute weights:', error);
      return false;
    }
  },

  // Calculate weighted overall score
  calculateWeightedScore: (scores: Record<string, number>) => {
    const state = get();
    const hierarchy = state.criteriaHierarchy;
    
    if (hierarchy.length === 0) {
      // Fallback to simple average if no hierarchy
      const values = Object.values(scores);
      const overall = values.length > 0 
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
      return { overall, breakdown: [] };
    }

    const breakdown: Array<{ criteria_id: string; name: string; score: number; weight: number; weighted_score: number }> = [];
    let totalWeight = 0;
    let weightedSum = 0;

    function processNode(node: QACriteriaHierarchy): number {
      const score = scores[node.id];
      
      // If has children, calculate from them
      if (node.children && node.children.length > 0) {
        const childResults = node.children.map(processNode);
        const childWeightedSum = childResults.reduce((sum, r, i) => {
          const child = node.children[i];
          return sum + (r * (child.calculated_weight || 1));
        }, 0);
        const childTotalWeight = node.children.reduce((sum, c) => sum + (c.calculated_weight || 1), 0);
        const aggregatedScore = childTotalWeight > 0 ? childWeightedSum / childTotalWeight : 0;
        
        breakdown.push({
          criteria_id: node.id,
          name: node.name,
          score: Math.round(aggregatedScore),
          weight: node.calculated_weight || 0,
          weighted_score: aggregatedScore * (node.calculated_weight || 0),
        });
        
        return aggregatedScore;
      }
      
      // Leaf node
      if (score !== undefined) {
        const maxScore = node.scoring_type === 'binary' ? 1 : node.max_score;
        let normalizedScore: number;
        
        if (node.scoring_type === 'binary') {
          normalizedScore = score >= 1 ? 100 : 0;
        } else {
          normalizedScore = (score / maxScore) * 100;
        }
        
        const weight = node.calculated_weight || node.weight || 1;
        const weightedScore = normalizedScore * weight;
        
        breakdown.push({
          criteria_id: node.id,
          name: node.name,
          score: Math.round(normalizedScore),
          weight,
          weighted_score: weightedScore,
        });
        
        totalWeight += weight;
        weightedSum += weightedScore;
        
        return normalizedScore;
      }
      
      return 0;
    }

    for (const root of hierarchy) {
      processNode(root);
    }

    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    return { overall, breakdown };
  },

  // Form actions
  setHumanScore: (criteriaId: string, score: number) => {
    set(state => ({
      humanScores: { ...state.humanScores, [criteriaId]: score }
    }));
  },

  setHumanComment: (criteriaId: string, comment: string) => {
    set(state => ({
      humanComments: { ...state.humanComments, [criteriaId]: comment }
    }));
  },

  setGeneralFeedback: (feedback: string) => {
    set({ generalFeedback: feedback });
  },

  addTimestampedComment: (timestamp: number, comment: string) => {
    set(state => ({
      timestampedComments: [
        ...state.timestampedComments,
        { timestamp_seconds: timestamp, comment }
      ]
    }));
  },

  removeTimestampedComment: (index: number) => {
    set(state => ({
      timestampedComments: state.timestampedComments.filter((_, i) => i !== index)
    }));
  },

  // Submit review
  submitReview: async (callId: string, status: 'draft' | 'submitted') => {
    const state = get();
    
    // Build criteria scores array
    const criteria_scores = state.criteria.map(c => {
      const maxScore = c.scoring_type === 'binary' ? 1 : c.max_score;
      const defaultScore = c.scoring_type === 'binary' ? 1 : Math.round(maxScore / 2);
      return {
        criteria_id: c.id,
        score: state.humanScores[c.id] ?? defaultScore,
        comment: state.humanComments[c.id] || ''
      };
    });
    
    const overall_score = get().calculateWeightedScore(state.humanScores).overall;
    
    try {
      await apiClient.post('/qa/reviews', {
        call_id: callId,
        overall_score,
        config_id: state.selectedQAData?.config?.id || 'default',
        config_version_id: state.selectedQAData?.config?.version?.id,
        general_feedback: state.generalFeedback,
        status,
        criteria_scores,
        comments: state.timestampedComments
      });
      
      // Refresh QA data after submission
      await get().fetchQAData(callId);
      
      return true;
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      set({ qaError: error.message || 'Failed to submit review' });
      return false;
    }
  },

  // Reset form
  resetForm: () => {
    set({
      humanScores: {},
      humanComments: {},
      generalFeedback: '',
      timestampedComments: []
    });
  },

  // Clear errors
  clearErrors: () => {
    set({ queueError: null, qaError: null });
  }
}));

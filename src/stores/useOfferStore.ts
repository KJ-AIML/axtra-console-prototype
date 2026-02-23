/**
 * Offers & Rules Store
 * Manages promotions (general and personal)
 */

import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

// ============================================
// TYPES
// ============================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'free_gift' | 'points_bonus';
export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired' | 'disabled';
export type TriggerType = 'manual' | 'auto_escalation' | 'auto_churn_risk' | 'auto_birthday' | 'auto_anniversary' | 'auto_inactive';

export interface GeneralPromotion {
  id: string;
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  promo_code?: string;
  discount_type: DiscountType;
  discount_value?: number;
  max_discount_amount?: number;
  min_order_amount: number;
  usage_limit_total?: number;
  usage_limit_per_user: number;
  usage_count: number;
  start_date: string;
  end_date: string;
  status: PromotionStatus;
  display_priority: number;
  banner_image_url?: string;
  terms_and_conditions?: string;
  terms_and_conditions_th?: string;
  copilot_suggestion_enabled: boolean;
  copilot_trigger_keywords?: string[];
  created_at: string;
  updated_at: string;
}

export interface PersonalPromotion {
  id: string;
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  discount_type: DiscountType | 'tier_upgrade';
  discount_value?: number;
  max_discount_amount?: number;
  benefits_summary?: {
    discount_percent?: number;
    discount_amount?: number;
    extra_points?: number;
    free_shipping_months?: boolean;
    tier_extension_months?: number;
    welcome_gift?: boolean;
    max_discount?: number;
  };
  target_tiers?: string[];
  target_min_tenure_months?: number;
  target_max_tenure_months?: number;
  target_account_age_years?: number;
  trigger_type: TriggerType;
  trigger_conditions?: {
    escalation_type?: string;
    ltv_minimum?: number;
    days_since_last_purchase?: number;
  };
  auto_apply: boolean;
  require_operator_approval: boolean;
  usage_limit_total?: number;
  usage_limit_per_user: number;
  usage_count: number;
  start_date: string;
  end_date?: string;
  status: PromotionStatus;
  display_priority: number;
  notification_message?: string;
  notification_message_th?: string;
  copilot_card_title?: string;
  copilot_card_title_th?: string;
  copilot_suggestion_script?: string;
  copilot_suggestion_script_th?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// STORE STATE
// ============================================

interface OfferState {
  // General promotions
  generalPromotions: GeneralPromotion[];
  selectedGeneralPromotion: GeneralPromotion | null;
  
  // Personal promotions
  personalPromotions: PersonalPromotion[];
  selectedPersonalPromotion: PersonalPromotion | null;
  
  // UI state
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  
  // Actions
  fetchGeneralPromotions: () => Promise<void>;
  fetchPersonalPromotions: () => Promise<void>;
  fetchPromotionById: (id: string, type: 'general' | 'personal') => Promise<void>;
  
  createGeneralPromotion: (data: Partial<GeneralPromotion>) => Promise<GeneralPromotion | null>;
  updateGeneralPromotion: (id: string, data: Partial<GeneralPromotion>) => Promise<boolean>;
  deleteGeneralPromotion: (id: string) => Promise<boolean>;
  
  createPersonalPromotion: (data: Partial<PersonalPromotion>) => Promise<PersonalPromotion | null>;
  updatePersonalPromotion: (id: string, data: Partial<PersonalPromotion>) => Promise<boolean>;
  deletePersonalPromotion: (id: string) => Promise<boolean>;
  
  selectGeneralPromotion: (promo: GeneralPromotion | null) => void;
  selectPersonalPromotion: (promo: PersonalPromotion | null) => void;
  
  togglePromotionStatus: (id: string, type: 'general' | 'personal') => Promise<boolean>;
  
  clearError: () => void;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useOfferStore = create<OfferState>((set, get) => ({
  // Initial state
  generalPromotions: [],
  selectedGeneralPromotion: null,
  personalPromotions: [],
  selectedPersonalPromotion: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,

  // Fetch all general promotions
  fetchGeneralPromotions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ success: boolean; data: GeneralPromotion[] }>('/offers/general');
      if (response.success) {
        set({ generalPromotions: response.data, isLoading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch promotions',
        isLoading: false 
      });
    }
  },

  // Fetch all personal promotions
  fetchPersonalPromotions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ success: boolean; data: PersonalPromotion[] }>('/offers/personal');
      if (response.success) {
        set({ personalPromotions: response.data, isLoading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch promotions',
        isLoading: false 
      });
    }
  },

  // Fetch single promotion by ID
  fetchPromotionById: async (id: string, type: 'general' | 'personal') => {
    set({ isLoadingDetails: true, error: null });
    try {
      const endpoint = type === 'general' 
        ? `/offers/general/${id}` 
        : `/offers/personal/${id}`;
      const response = await apiClient.get<{ success: boolean; data: any }>(endpoint);
      
      if (response.success) {
        if (type === 'general') {
          set({ selectedGeneralPromotion: response.data, isLoadingDetails: false });
        } else {
          set({ selectedPersonalPromotion: response.data, isLoadingDetails: false });
        }
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch promotion',
        isLoadingDetails: false 
      });
    }
  },

  // Create general promotion
  createGeneralPromotion: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<{ success: boolean; data: GeneralPromotion }>('/offers/general', data);
      if (response.success) {
        const currentPromos = get().generalPromotions;
        set({ 
          generalPromotions: [...currentPromos, response.data],
          isLoading: false 
        });
        return response.data;
      }
      return null;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create promotion',
        isLoading: false 
      });
      return null;
    }
  },

  // Update general promotion
  updateGeneralPromotion: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put<{ success: boolean; data: GeneralPromotion }>(`/offers/general/${id}`, data);
      if (response.success) {
        const currentPromos = get().generalPromotions.map(p => 
          p.id === id ? response.data : p
        );
        set({ 
          generalPromotions: currentPromos,
          selectedGeneralPromotion: get().selectedGeneralPromotion?.id === id ? response.data : get().selectedGeneralPromotion,
          isLoading: false 
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update promotion',
        isLoading: false 
      });
      return false;
    }
  },

  // Delete general promotion
  deleteGeneralPromotion: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/offers/general/${id}`);
      const currentPromos = get().generalPromotions.filter(p => p.id !== id);
      set({ 
        generalPromotions: currentPromos,
        selectedGeneralPromotion: get().selectedGeneralPromotion?.id === id ? null : get().selectedGeneralPromotion,
        isLoading: false 
      });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete promotion',
        isLoading: false 
      });
      return false;
    }
  },

  // Create personal promotion
  createPersonalPromotion: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<{ success: boolean; data: PersonalPromotion }>('/offers/personal', data);
      if (response.success) {
        const currentPromos = get().personalPromotions;
        set({ 
          personalPromotions: [...currentPromos, response.data],
          isLoading: false 
        });
        return response.data;
      }
      return null;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create promotion',
        isLoading: false 
      });
      return null;
    }
  },

  // Update personal promotion
  updatePersonalPromotion: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put<{ success: boolean; data: PersonalPromotion }>(`/offers/personal/${id}`, data);
      if (response.success) {
        const currentPromos = get().personalPromotions.map(p => 
          p.id === id ? response.data : p
        );
        set({ 
          personalPromotions: currentPromos,
          selectedPersonalPromotion: get().selectedPersonalPromotion?.id === id ? response.data : get().selectedPersonalPromotion,
          isLoading: false 
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update promotion',
        isLoading: false 
      });
      return false;
    }
  },

  // Delete personal promotion
  deletePersonalPromotion: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/offers/personal/${id}`);
      const currentPromos = get().personalPromotions.filter(p => p.id !== id);
      set({ 
        personalPromotions: currentPromos,
        selectedPersonalPromotion: get().selectedPersonalPromotion?.id === id ? null : get().selectedPersonalPromotion,
        isLoading: false 
      });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete promotion',
        isLoading: false 
      });
      return false;
    }
  },

  // Select promotions
  selectGeneralPromotion: (promo) => set({ selectedGeneralPromotion: promo }),
  selectPersonalPromotion: (promo) => set({ selectedPersonalPromotion: promo }),

  // Toggle status
  togglePromotionStatus: async (id, type) => {
    const promo = type === 'general'
      ? get().generalPromotions.find(p => p.id === id)
      : get().personalPromotions.find(p => p.id === id);
    
    if (!promo) return false;
    
    const newStatus = promo.status === 'active' ? 'disabled' : 'active';
    
    if (type === 'general') {
      return get().updateGeneralPromotion(id, { status: newStatus });
    } else {
      return get().updatePersonalPromotion(id, { status: newStatus });
    }
  },

  clearError: () => set({ error: null }),
}));

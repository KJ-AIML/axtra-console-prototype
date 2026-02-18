/**
 * TypeScript Types for Offers & Rules
 * General Promotions and Personal Promotions
 */

// ============================================
// GENERAL PROMOTIONS
// ============================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'free_gift' | 'points_bonus';
export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired' | 'disabled';

export interface GeneralPromotion {
  id: string;
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  
  promo_code?: string; // NULL for auto-apply
  discount_type: DiscountType;
  discount_value?: number;
  max_discount_amount?: number;
  
  min_order_amount: number;
  min_items_count: number;
  
  usage_limit_total?: number;
  usage_limit_per_user: number;
  usage_count: number;
  
  start_date: string; // ISO 8601
  end_date: string;
  
  status: PromotionStatus;
  
  display_priority: number;
  banner_image_url?: string;
  terms_and_conditions?: string;
  terms_and_conditions_th?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Copilot integration
  copilot_suggestion_enabled: boolean;
  copilot_trigger_keywords?: string[];
}

export interface GeneralPromotionBenefits {
  coupons?: number;
  mastercard_points?: number;
  central_card_points?: number;
  tier_extension_years?: number;
  maldives_trip_lottery?: boolean;
}

// ============================================
// PERSONAL PROMOTIONS
// ============================================

export type PersonalDiscountType = DiscountType | 'tier_upgrade';
export type TriggerType = 'manual' | 'auto_escalation' | 'auto_churn_risk' | 'auto_birthday' | 'auto_anniversary' | 'auto_inactive';

export interface PersonalPromotion {
  id: string;
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  
  discount_type: PersonalDiscountType;
  discount_value?: number;
  max_discount_amount?: number;
  benefits_summary?: PersonalPromotionBenefits;
  
  // Targeting Criteria
  target_tiers?: string[]; // ["Gold", "Platinum"] or undefined for all
  target_min_tenure_months?: number;
  target_max_tenure_months?: number;
  target_account_age_years?: number; // e.g., 5 for "5th anniversary"
  
  // Triggers
  trigger_type: TriggerType;
  trigger_conditions?: TriggerConditions;
  
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
  
  // Copilot integration
  copilot_card_title?: string;
  copilot_card_title_th?: string;
  copilot_suggestion_script?: string;
  copilot_suggestion_script_th?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PersonalPromotionBenefits {
  discount_percent?: number;
  discount_amount?: number;
  extra_points?: number;
  free_shipping_months?: boolean;
  tier_extension_months?: number;
  welcome_gift?: boolean;
  max_discount?: number;
}

export interface TriggerConditions {
  escalation_type?: 'cancel_request' | 'complaint' | 'supervisor_request';
  ltv_minimum?: number;
  days_since_last_purchase?: number;
  days_since_last_login?: number;
  custom_condition?: string;
}

// ============================================
// PROMOTION RULES
// ============================================

export type RuleType = 'tier' | 'tenure' | 'last_purchase' | 'lifetime_value' | 'points_balance' | 'escalation_trigger' | 'custom';
export type RuleOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';

export interface PersonalPromotionRule {
  id: string;
  promotion_id: string;
  rule_type: RuleType;
  operator: RuleOperator;
  value: string;
  value_secondary?: string; // For "between" operator
}

// ============================================
// KNOWLEDGE BASE
// ============================================

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  title_th?: string;
  content: string;
  content_th?: string;
  excerpt?: string;
  excerpt_th?: string;
  
  category: string;
  tags?: string[];
  keywords?: string[];
  related_article_ids?: string[];
  
  status: ArticleStatus;
  
  copilot_searchable: boolean;
  copilot_priority: number;
  copilot_trigger_keywords?: string[];
  
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_updated_by?: string;
}

// ============================================
// COPILOT SETTINGS
// ============================================

export interface CopilotUserSettings {
  id: string;
  user_id: string;
  
  // Feature toggles
  emotion_analysis_enabled: boolean;
  leverage_suggestions_enabled: boolean;
  strategy_guidance_enabled: boolean;
  personal_promotion_suggestions_enabled: boolean;
  knowledge_base_search_enabled: boolean;
  smart_responses_enabled: boolean;
  escalation_detection_enabled: boolean;
  
  // Card settings
  card1_show_confidence: boolean;
  card1_auto_expand_danger: boolean;
  card2_show_tier_badge: boolean;
  card2_show_all_benefits: boolean;
  card3_show_risk_meter: boolean;
  card3_show_action_buttons: boolean;
  
  // Trigger settings
  analysis_turns_threshold: number;
  analysis_char_threshold: number;
  analysis_time_threshold: number;
  
  updated_at: string;
}

// ============================================
// API REQUESTS / RESPONSES
// ============================================

// General Promotions
export interface CreateGeneralPromotionRequest {
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  promo_code?: string;
  discount_type: DiscountType;
  discount_value?: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  usage_limit_total?: number;
  usage_limit_per_user?: number;
  start_date: string;
  end_date: string;
  banner_image_url?: string;
  terms_and_conditions?: string;
  terms_and_conditions_th?: string;
  copilot_trigger_keywords?: string[];
}

export interface UpdateGeneralPromotionRequest extends Partial<CreateGeneralPromotionRequest> {
  status?: PromotionStatus;
}

// Personal Promotions
export interface CreatePersonalPromotionRequest {
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  discount_type: PersonalDiscountType;
  discount_value?: number;
  max_discount_amount?: number;
  benefits_summary?: PersonalPromotionBenefits;
  
  target_tiers?: string[];
  target_min_tenure_months?: number;
  target_max_tenure_months?: number;
  target_account_age_years?: number;
  
  trigger_type: TriggerType;
  trigger_conditions?: TriggerConditions;
  auto_apply?: boolean;
  require_operator_approval?: boolean;
  
  usage_limit_total?: number;
  usage_limit_per_user?: number;
  start_date: string;
  end_date?: string;
  
  copilot_card_title?: string;
  copilot_card_title_th?: string;
  copilot_suggestion_script?: string;
  copilot_suggestion_script_th?: string;
}

// Copilot Settings
export interface UpdateCopilotSettingsRequest {
  emotion_analysis_enabled?: boolean;
  leverage_suggestions_enabled?: boolean;
  strategy_guidance_enabled?: boolean;
  personal_promotion_suggestions_enabled?: boolean;
  knowledge_base_search_enabled?: boolean;
  smart_responses_enabled?: boolean;
  escalation_detection_enabled?: boolean;
  
  card1_show_confidence?: boolean;
  card1_auto_expand_danger?: boolean;
  card2_show_tier_badge?: boolean;
  card2_show_all_benefits?: boolean;
  card3_show_risk_meter?: boolean;
  card3_show_action_buttons?: boolean;
  
  analysis_turns_threshold?: number;
  analysis_char_threshold?: number;
  analysis_time_threshold?: number;
}

// ============================================
// CATEGORIZED PROMOTIONS (for UI)
// ============================================

export type PromotionCategory = 
  | 'billing'
  | 'technical' 
  | 'account'
  | 'promotions'
  | 'returns'
  | 'vip'
  | 'general';

export interface CategorizedPromotions {
  category: PromotionCategory;
  promotions: GeneralPromotion[];
}

// ============================================
// COPILOT SUGGESTION (during call)
// ============================================

export interface CopilotPromotionSuggestion {
  promotion_id: string;
  promotion_type: 'general' | 'personal';
  name: string;
  name_th?: string;
  description: string;
  description_th?: string;
  
  // Display info for Card 2 (Leverage)
  card_title: string;
  card_title_th?: string;
  
  // Suggested script for operator
  suggestion_script: string;
  suggestion_script_th?: string;
  
  // Why this was suggested
  reason: string;
  reason_th?: string;
  
  // Eligibility check
  is_eligible: boolean;
  eligibility_reason?: string;
}

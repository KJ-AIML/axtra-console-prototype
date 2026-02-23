-- Migration: Offers & Rules + Copilot Integration
-- Created: 2026-02-17

-- ============================================
-- GENERAL PROMOTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS general_promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_th TEXT,
    description TEXT NOT NULL,
    description_th TEXT,
    
    promo_code TEXT UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus')),
    discount_value INTEGER,
    max_discount_amount INTEGER,
    
    min_order_amount INTEGER DEFAULT 0,
    min_items_count INTEGER DEFAULT 0,
    
    usage_limit_total INTEGER,
    usage_limit_per_user INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
    
    display_priority INTEGER DEFAULT 0,
    banner_image_url TEXT,
    terms_and_conditions TEXT,
    terms_and_conditions_th TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    copilot_suggestion_enabled BOOLEAN DEFAULT 1,
    copilot_trigger_keywords TEXT
);

-- ============================================
-- PERSONAL PROMOTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS personal_promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_th TEXT,
    description TEXT NOT NULL,
    description_th TEXT,
    
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus', 'tier_upgrade')),
    discount_value INTEGER,
    max_discount_amount INTEGER,
    benefits_summary TEXT,
    
    target_tiers TEXT,
    target_min_tenure_months INTEGER,
    target_max_tenure_months INTEGER,
    target_account_age_years INTEGER,
    
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto_escalation', 'auto_churn_risk', 'auto_birthday', 'auto_anniversary', 'auto_inactive')),
    trigger_conditions TEXT,
    
    auto_apply BOOLEAN DEFAULT 0,
    require_operator_approval BOOLEAN DEFAULT 0,
    
    usage_limit_total INTEGER,
    usage_limit_per_user INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    
    start_date TEXT NOT NULL,
    end_date TEXT,
    
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
    
    display_priority INTEGER DEFAULT 0,
    notification_message TEXT,
    notification_message_th TEXT,
    
    copilot_card_title TEXT,
    copilot_card_title_th TEXT,
    copilot_suggestion_script TEXT,
    copilot_suggestion_script_th TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- ============================================
-- PROMOTION RULES
-- ============================================
CREATE TABLE IF NOT EXISTS personal_promotion_rules (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('tier', 'tenure', 'last_purchase', 'lifetime_value', 'points_balance', 'escalation_trigger', 'custom')),
    operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains')),
    value TEXT NOT NULL,
    value_secondary TEXT,
    
    FOREIGN KEY (promotion_id) REFERENCES personal_promotions(id) ON DELETE CASCADE
);

-- ============================================
-- PROMOTION USAGE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_usage_logs (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('general', 'personal')),
    user_id TEXT NOT NULL,
    call_session_id TEXT,
    
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    applied_by_operator_id TEXT,
    original_amount INTEGER,
    discount_amount INTEGER,
    final_amount INTEGER,
    
    scenario_id TEXT,
    persona_id TEXT,
    
    was_suggested_by_copilot BOOLEAN DEFAULT 0,
    copilot_suggestion_id TEXT
);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_th TEXT,
    content TEXT NOT NULL,
    content_th TEXT,
    excerpt TEXT,
    excerpt_th TEXT,
    
    category TEXT NOT NULL,
    tags TEXT,
    keywords TEXT,
    related_article_ids TEXT,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    copilot_searchable BOOLEAN DEFAULT 1,
    copilot_priority INTEGER DEFAULT 0,
    copilot_trigger_keywords TEXT,
    
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    last_updated_by TEXT
);

-- ============================================
-- COPILOT USER SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS copilot_user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    
    emotion_analysis_enabled BOOLEAN DEFAULT 1,
    leverage_suggestions_enabled BOOLEAN DEFAULT 1,
    strategy_guidance_enabled BOOLEAN DEFAULT 1,
    personal_promotion_suggestions_enabled BOOLEAN DEFAULT 1,
    knowledge_base_search_enabled BOOLEAN DEFAULT 1,
    smart_responses_enabled BOOLEAN DEFAULT 1,
    escalation_detection_enabled BOOLEAN DEFAULT 1,
    
    card1_show_confidence BOOLEAN DEFAULT 1,
    card1_auto_expand_danger BOOLEAN DEFAULT 0,
    card2_show_tier_badge BOOLEAN DEFAULT 1,
    card2_show_all_benefits BOOLEAN DEFAULT 1,
    card3_show_risk_meter BOOLEAN DEFAULT 1,
    card3_show_action_buttons BOOLEAN DEFAULT 1,
    
    analysis_turns_threshold INTEGER DEFAULT 3,
    analysis_char_threshold INTEGER DEFAULT 300,
    analysis_time_threshold INTEGER DEFAULT 30,
    
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_general_promo_status ON general_promotions(status);
CREATE INDEX IF NOT EXISTS idx_general_promo_dates ON general_promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_personal_promo_status ON personal_promotions(status);
CREATE INDEX IF NOT EXISTS idx_personal_promo_trigger ON personal_promotions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base_articles(copilot_searchable);

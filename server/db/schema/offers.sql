-- Offers & Rules Database Schema
-- For General Promotions and Personal Promotions

-- ============================================
-- GENERAL PROMOTIONS (Public campaigns)
-- ============================================
CREATE TABLE IF NOT EXISTS general_promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_th TEXT,
    description TEXT NOT NULL,
    description_th TEXT,
    
    -- Promotion type and value
    promo_code TEXT UNIQUE, -- NULL for auto-apply promotions
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus')),
    discount_value INTEGER, -- Percentage or fixed amount
    max_discount_amount INTEGER, -- Cap for percentage discounts
    
    -- Requirements
    min_order_amount INTEGER DEFAULT 0,
    min_items_count INTEGER DEFAULT 0,
    
    -- Usage limits
    usage_limit_total INTEGER, -- NULL for unlimited
    usage_limit_per_user INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    
    -- Date range
    start_date TEXT NOT NULL, -- ISO 8601
    end_date TEXT NOT NULL, -- ISO 8601
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
    
    -- Display settings
    display_priority INTEGER DEFAULT 0, -- Higher = shown first
    banner_image_url TEXT,
    terms_and_conditions TEXT,
    terms_and_conditions_th TEXT,
    
    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    -- For Copilot integration
    copilot_suggestion_enabled BOOLEAN DEFAULT 1,
    copilot_trigger_keywords TEXT -- JSON array of keywords
);

-- ============================================
-- PERSONAL PROMOTIONS (Targeted campaigns)
-- ============================================
CREATE TABLE IF NOT EXISTS personal_promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_th TEXT,
    description TEXT NOT NULL,
    description_th TEXT,
    
    -- Promotion type and value
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus', 'tier_upgrade')),
    discount_value INTEGER,
    max_discount_amount INTEGER,
    
    -- Benefits breakdown (for display)
    benefits_summary TEXT, -- JSON: {"coupons": 4300, "points": 1000, "extra_points": 120000}
    
    -- Targeting Criteria (who can receive this)
    target_tiers TEXT, -- JSON array: ["Gold", "Platinum"] or NULL for all
    target_min_tenure_months INTEGER, -- Minimum membership duration
    target_max_tenure_months INTEGER, -- Maximum membership duration (for new user promos)
    target_account_age_years INTEGER, -- e.g., 5 for "5th anniversary"
    
    -- Behavior triggers (when to offer)
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto_escalation', 'auto_churn_risk', 'auto_birthday', 'auto_anniversary', 'auto_inactive')),
    trigger_conditions TEXT, -- JSON with specific conditions
    
    -- Auto-apply settings
    auto_apply BOOLEAN DEFAULT 0,
    require_operator_approval BOOLEAN DEFAULT 0,
    
    -- Usage limits
    usage_limit_total INTEGER,
    usage_limit_per_user INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    
    -- Date range
    start_date TEXT NOT NULL,
    end_date TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
    
    -- Display settings
    display_priority INTEGER DEFAULT 0,
    notification_message TEXT, -- Message shown to operator
    notification_message_th TEXT,
    
    -- Copilot integration
    copilot_card_title TEXT, -- Short title for Card 2 (Leverage)
    copilot_card_title_th TEXT,
    copilot_suggestion_script TEXT, -- Suggested script for operator
    copilot_suggestion_script_th TEXT,
    
    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- ============================================
-- PERSONAL PROMOTION RULES (Advanced targeting)
-- ============================================
CREATE TABLE IF NOT EXISTS personal_promotion_rules (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('tier', 'tenure', 'last_purchase', 'lifetime_value', 'points_balance', 'escalation_trigger', 'custom')),
    operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains')),
    value TEXT NOT NULL,
    value_secondary TEXT, -- For "between" operator
    
    FOREIGN KEY (promotion_id) REFERENCES personal_promotions(id) ON DELETE CASCADE
);

-- ============================================
-- PROMOTION USAGE LOG (Track redemptions)
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_usage_logs (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('general', 'personal')),
    user_id TEXT NOT NULL,
    call_session_id TEXT,
    
    -- Usage details
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    applied_by_operator_id TEXT, -- Who applied it (for personal promos)
    original_amount INTEGER,
    discount_amount INTEGER,
    final_amount INTEGER,
    
    -- Context
    scenario_id TEXT,
    persona_id TEXT,
    
    -- For analytics
    was_suggested_by_copilot BOOLEAN DEFAULT 0,
    copilot_suggestion_id TEXT
);

-- ============================================
-- KNOWLEDGE BASE ARTICLES
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_th TEXT,
    content TEXT NOT NULL,
    content_th TEXT,
    excerpt TEXT,
    excerpt_th TEXT,
    
    -- Categorization
    category TEXT NOT NULL,
    tags TEXT, -- JSON array
    
    -- Search/SEO
    keywords TEXT, -- JSON array for search
    related_article_ids TEXT, -- JSON array
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Copilot integration
    copilot_searchable BOOLEAN DEFAULT 1,
    copilot_priority INTEGER DEFAULT 0, -- Higher = suggested first
    copilot_trigger_keywords TEXT, -- JSON array
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    last_updated_by TEXT
);

-- ============================================
-- COPILOT CONFIGURATION (Per-user settings)
-- ============================================
CREATE TABLE IF NOT EXISTS copilot_user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    
    -- Feature toggles
    emotion_analysis_enabled BOOLEAN DEFAULT 1,
    leverage_suggestions_enabled BOOLEAN DEFAULT 1,
    strategy_guidance_enabled BOOLEAN DEFAULT 1,
    personal_promotion_suggestions_enabled BOOLEAN DEFAULT 1,
    knowledge_base_search_enabled BOOLEAN DEFAULT 1,
    smart_responses_enabled BOOLEAN DEFAULT 1,
    escalation_detection_enabled BOOLEAN DEFAULT 1,
    
    -- Card display settings
    card1_show_confidence BOOLEAN DEFAULT 1,
    card1_auto_expand_danger BOOLEAN DEFAULT 0,
    card2_show_tier_badge BOOLEAN DEFAULT 1,
    card2_show_all_benefits BOOLEAN DEFAULT 1,
    card3_show_risk_meter BOOLEAN DEFAULT 1,
    card3_show_action_buttons BOOLEAN DEFAULT 1,
    
    -- Trigger settings
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
CREATE INDEX IF NOT EXISTS idx_general_promo_code ON general_promotions(promo_code);

CREATE INDEX IF NOT EXISTS idx_personal_promo_status ON personal_promotions(status);
CREATE INDEX IF NOT EXISTS idx_personal_promo_dates ON personal_promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_personal_promo_trigger ON personal_promotions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_personal_promo_tiers ON personal_promotions(target_tiers);

CREATE INDEX IF NOT EXISTS idx_promo_rules_promo_id ON personal_promotion_rules(promotion_id);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON promotion_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_promo ON promotion_usage_logs(promotion_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_call ON promotion_usage_logs(call_session_id);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_articles(category);
CREATE INDEX IF NOT EXISTS idx_kb_status ON knowledge_base_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base_articles(copilot_searchable);

-- ============================================
-- SEED DATA: The 1 Exclusive 5th Anniversary
-- ============================================
INSERT OR REPLACE INTO general_promotions (
    id, name, name_th, description, description_th,
    promo_code, discount_type, discount_value,
    benefits_summary,
    min_order_amount, usage_limit_per_user,
    start_date, end_date, status,
    display_priority, banner_image_url,
    terms_and_conditions, terms_and_conditions_th,
    copilot_suggestion_enabled, copilot_trigger_keywords
) VALUES (
    'promo-the1-5th-anniversary',
    'The 1 Exclusive 5th Anniversary',
    'ฉลองครบ 5 ปี The 1 Exclusive',
    'Celebrate 5 years of The 1 Exclusive with special privileges at Central Retail, Central malls, Central Chidlom, and Central Embassy',
    'ฉลองครบ 5 ปีในงาน The 1 Exclusive 5th Anniversary สมาชิก The 1 Exclusive ช้อปรับสิทธิพิเศษเหนือกว่ารอบด้าน ที่ร้านค้าในเครือ เซ็นทรัล รีเทล, ศูนย์การค้าเซ็นทรัล, เซ็นทรัลชิดลม และศูนย์การค้าเซ็นทรัล เอ็มบาสซี',
    NULL, -- No code, auto-apply
    'free_gift', -- Special benefits package
    0,
    '{"coupons": 4300, "mastercard_points": 1000, "central_card_points": 120000, "tier_extension_years": 2, "maldives_trip_lottery": true}',
    0, 1,
    '2026-01-31T00:00:00Z', '2026-02-28T23:59:59Z', 'active',
    100,
    'https://central.co.th/the1-5th-anniversary-banner.jpg',
    'Valid at Central Retail, Central malls, Central Chidlom, and Central Embassy. Registration required on The 1 APP. Credit card terms apply.',
    'ใช้ได้ที่ร้านค้าในเครือ เซ็นทรัล รีเทล, ศูนย์การค้าเซ็นทรัล, เซ็นทรัลชิดลม และศูนย์การค้าเซ็นทรัล เอ็มบาสซี 31 ม.ค. – 28 ก.พ. 69 ลงทะเบียนก่อนช้อปบน The 1 APP *ใช้เท่าที่จำเป็นและชำระคืนได้เต็มจำนวนตามกำหนด จะได้ไม่เสียดอกเบี้ย 16% ต่อปี',
    1,
    '["The 1", "ครบรอบ", "5 ปี", "anniversary", "Central", "เซ็นทรัล", "สมาชิก", "member"]'
);

-- ============================================
-- SEED DATA: Personal Promotions
-- ============================================

-- Gold Tier Retention (High LTV, at-risk)
INSERT OR REPLACE INTO personal_promotions (
    id, name, name_th, description, description_th,
    discount_type, discount_value, benefits_summary,
    target_tiers, target_min_tenure_months,
    trigger_type, trigger_conditions, auto_apply, require_operator_approval,
    usage_limit_per_user, start_date, end_date, status,
    copilot_card_title, copilot_card_title_th,
    copilot_suggestion_script, copilot_suggestion_script_th
) VALUES (
    'personal-gold-retention',
    'Gold Member Retention Offer',
    'สิทธิพิเศษรักษาสมาชิก Gold',
    'Exclusive retention offer for at-risk Gold members with high lifetime value',
    'สิทธิพิเศษสำหรับสมาชิก Gold ที่มีความเสี่ยงยกเลิก เพื่อรักษาฐานลูกค้า',
    'percentage', 15,
    '{"discount_percent": 15, "extra_points": 5000, "free_shipping_6months": true}',
    '["Gold"]', 12,
    'auto_escalation', '{"escalation_type": "cancel_request", "ltv_minimum": 50000}', 1, 0,
    1, '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', 'active',
    'Gold Retention: 15% Off + 5,000 pts',
    'รักษาสมาชิก Gold: ลด 15% + 5,000 คะแนน',
    'As a valued Gold member, I can offer you 15% off today plus 5,000 bonus points. This is exclusive to members like you.',
    'ในฐานะสมาชิก Gold ที่สำคัญของเรา ดิฉันขอเสนอส่วนลด 15% วันนี้ พร้อมรับคะแนนพิเศษ 5,000 คะแนน สิทธิพิเศษนี้มีเฉพาะสมาชิก Gold เท่านั้นค่ะ'
);

-- 5th Year Anniversary (Membership milestone)
INSERT OR REPLACE INTO personal_promotions (
    id, name, name_th, description, description_th,
    discount_type, discount_value, benefits_summary,
    target_tiers, target_account_age_years,
    trigger_type, auto_apply, require_operator_approval,
    usage_limit_per_user, start_date, status,
    copilot_card_title, copilot_card_title_th,
    copilot_suggestion_script, copilot_suggestion_script_th
) VALUES (
    'personal-5year-milestone',
    '5 Year Loyalty Milestone',
    'ฉลองครบรอบ 5 ปีสมาชิก',
    'Special celebration offer for members with 5+ years of loyalty',
    'ข้อเสนอพิเศษฉลองครบรอบสำหรับสมาชิกที่อยู่กับเรามา 5 ปี',
    'fixed_amount', 500,
    '{"discount_amount": 500, "tier_extension_months": 6, "birthday_bonus": true}',
    '["Silver", "Gold", "Platinum"]', 5,
    'auto_anniversary', 0, 1,
    1, '2026-01-01T00:00:00Z', 'active',
    '5-Year Milestone: ฿500 Credit',
    'ครบรอบ 5 ปี: เครดิต 500 บาท',
    'Congratulations on 5 years with us! As a thank you, I have a special ฿500 credit for you, plus I am extending your tier benefits for an extra 6 months.',
    'ขอแสดงความยินดีที่ท่านอยู่กับเรามาครบ 5 ปีค่ะ! เพื่อเป็นการขอบคุณ ดิฉันมีเครดิตพิเศษ 500 บาทให้ท่าน พร้อมต่ออายุสถานะสมาชิกเพิ่มอีก 6 เดือนค่ะ'
);

-- New Member Welcome (0-3 months)
INSERT OR REPLACE INTO personal_promotions (
    id, name, name_th, description, description_th,
    discount_type, discount_value, benefits_summary,
    target_max_tenure_months,
    trigger_type, auto_apply, require_operator_approval,
    usage_limit_per_user, start_date, status,
    copilot_card_title, copilot_card_title_th,
    copilot_suggestion_script, copilot_suggestion_script_th
) VALUES (
    'personal-new-member',
    'New Member Welcome Offer',
    'ต้อนรับสมาชิกใหม่',
    'Welcome offer for new members within first 3 months',
    'ข้อเสนอต้อนรับสำหรับสมาชิกใหม่ใน 3 เดือนแรก',
    'percentage', 20,
    '{"discount_percent": 20, "max_discount": 1000, "welcome_gift": true}',
    3,
    'manual', 0, 0,
    1, '2026-01-01T00:00:00Z', 'active',
    'New Member: 20% Off (Max ฿1,000)',
    'สมาชิกใหม่: ลด 20% (สูงสุด 1,000 บาท)',
    'Welcome to The 1! As a new member, I can offer you 20% off your first purchase, up to ฿1,000 off. Plus a special welcome gift!',
    'ยินดีต้อนรับสู่ The 1 ค่ะ! ในฐานะสมาชิกใหม่ ดิฉันขอเสนอส่วนลด 20% สำหรับการซื้อครั้งแรก สูงสุด 1,000 บาท พร้อมของขวัญต้อนรับพิเศษค่ะ'
);

-- Update personal promotion criteria to match actual persona data
-- Run this SQL to apply the fixes

-- 1. Update Gold Retention Offer to include Platinum and lower LTV requirement
UPDATE personal_promotions 
SET 
  target_tiers = '["Gold", "Platinum"]',
  trigger_conditions = '{"escalation_type": "cancel_request", "ltv_minimum": 8000}',
  updated_at = datetime('now')
WHERE id = 'personal-gold-retention' 
   OR id = 'personal_gold_retention';

-- 2. Update 5-Year Milestone to 4 years (to match personas like Sarah Thompson)
UPDATE personal_promotions 
SET 
  target_account_age_years = 4,
  updated_at = datetime('now')
WHERE id = 'personal-5year-milestone'
   OR id = 'personal_5year_milestone';

-- 3. Also update the tenure-based one (in db.ts seed)
UPDATE personal_promotions 
SET 
  target_min_tenure_months = 48,
  updated_at = datetime('now')
WHERE id = 'personal_5year_milestone';

-- Verify the changes
SELECT 
  id,
  name,
  target_tiers,
  target_min_tenure_months,
  target_account_age_years,
  trigger_conditions
FROM personal_promotions
WHERE status = 'active';

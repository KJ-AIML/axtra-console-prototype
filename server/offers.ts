/**
 * Offers & Rules Service
 * Handles CRUD operations for general and personal promotions
 */

import { db } from './db';
import type { DbClient } from './db';

// ============================================
// TYPES
// ============================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'free_gift' | 'points_bonus' | 'tier_upgrade';
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
  discount_type: DiscountType;
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
// ID GENERATION
// ============================================

function generateId(): string {
  return `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// GENERAL PROMOTIONS
// ============================================

export async function listGeneralPromotions(_userId: string): Promise<GeneralPromotion[]> {
  const result = await db!.execute({
    sql: `
      SELECT * FROM general_promotions
      ORDER BY display_priority DESC, created_at DESC
    `,
    args: [],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    name_th: row.name_th as string | undefined,
    description: row.description as string,
    description_th: row.description_th as string | undefined,
    promo_code: row.promo_code as string | undefined,
    discount_type: row.discount_type as DiscountType,
    discount_value: row.discount_value as number | undefined,
    max_discount_amount: row.max_discount_amount as number | undefined,
    min_order_amount: row.min_order_amount as number,
    usage_limit_total: row.usage_limit_total as number | undefined,
    usage_limit_per_user: row.usage_limit_per_user as number,
    usage_count: row.usage_count as number,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    status: row.status as PromotionStatus,
    display_priority: row.display_priority as number,
    banner_image_url: row.banner_image_url as string | undefined,
    terms_and_conditions: row.terms_and_conditions as string | undefined,
    terms_and_conditions_th: row.terms_and_conditions_th as string | undefined,
    copilot_suggestion_enabled: Boolean(row.copilot_suggestion_enabled),
    copilot_trigger_keywords: row.copilot_trigger_keywords ? JSON.parse(row.copilot_trigger_keywords as string) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

export async function getGeneralPromotionById(_userId: string, id: string): Promise<GeneralPromotion | null> {
  const result = await db!.execute({
    sql: 'SELECT * FROM general_promotions WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    name_th: row.name_th as string | undefined,
    description: row.description as string,
    description_th: row.description_th as string | undefined,
    promo_code: row.promo_code as string | undefined,
    discount_type: row.discount_type as DiscountType,
    discount_value: row.discount_value as number | undefined,
    max_discount_amount: row.max_discount_amount as number | undefined,
    min_order_amount: row.min_order_amount as number,
    usage_limit_total: row.usage_limit_total as number | undefined,
    usage_limit_per_user: row.usage_limit_per_user as number,
    usage_count: row.usage_count as number,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    status: row.status as PromotionStatus,
    display_priority: row.display_priority as number,
    banner_image_url: row.banner_image_url as string | undefined,
    terms_and_conditions: row.terms_and_conditions as string | undefined,
    terms_and_conditions_th: row.terms_and_conditions_th as string | undefined,
    copilot_suggestion_enabled: Boolean(row.copilot_suggestion_enabled),
    copilot_trigger_keywords: row.copilot_trigger_keywords ? JSON.parse(row.copilot_trigger_keywords as string) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createGeneralPromotion(
  userId: string,
  data: Omit<GeneralPromotion, 'id' | 'created_at' | 'updated_at'>
): Promise<GeneralPromotion> {
  const id = generateId();
  const now = new Date().toISOString();

  await db!.execute({
    sql: `
      INSERT INTO general_promotions (
        id, name, name_th, description, description_th, promo_code, discount_type,
        discount_value, max_discount_amount, min_order_amount, usage_limit_total,
        usage_limit_per_user, start_date, end_date, status, display_priority,
        banner_image_url, terms_and_conditions, terms_and_conditions_th,
        copilot_suggestion_enabled, copilot_trigger_keywords, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.name,
      data.name_th || null,
      data.description,
      data.description_th || null,
      data.promo_code || null,
      data.discount_type,
      data.discount_value || null,
      data.max_discount_amount || null,
      data.min_order_amount,
      data.usage_limit_total || null,
      data.usage_limit_per_user,
      data.start_date,
      data.end_date,
      data.status,
      data.display_priority,
      data.banner_image_url || null,
      data.terms_and_conditions || null,
      data.terms_and_conditions_th || null,
      data.copilot_suggestion_enabled ? 1 : 0,
      data.copilot_trigger_keywords ? JSON.stringify(data.copilot_trigger_keywords) : null,
      now,
      now,
    ],
  });

  const created = await getGeneralPromotionById(userId, id);
  if (!created) throw new Error('Failed to create promotion');
  return created;
}

export async function updateGeneralPromotion(
  userId: string,
  id: string,
  data: Partial<Omit<GeneralPromotion, 'id' | 'created_at'>>
): Promise<GeneralPromotion> {
  const now = new Date().toISOString();
  
  // Build dynamic update query
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.name_th !== undefined) { fields.push('name_th = ?'); values.push(data.name_th); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.description_th !== undefined) { fields.push('description_th = ?'); values.push(data.description_th); }
  if (data.promo_code !== undefined) { fields.push('promo_code = ?'); values.push(data.promo_code); }
  if (data.discount_type !== undefined) { fields.push('discount_type = ?'); values.push(data.discount_type); }
  if (data.discount_value !== undefined) { fields.push('discount_value = ?'); values.push(data.discount_value); }
  if (data.max_discount_amount !== undefined) { fields.push('max_discount_amount = ?'); values.push(data.max_discount_amount); }
  if (data.min_order_amount !== undefined) { fields.push('min_order_amount = ?'); values.push(data.min_order_amount); }
  if (data.usage_limit_total !== undefined) { fields.push('usage_limit_total = ?'); values.push(data.usage_limit_total); }
  if (data.usage_limit_per_user !== undefined) { fields.push('usage_limit_per_user = ?'); values.push(data.usage_limit_per_user); }
  if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.display_priority !== undefined) { fields.push('display_priority = ?'); values.push(data.display_priority); }
  if (data.banner_image_url !== undefined) { fields.push('banner_image_url = ?'); values.push(data.banner_image_url); }
  if (data.terms_and_conditions !== undefined) { fields.push('terms_and_conditions = ?'); values.push(data.terms_and_conditions); }
  if (data.terms_and_conditions_th !== undefined) { fields.push('terms_and_conditions_th = ?'); values.push(data.terms_and_conditions_th); }
  if (data.copilot_suggestion_enabled !== undefined) { fields.push('copilot_suggestion_enabled = ?'); values.push(data.copilot_suggestion_enabled ? 1 : 0); }
  if (data.copilot_trigger_keywords !== undefined) { fields.push('copilot_trigger_keywords = ?'); values.push(JSON.stringify(data.copilot_trigger_keywords)); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db!.execute({
    sql: `UPDATE general_promotions SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });

  const updated = await getGeneralPromotionById(userId, id);
  if (!updated) throw new Error('Failed to update promotion');
  return updated;
}

export async function deleteGeneralPromotion(_userId: string, id: string): Promise<void> {
  await db!.execute({
    sql: 'DELETE FROM general_promotions WHERE id = ?',
    args: [id],
  });
}

// ============================================
// PERSONAL PROMOTIONS
// ============================================

export async function listPersonalPromotions(_userId: string): Promise<PersonalPromotion[]> {
  const result = await db!.execute({
    sql: `
      SELECT * FROM personal_promotions
      ORDER BY display_priority DESC, created_at DESC
    `,
    args: [],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    name_th: row.name_th as string | undefined,
    description: row.description as string,
    description_th: row.description_th as string | undefined,
    discount_type: row.discount_type as DiscountType,
    discount_value: row.discount_value as number | undefined,
    max_discount_amount: row.max_discount_amount as number | undefined,
    benefits_summary: row.benefits_summary ? JSON.parse(row.benefits_summary as string) : undefined,
    target_tiers: row.target_tiers ? JSON.parse(row.target_tiers as string) : undefined,
    target_min_tenure_months: row.target_min_tenure_months as number | undefined,
    target_max_tenure_months: row.target_max_tenure_months as number | undefined,
    target_account_age_years: row.target_account_age_years as number | undefined,
    trigger_type: row.trigger_type as TriggerType,
    trigger_conditions: row.trigger_conditions ? JSON.parse(row.trigger_conditions as string) : undefined,
    auto_apply: Boolean(row.auto_apply),
    require_operator_approval: Boolean(row.require_operator_approval),
    usage_limit_total: row.usage_limit_total as number | undefined,
    usage_limit_per_user: row.usage_limit_per_user as number,
    usage_count: row.usage_count as number,
    start_date: row.start_date as string,
    end_date: row.end_date as string | undefined,
    status: row.status as PromotionStatus,
    display_priority: row.display_priority as number,
    notification_message: row.notification_message as string | undefined,
    notification_message_th: row.notification_message_th as string | undefined,
    copilot_card_title: row.copilot_card_title as string | undefined,
    copilot_card_title_th: row.copilot_card_title_th as string | undefined,
    copilot_suggestion_script: row.copilot_suggestion_script as string | undefined,
    copilot_suggestion_script_th: row.copilot_suggestion_script_th as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

export async function getPersonalPromotionById(_userId: string, id: string): Promise<PersonalPromotion | null> {
  const result = await db!.execute({
    sql: 'SELECT * FROM personal_promotions WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    name: row.name as string,
    name_th: row.name_th as string | undefined,
    description: row.description as string,
    description_th: row.description_th as string | undefined,
    discount_type: row.discount_type as DiscountType,
    discount_value: row.discount_value as number | undefined,
    max_discount_amount: row.max_discount_amount as number | undefined,
    benefits_summary: row.benefits_summary ? JSON.parse(row.benefits_summary as string) : undefined,
    target_tiers: row.target_tiers ? JSON.parse(row.target_tiers as string) : undefined,
    target_min_tenure_months: row.target_min_tenure_months as number | undefined,
    target_max_tenure_months: row.target_max_tenure_months as number | undefined,
    target_account_age_years: row.target_account_age_years as number | undefined,
    trigger_type: row.trigger_type as TriggerType,
    trigger_conditions: row.trigger_conditions ? JSON.parse(row.trigger_conditions as string) : undefined,
    auto_apply: Boolean(row.auto_apply),
    require_operator_approval: Boolean(row.require_operator_approval),
    usage_limit_total: row.usage_limit_total as number | undefined,
    usage_limit_per_user: row.usage_limit_per_user as number,
    usage_count: row.usage_count as number,
    start_date: row.start_date as string,
    end_date: row.end_date as string | undefined,
    status: row.status as PromotionStatus,
    display_priority: row.display_priority as number,
    notification_message: row.notification_message as string | undefined,
    notification_message_th: row.notification_message_th as string | undefined,
    copilot_card_title: row.copilot_card_title as string | undefined,
    copilot_card_title_th: row.copilot_card_title_th as string | undefined,
    copilot_suggestion_script: row.copilot_suggestion_script as string | undefined,
    copilot_suggestion_script_th: row.copilot_suggestion_script_th as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createPersonalPromotion(
  userId: string,
  data: Omit<PersonalPromotion, 'id' | 'created_at' | 'updated_at'>
): Promise<PersonalPromotion> {
  const id = generateId();
  const now = new Date().toISOString();

  await db!.execute({
    sql: `
      INSERT INTO personal_promotions (
        id, name, name_th, description, description_th, discount_type, discount_value,
        max_discount_amount, benefits_summary, target_tiers, target_min_tenure_months,
        target_max_tenure_months, target_account_age_years, trigger_type, trigger_conditions,
        auto_apply, require_operator_approval, usage_limit_total, usage_limit_per_user,
        start_date, end_date, status, display_priority, notification_message, notification_message_th,
        copilot_card_title, copilot_card_title_th, copilot_suggestion_script, copilot_suggestion_script_th,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.name,
      data.name_th || null,
      data.description,
      data.description_th || null,
      data.discount_type,
      data.discount_value || null,
      data.max_discount_amount || null,
      data.benefits_summary ? JSON.stringify(data.benefits_summary) : null,
      data.target_tiers ? JSON.stringify(data.target_tiers) : null,
      data.target_min_tenure_months || null,
      data.target_max_tenure_months || null,
      data.target_account_age_years || null,
      data.trigger_type,
      data.trigger_conditions ? JSON.stringify(data.trigger_conditions) : null,
      data.auto_apply ? 1 : 0,
      data.require_operator_approval ? 1 : 0,
      data.usage_limit_total || null,
      data.usage_limit_per_user,
      data.start_date,
      data.end_date || null,
      data.status,
      data.display_priority,
      data.notification_message || null,
      data.notification_message_th || null,
      data.copilot_card_title || null,
      data.copilot_card_title_th || null,
      data.copilot_suggestion_script || null,
      data.copilot_suggestion_script_th || null,
      now,
      now,
    ],
  });

  const created = await getPersonalPromotionById(userId, id);
  if (!created) throw new Error('Failed to create promotion');
  return created;
}

export async function updatePersonalPromotion(
  userId: string,
  id: string,
  data: Partial<Omit<PersonalPromotion, 'id' | 'created_at'>>
): Promise<PersonalPromotion> {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: (string | number | null | string[])[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.name_th !== undefined) { fields.push('name_th = ?'); values.push(data.name_th); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.description_th !== undefined) { fields.push('description_th = ?'); values.push(data.description_th); }
  if (data.discount_type !== undefined) { fields.push('discount_type = ?'); values.push(data.discount_type); }
  if (data.discount_value !== undefined) { fields.push('discount_value = ?'); values.push(data.discount_value); }
  if (data.max_discount_amount !== undefined) { fields.push('max_discount_amount = ?'); values.push(data.max_discount_amount); }
  if (data.benefits_summary !== undefined) { fields.push('benefits_summary = ?'); values.push(JSON.stringify(data.benefits_summary)); }
  if (data.target_tiers !== undefined) { fields.push('target_tiers = ?'); values.push(JSON.stringify(data.target_tiers)); }
  if (data.target_min_tenure_months !== undefined) { fields.push('target_min_tenure_months = ?'); values.push(data.target_min_tenure_months); }
  if (data.target_max_tenure_months !== undefined) { fields.push('target_max_tenure_months = ?'); values.push(data.target_max_tenure_months); }
  if (data.target_account_age_years !== undefined) { fields.push('target_account_age_years = ?'); values.push(data.target_account_age_years); }
  if (data.trigger_type !== undefined) { fields.push('trigger_type = ?'); values.push(data.trigger_type); }
  if (data.trigger_conditions !== undefined) { fields.push('trigger_conditions = ?'); values.push(JSON.stringify(data.trigger_conditions)); }
  if (data.auto_apply !== undefined) { fields.push('auto_apply = ?'); values.push(data.auto_apply ? 1 : 0); }
  if (data.require_operator_approval !== undefined) { fields.push('require_operator_approval = ?'); values.push(data.require_operator_approval ? 1 : 0); }
  if (data.usage_limit_total !== undefined) { fields.push('usage_limit_total = ?'); values.push(data.usage_limit_total); }
  if (data.usage_limit_per_user !== undefined) { fields.push('usage_limit_per_user = ?'); values.push(data.usage_limit_per_user); }
  if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.display_priority !== undefined) { fields.push('display_priority = ?'); values.push(data.display_priority); }
  if (data.notification_message !== undefined) { fields.push('notification_message = ?'); values.push(data.notification_message); }
  if (data.notification_message_th !== undefined) { fields.push('notification_message_th = ?'); values.push(data.notification_message_th); }
  if (data.copilot_card_title !== undefined) { fields.push('copilot_card_title = ?'); values.push(data.copilot_card_title); }
  if (data.copilot_card_title_th !== undefined) { fields.push('copilot_card_title_th = ?'); values.push(data.copilot_card_title_th); }
  if (data.copilot_suggestion_script !== undefined) { fields.push('copilot_suggestion_script = ?'); values.push(data.copilot_suggestion_script); }
  if (data.copilot_suggestion_script_th !== undefined) { fields.push('copilot_suggestion_script_th = ?'); values.push(data.copilot_suggestion_script_th); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db!.execute({
    sql: `UPDATE personal_promotions SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });

  const updated = await getPersonalPromotionById(userId, id);
  if (!updated) throw new Error('Failed to update promotion');
  return updated;
}

export async function deletePersonalPromotion(_userId: string, id: string): Promise<void> {
  await db!.execute({
    sql: 'DELETE FROM personal_promotions WHERE id = ?',
    args: [id],
  });
}

// ============================================
// STATS
// ============================================

export interface OfferStats {
  totalGeneralPromotions: number;
  activeGeneralPromotions: number;
  totalPersonalPromotions: number;
  activePersonalPromotions: number;
  totalUsageCount: number;
  promotionsByType: Record<string, number>;
}

export async function getOfferStats(_userId: string): Promise<OfferStats> {
  const [generalResult, personalResult, usageResult] = await Promise.all([
    db!.execute({ sql: 'SELECT status, COUNT(*) as count FROM general_promotions GROUP BY status', args: [] }),
    db!.execute({ sql: 'SELECT status, COUNT(*) as count FROM personal_promotions GROUP BY status', args: [] }),
    db!.execute({ sql: 'SELECT SUM(usage_count) as total FROM general_promotions', args: [] }),
    db!.execute({ sql: 'SELECT discount_type, COUNT(*) as count FROM general_promotions GROUP BY discount_type', args: [] }),
    db!.execute({ sql: 'SELECT discount_type, COUNT(*) as count FROM personal_promotions GROUP BY discount_type', args: [] }),
  ]);

  // Note: Actually we need to fix the Promise.all above - it has 5 items but only 3 variables
  // Let me restructure this properly
  const generalStatusResult = await db!.execute({ sql: 'SELECT status, COUNT(*) as count FROM general_promotions GROUP BY status', args: [] });
  const personalStatusResult = await db!.execute({ sql: 'SELECT status, COUNT(*) as count FROM personal_promotions GROUP BY status', args: [] });
  const generalUsageResult = await db!.execute({ sql: 'SELECT SUM(usage_count) as total FROM general_promotions', args: [] });
  const personalUsageResult = await db!.execute({ sql: 'SELECT SUM(usage_count) as total FROM personal_promotions', args: [] });
  const generalTypeResult = await db!.execute({ sql: 'SELECT discount_type, COUNT(*) as count FROM general_promotions GROUP BY discount_type', args: [] });
  const personalTypeResult = await db!.execute({ sql: 'SELECT discount_type, COUNT(*) as count FROM personal_promotions GROUP BY discount_type', args: [] });

  const totalGeneralPromotions = generalStatusResult.rows.reduce((sum, row) => sum + (row.count as number), 0);
  const activeGeneralPromotions = generalStatusResult.rows
    .filter(row => row.status === 'active')
    .reduce((sum, row) => sum + (row.count as number), 0);

  const totalPersonalPromotions = personalStatusResult.rows.reduce((sum, row) => sum + (row.count as number), 0);
  const activePersonalPromotions = personalStatusResult.rows
    .filter(row => row.status === 'active')
    .reduce((sum, row) => sum + (row.count as number), 0);

  const generalUsage = (generalUsageResult.rows[0]?.total as number) || 0;
  const personalUsage = (personalUsageResult.rows[0]?.total as number) || 0;

  const promotionsByType: Record<string, number> = {};
  generalTypeResult.rows.forEach(row => {
    promotionsByType[row.discount_type as string] = (promotionsByType[row.discount_type as string] || 0) + (row.count as number);
  });
  personalTypeResult.rows.forEach(row => {
    promotionsByType[row.discount_type as string] = (promotionsByType[row.discount_type as string] || 0) + (row.count as number);
  });

  return {
    totalGeneralPromotions,
    activeGeneralPromotions,
    totalPersonalPromotions,
    activePersonalPromotions,
    totalUsageCount: generalUsage + personalUsage,
    promotionsByType,
  };
}

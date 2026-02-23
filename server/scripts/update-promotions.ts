/**
 * Script to update personal promotion criteria to match persona data
 * Run: npx tsx server/scripts/update-promotions.ts
 */

import { db } from '../db';

async function updatePromotions() {
  console.log('🔄 Updating personal promotion criteria...\n');

  try {
    // 1. Update Gold Retention Offer
    console.log('1️⃣ Updating Gold Retention Offer...');
    const goldResult = await db!.execute({
      sql: `
        UPDATE personal_promotions 
        SET 
          target_tiers = ?,
          trigger_conditions = ?,
          updated_at = datetime('now')
        WHERE id IN ('personal-gold-retention', 'personal_gold_retention')
      `,
      args: [
        JSON.stringify(['Gold', 'Platinum']),
        JSON.stringify({ escalation_type: 'cancel_request', ltv_minimum: 8000 })
      ]
    });
    console.log(`   ✓ Rows affected: ${goldResult.rowsAffected}`);

    // 2. Update 5-Year Milestone
    console.log('2️⃣ Updating 5-Year Milestone...');
    const milestoneResult = await db!.execute({
      sql: `
        UPDATE personal_promotions 
        SET 
          target_account_age_years = ?,
          target_min_tenure_months = ?,
          updated_at = datetime('now')
        WHERE id IN ('personal-5year-milestone', 'personal_5year_milestone')
      `,
      args: [4, 48]  // 4 years = 48 months
    });
    console.log(`   ✓ Rows affected: ${milestoneResult.rowsAffected}`);

    // 3. Verify changes
    console.log('\n3️⃣ Verifying updated promotions:\n');
    const verifyResult = await db!.execute({
      sql: `
        SELECT 
          id,
          name,
          target_tiers,
          target_min_tenure_months,
          target_account_age_years,
          trigger_conditions
        FROM personal_promotions
        WHERE status = 'active'
      `,
      args: []
    });

    console.log('   ┌────────────────────────────────────────────────────────────┐');
    for (const row of verifyResult.rows) {
      console.log(`   │ ${row.name}`);
      console.log(`   │   ID: ${row.id}`);
      console.log(`   │   Target Tiers: ${row.target_tiers}`);
      console.log(`   │   Min Tenure: ${row.target_min_tenure_months} months`);
      console.log(`   │   Account Age: ${row.target_account_age_years} years`);
      console.log(`   │   Trigger: ${row.trigger_conditions}`);
      console.log('   ├────────────────────────────────────────────────────────────┤');
    }
    console.log('   └────────────────────────────────────────────────────────────┘');

    console.log('\n✅ Promotions updated successfully!');
    console.log('\nExpected matches now:');
    console.log('  • Sarah Thompson (Gold, 6yr, LTV 1,800) → Gold Retention + 5-Year Milestone');
    console.log('  • Lisa Wong (Gold, 4yr, LTV 1,800) → Gold Retention + 5-Year Milestone');
    console.log('  • James Wilson (Gold, 5yr, LTV 1,800) → Gold Retention + 5-Year Milestone');
    console.log('  • David Park (Platinum, 7yr, LTV 3,600) → Gold Retention + 5-Year Milestone');
    console.log('  • Alexandra Sterling (Platinum, 8yr, LTV 6,000) → Gold Retention + 5-Year Milestone');
    console.log('  • Robert Chen (Silver, 3yr) → 5-Year Milestone only');

  } catch (error) {
    console.error('❌ Error updating promotions:', error);
    process.exit(1);
  }
}

updatePromotions();

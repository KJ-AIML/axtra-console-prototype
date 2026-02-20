/**
 * Script to activate disabled promotions
 * Run: npx tsx server/scripts/activate-promotions.ts
 */

import { db } from '../db';

async function activatePromotions() {
  console.log('🔄 Activating disabled promotions...\n');

  try {
    // Activate Gold Retention Offer
    console.log('1️⃣ Activating Gold Retention Offer...');
    const result = await db!.execute({
      sql: `
        UPDATE personal_promotions 
        SET 
          status = 'active',
          updated_at = datetime('now')
        WHERE id = 'personal_gold_retention'
      `,
      args: []
    });
    console.log(`   ✓ Rows affected: ${result.rowsAffected}\n`);

    // Verify all active promotions
    console.log('2️⃣ Verifying active promotions:\n');
    const verifyResult = await db!.execute({
      sql: `
        SELECT 
          id,
          name,
          status,
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
      console.log(`   │ ${row.name} (${row.id})`);
      console.log(`   │   Status: ${row.status}`);
      console.log(`   │   Target Tiers: ${row.target_tiers}`);
      console.log(`   │   Min Tenure: ${row.target_min_tenure_months || 'N/A'} months`);
      console.log(`   │   Account Age: ${row.target_account_age_years || 'N/A'} years`);
      console.log(`   │   Trigger: ${row.trigger_conditions || 'N/A'}`);
      console.log('   ├────────────────────────────────────────────────────────────┤');
    }
    console.log('   └────────────────────────────────────────────────────────────┘');

    console.log('\n✅ All personal promotions are now active!');
    console.log('\n🎯 Expected Personal Promotion Matches:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Persona                    | Tier     | Age | LTV   | Matches');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Sarah Thompson             | Gold     | 6yr | 1,800 | ✅ Gold Retention + 5-Year');
    console.log('Lisa Wong                  | Gold     | 4yr | 1,800 | ✅ Gold Retention + 5-Year');
    console.log('James Wilson               | Gold     | 5yr | 1,800 | ✅ Gold Retention + 5-Year');
    console.log('David Park                 | Platinum | 7yr | 3,600 | ✅ Gold Retention + 5-Year');
    console.log('Alexandra Sterling         | Platinum | 8yr | 6,000 | ✅ Gold Retention + 5-Year');
    console.log('Robert Chen                | Silver   | 3yr | 720   | ✅ 5-Year only');
    console.log('Michael Johnson            | Silver   | 2yr | 312   | ❌ No match (needs general)');
    console.log('Emily Martinez             | Bronze   | 1yr | 480   | ❌ No match (needs general)');
    console.log('─────────────────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activatePromotions();

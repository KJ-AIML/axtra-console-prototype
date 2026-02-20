import { db } from '../db';

async function check() {
  const result = await db!.execute('SELECT id, name, status, target_tiers FROM personal_promotions');
  console.log('\n📋 All Personal Promotions:');
  console.log('┌────────────────────────────────────────────────────────────────────┐');
  result.rows.forEach((r: any) => {
    console.log(`│ ${r.id}`);
    console.log(`│   Name: ${r.name}`);
    console.log(`│   Status: ${r.status}`);
    console.log(`│   Target Tiers: ${r.target_tiers}`);
    console.log('├────────────────────────────────────────────────────────────────────┤');
  });
  console.log('└────────────────────────────────────────────────────────────────────┘');
}

check();

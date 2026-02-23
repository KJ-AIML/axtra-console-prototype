import { db } from '../db';

async function check() {
  console.log('Checking QA criteria...\n');
  
  // Check if qa_criteria table exists
  const tableCheck = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='qa_criteria'"
  );
  console.log('qa_criteria table exists:', tableCheck.rows.length > 0);
  
  // Check if qa_config_weights table exists
  const weightsTableCheck = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='qa_config_weights'"
  );
  console.log('qa_config_weights table exists:', weightsTableCheck.rows.length > 0);
  
  // Get criteria count
  const countResult = await db.execute(
    'SELECT COUNT(*) as count FROM qa_criteria WHERE config_id = \'default\''
  );
  console.log('Criteria count:', countResult.rows[0]?.count);
  
  // Get actual criteria
  const criteriaResult = await db.execute(
    'SELECT id, name, parent_criteria_id FROM qa_criteria WHERE config_id = \'default\' AND COALESCE(is_active, 1) = 1'
  );
  console.log('\nCriteria:');
  criteriaResult.rows.forEach((row: any) => {
    console.log(`  - ${row.id}: ${row.name} (parent: ${row.parent_criteria_id || 'none'})`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

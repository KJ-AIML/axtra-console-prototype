import { db } from '../db';

async function check() {
  console.log('Checking all QA criteria...\n');
  
  // Get all criteria including inactive
  const criteriaResult = await db.execute(
    'SELECT * FROM qa_criteria'
  );
  console.log('Total criteria rows:', criteriaResult.rows.length);
  console.log('\nAll criteria:');
  criteriaResult.rows.forEach((row: any, i: number) => {
    console.log(`  ${i + 1}. id=${row.id}, name=${row.name}, config=${row.config_id}, active=${row.is_active}`);
  });
  
  // Check for null ids
  const nullIdResult = await db.execute(
    'SELECT * FROM qa_criteria WHERE id IS NULL'
  );
  console.log('\nCriteria with NULL id:', nullIdResult.rows.length);
  nullIdResult.rows.forEach((row: any, i: number) => {
    console.log(`  ${i + 1}.`, row);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

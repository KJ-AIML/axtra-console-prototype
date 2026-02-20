import { getQACriteria, autoDistributeWeights } from '../qa-review';

async function debug() {
  console.log('=== DEBUGGING AUTO-DISTRIBUTE ===\n');
  
  const criteria = await getQACriteria();
  console.log('Criteria returned by getQACriteria:', criteria.length);
  
  criteria.forEach((c, i) => {
    console.log(`  ${i + 1}. id="${c.id}" name="${c.name}" parent="${c.parent_criteria_id || 'none'}"`);
  });
  
  const mainCriteria = criteria.filter(c => !c.parent_criteria_id);
  console.log('\nMain criteria:', mainCriteria.length);
  mainCriteria.forEach((c, i) => {
    console.log(`  ${i + 1}. id="${c.id}" name="${c.name}"`);
  });
  
  // Try auto-distribute
  console.log('\n=== ATTEMPTING AUTO-DISTRIBUTE ===');
  try {
    await autoDistributeWeights('default');
    console.log('SUCCESS!');
  } catch (err: any) {
    console.error('ERROR:', err.message);
  }
  
  process.exit(0);
}

debug().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

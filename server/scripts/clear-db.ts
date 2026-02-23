import { db } from '../db';

async function clearAllCriteria() {
  try {
    console.log('Deleting all QA criteria data...\n');
    
    // Delete in correct order (children first, then parents)
    await db.execute('DELETE FROM qa_review_scores');
    console.log('✓ qa_review_scores cleared');
    
    await db.execute('DELETE FROM qa_reviews');
    console.log('✓ qa_reviews cleared');
    
    await db.execute('DELETE FROM qa_criteria_nodes');
    console.log('✓ qa_criteria_nodes cleared');
    
    await db.execute('DELETE FROM qa_config_versions');
    console.log('✓ qa_config_versions cleared');
    
    await db.execute('DELETE FROM qa_configs');
    console.log('✓ qa_configs cleared');
    
    // Also clean legacy tables
    await db.execute('DELETE FROM qa_config_weights');
    console.log('✓ qa_config_weights cleared');
    
    await db.execute('DELETE FROM ai_qa_criteria_scores');
    console.log('✓ ai_qa_criteria_scores cleared');
    
    await db.execute('DELETE FROM ai_qa_results');
    console.log('✓ ai_qa_results cleared');
    
    await db.execute('DELETE FROM human_qa_criteria_scores');
    console.log('✓ human_qa_criteria_scores cleared');
    
    await db.execute('DELETE FROM human_qa_comments');
    console.log('✓ human_qa_comments cleared');
    
    await db.execute('DELETE FROM human_qa_reviews');
    console.log('✓ human_qa_reviews cleared');
    
    await db.execute('DELETE FROM qa_criteria');
    console.log('✓ qa_criteria cleared');
    
    console.log('\n✅ All QA criteria data cleared successfully!');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

clearAllCriteria();

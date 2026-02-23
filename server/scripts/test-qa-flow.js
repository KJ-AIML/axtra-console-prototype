/**
 * Test script for QA Criteria V2 flow
 * Run: node server/scripts/test-qa-flow.js
 */

const API_BASE = 'http://localhost:3001/api';

async function login() {
  console.log('1. Logging in...');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@axtra.local', password: 'admin123' }),
  });
  const data = await res.json();
  if (!data.token) {
    throw new Error('Login failed: ' + JSON.stringify(data));
  }
  console.log('   ✓ Logged in\n');
  return data.token;
}

async function getCriteria(token) {
  console.log('2. Getting current criteria...');
  const res = await fetch(`${API_BASE}/qa/criteria`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  console.log('   Response status:', res.status);
  console.log('   Current criteria count:', data.data?.length || 0);
  if (data.data?.length > 0) {
    console.log('   First criteria:', JSON.stringify(data.data[0], null, 2).substring(0, 300));
  }
  console.log();
  return data;
}

async function saveCriteriaBulk(token, criteria, removedIds = []) {
  console.log('3. Saving criteria bulk...');
  console.log('   Sending', criteria.length, 'criteria');
  console.log('   Criteria IDs:', criteria.map(c => c.id));
  
  const res = await fetch(`${API_BASE}/qa/criteria/bulk`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ criteria, removed_ids: removedIds }),
  });
  
  const data = await res.json();
  console.log('   Response status:', res.status);
  console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 500));
  console.log();
  return { status: res.status, data };
}

async function runTest() {
  console.log('=== QA Criteria V2 Flow Test ===\n');
  
  try {
    const token = await login();
    
    // Check current state
    const current = await getCriteria(token);
    
    // Test 1: Create first criteria
    console.log('--- Test 1: Create first criteria ---');
    const newCriteria = {
      id: `qc_test_${Date.now()}`,
      name: 'Test Criteria',
      description: 'Test description',
      ai_prompt: 'Test AI prompt for evaluation',
      scoring_type: 'scale',
      max_score: 5,
      weight: 0,
      is_required: true,
      sort_order: 0,
    };
    
    const saveResult = await saveCriteriaBulk(token, [newCriteria]);
    
    if (saveResult.status !== 200) {
      console.error('❌ FAILED to save first criteria');
      process.exit(1);
    }
    console.log('✅ First criteria saved successfully\n');
    
    // Verify it was saved
    console.log('--- Test 2: Verify saved criteria ---');
    const updated = await getCriteria(token);
    
    if (updated.data?.length === 0) {
      console.error('❌ FAILED: No criteria found after save');
      process.exit(1);
    }
    console.log('✅ Criteria verified\n');
    
    // Test 3: Create multiple criteria
    console.log('--- Test 3: Create multiple criteria ---');
    const criteria2 = {
      id: `qc_test2_${Date.now()}`,
      name: 'Second Criteria',
      description: 'Second test',
      ai_prompt: 'Second AI prompt',
      scoring_type: 'binary',
      max_score: 1,
      weight: 0,
      is_required: false,
      sort_order: 1,
    };
    
    const multiResult = await saveCriteriaBulk(token, updated.data.concat(criteria2));
    
    if (multiResult.status !== 200) {
      console.error('❌ FAILED to save multiple criteria');
      process.exit(1);
    }
    console.log('✅ Multiple criteria saved\n');
    
    console.log('=== All tests passed! ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();

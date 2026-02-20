/**
 * Script to clear all QA criteria
 * Run: node server/scripts/clear-all-criteria.js
 */

const API_BASE = 'http://localhost:3001/api';

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@axtra.local', password: 'admin123' }),
  });
  const data = await res.json();
  return data.data.token;
}

async function getAllCriteria(token) {
  const res = await fetch(`${API_BASE}/qa/criteria`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  return data.data || [];
}

async function deleteCriteriaBulk(token, ids) {
  const res = await fetch(`${API_BASE}/qa/criteria/bulk`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      criteria: [],
      removed_ids: ids
    }),
  });
  return res.json();
}

async function clearAll() {
  console.log('=== Clearing All QA Criteria ===\n');
  
  try {
    const token = await login();
    console.log('✓ Logged in');
    
    const criteria = await getAllCriteria(token);
    console.log(`Found ${criteria.length} criteria`);
    
    if (criteria.length === 0) {
      console.log('No criteria to delete. Database is already clean!');
      return;
    }
    
    const ids = criteria.map(c => c.id);
    console.log('IDs to delete:', ids.join(', '));
    
    // Delete in batches
    const result = await deleteCriteriaBulk(token, ids);
    console.log('\nResult:', result);
    
    // Verify
    const remaining = await getAllCriteria(token);
    console.log(`\nRemaining criteria: ${remaining.length}`);
    
    if (remaining.length === 0) {
      console.log('\n✅ All QA criteria cleared successfully!');
    } else {
      console.log('\n⚠️ Some criteria remain:', remaining.map(c => c.name).join(', '));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

clearAll();

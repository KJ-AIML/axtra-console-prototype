import { db } from './db';

async function checkDbRecordings() {
  // Check call_sessions table
  const result = await db.execute({
    sql: 'SELECT id, status, started_at, operator_track_url, agent_track_url FROM call_sessions ORDER BY started_at DESC',
    args: [],
  });

  console.log('Call Sessions in Database:');
  console.log('Total:', result.rows.length);
  console.log('');

  result.rows.forEach((row, i) => {
    console.log(`#${i + 1}: ${row.id}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Started: ${row.started_at}`);
    console.log(`   Has operator_track: ${row.operator_track_url ? 'YES' : 'NO'}`);
    console.log(`   Has agent_track: ${row.agent_track_url ? 'YES' : 'NO'}`);
    console.log('');
  });
}

checkDbRecordings();

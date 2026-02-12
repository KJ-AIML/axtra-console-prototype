/**
 * Delete ALL Recording Data from Database
 * This removes all call sessions, transcripts, coaching data, and summaries
 */

import { db } from './db';

async function deleteAllRecordings() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         DELETE ALL RECORDINGS FROM DATABASE                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // First, let's count what we have
  console.log('📊 Current database state:');
  
  const counts = await db.execute({
    sql: `
      SELECT 
        (SELECT COUNT(*) FROM call_sessions) as sessions,
        (SELECT COUNT(*) FROM call_transcripts) as transcripts,
        (SELECT COUNT(*) FROM call_coaching) as coaching,
        (SELECT COUNT(*) FROM call_summaries) as summaries,
        (SELECT COUNT(*) FROM qa_scores) as qa_scores
    `,
    args: [],
  });

  const row = counts.rows[0];
  console.log(`  Call Sessions: ${row.sessions}`);
  console.log(`  Transcripts: ${row.transcripts}`);
  console.log(`  Coaching Records: ${row.coaching}`);
  console.log(`  Summaries: ${row.summaries}`);
  console.log(`  QA Scores: ${row.qa_scores}`);
  console.log('');

  if (Number(row.sessions) === 0) {
    console.log('✅ No recordings found in database.');
    return;
  }

  // Get all call session IDs
  const sessionsResult = await db.execute({
    sql: 'SELECT id FROM call_sessions',
    args: [],
  });

  const sessionIds = sessionsResult.rows.map(r => r.id as string);
  console.log(`Found ${sessionIds.length} call sessions to delete\n`);

  console.log('⚠️  WARNING: This will permanently delete:');
  console.log('  - All call sessions');
  console.log('  - All transcripts');
  console.log('  - All coaching history');
  console.log('  - All call summaries');
  console.log('  - All QA scores\n');

  console.log('Proceeding with deletion in 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  let deletedSessions = 0;
  let errors: string[] = [];

  // Delete related data for each session
  for (const id of sessionIds) {
    try {
      // Delete in order (child tables first)
      await db.execute({ sql: 'DELETE FROM call_transcripts WHERE call_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM call_coaching WHERE call_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM call_summaries WHERE call_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM qa_scores WHERE call_id = ?', args: [id] });
      
      // Finally delete the session
      await db.execute({ sql: 'DELETE FROM call_sessions WHERE id = ?', args: [id] });
      
      deletedSessions++;
      process.stdout.write(`\rDeleted: ${deletedSessions}/${sessionIds.length}`);
    } catch (e: any) {
      errors.push(`Failed to delete ${id}: ${e.message}`);
    }
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('DELETION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`Sessions deleted: ${deletedSessions}/${sessionIds.length}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Verify
  const verifyResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM call_sessions',
    args: [],
  });

  console.log(`\nRemaining call sessions: ${verifyResult.rows[0].count}`);
  console.log('\n✅ All recordings deleted from database!');
}

deleteAllRecordings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

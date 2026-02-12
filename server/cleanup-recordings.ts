/**
 * Cleanup Recordings Script
 * Deletes all recording data from database and R2 storage
 */

import { db } from './db';
import { getEnv } from './config';

// R2 configuration
const R2_ENDPOINT = getEnv('EGRESS_S3_ENDPOINT', '');
const R2_BUCKET = getEnv('EGRESS_S3_BUCKET', '');
const R2_ACCESS_KEY = getEnv('EGRESS_S3_ACCESS_KEY', '');
const R2_SECRET_KEY = getEnv('EGRESS_S3_SECRET_KEY', '');

/**
 * Delete all recordings from database
 */
async function deleteAllRecordingsFromDB(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Get all recording IDs (call_sessions with recording data)
    const result = await db.execute({
      sql: `SELECT id FROM call_sessions WHERE operator_track_url IS NOT NULL OR agent_track_url IS NOT NULL`,
      args: [],
    });

    const ids = result.rows.map((r: any) => r.id as string);
    console.log(`Found ${ids.length} recordings to delete from database`);

    for (const id of ids) {
      try {
        // Delete related data
        await db.execute({ sql: 'DELETE FROM call_transcripts WHERE call_id = ?', args: [id] });
        await db.execute({ sql: 'DELETE FROM call_coaching WHERE call_id = ?', args: [id] });
        await db.execute({ sql: 'DELETE FROM call_summaries WHERE call_id = ?', args: [id] });
        
        // Update call_session to clear recording data
        await db.execute({
          sql: `
            UPDATE call_sessions 
            SET recording_status = 'none',
                operator_egress_id = NULL,
                agent_egress_id = NULL,
                operator_track_url = NULL,
                agent_track_url = NULL,
                stereo_track_url = NULL,
                recording_started_at = NULL,
                recording_ended_at = NULL
            WHERE id = ?
          `,
          args: [id],
        });
        
        deleted++;
      } catch (err) {
        errors.push(`Failed to delete recording ${id}: ${err}`);
      }
    }

    return { deleted, errors };
  } catch (error) {
    errors.push(`Database error: ${error}`);
    return { deleted, errors };
  }
}

/**
 * List all objects in R2 recordings folder
 */
async function listR2Objects(): Promise<string[]> {
  try {
    // For R2, we construct the public URL and use the S3 API
    // Since we're using the public dev URL, we can't list directly
    // We'll track what should be deleted based on database records
    
    console.log('Note: R2 objects need to be deleted manually or via S3 API');
    console.log(`R2 Bucket: ${R2_BUCKET}`);
    console.log(`R2 Endpoint: ${R2_ENDPOINT}`);
    
    return [];
  } catch (error) {
    console.error('Failed to list R2 objects:', error);
    return [];
  }
}

/**
 * Main cleanup function
 */
export async function cleanupAllRecordings(): Promise<{ 
  success: boolean; 
  dbDeleted: number; 
  r2Deleted: number;
  errors: string[];
  instructions: string[];
}> {
  const errors: string[] = [];
  const instructions: string[] = [];

  console.log('=== Starting Recording Cleanup ===\n');

  // 1. Delete from database
  console.log('Step 1: Deleting from database...');
  const dbResult = await deleteAllRecordingsFromDB();
  errors.push(...dbResult.errors);
  console.log(`✓ Deleted ${dbResult.deleted} recordings from database\n`);

  // 2. R2 cleanup instructions
  console.log('Step 2: R2 Storage Cleanup...');
  console.log('R2 files are NOT automatically deleted.');
  console.log('To delete R2 files, use one of these methods:\n');
  
  instructions.push(
    'Method 1: Cloudflare Dashboard',
    '  1. Go to https://dash.cloudflare.com',
    '  2. Navigate to R2 > axtraconsole001 bucket',
    '  3. Find the "recordings/" folder',
    '  4. Select all and delete\n',
    'Method 2: AWS CLI (if configured)',
    `  aws s3 rm s3://${R2_BUCKET}/recordings/ --recursive --endpoint-url=${R2_ENDPOINT}\n`,
    'Method 3: rclone',
    `  rclone delete remote:${R2_BUCKET}/recordings/\n`
  );

  console.log(instructions.join('\n'));

  console.log('=== Cleanup Summary ===');
  console.log(`Database records cleared: ${dbResult.deleted}`);
  console.log(`R2 storage: Manual cleanup required`);
  console.log(`Errors: ${errors.length}`);

  return {
    success: errors.length === 0,
    dbDeleted: dbResult.deleted,
    r2Deleted: 0,
    errors,
    instructions,
  };
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupAllRecordings()
    .then((result) => {
      console.log('\nDone!');
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

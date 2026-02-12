/**
 * R2 Storage Cleanup - AWS SDK Version
 * Deletes ALL objects from Cloudflare R2 using AWS SDK
 * 
 * Prerequisites: npm install @aws-sdk/client-s3
 * Usage: npx tsx server/cleanup-r2-aws-sdk.ts [--force]
 */

import { 
  S3Client, 
  ListObjectsV2Command, 
  DeleteObjectsCommand,
  DeleteObjectCommand,
  _Object
} from '@aws-sdk/client-s3';
import { db } from './db';

// R2 configuration from environment
const R2_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';
const R2_BUCKET = process.env.EGRESS_S3_BUCKET || '';
const R2_ACCESS_KEY = process.env.EGRESS_S3_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.EGRESS_S3_SECRET_KEY || '';

interface CleanupResult {
  success: boolean;
  totalObjects: number;
  deleted: number;
  failed: number;
  bytesFreed: number;
  errors: string[];
}

/**
 * Create S3 client for R2
 */
function createR2Client(): S3Client {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    throw new Error(
      'Missing R2 configuration. Please set:\n' +
      '  - EGRESS_S3_ENDPOINT (e.g., https://<account>.r2.cloudflarestorage.com)\n' +
      '  - EGRESS_S3_ACCESS_KEY\n' +
      '  - EGRESS_S3_SECRET_KEY'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
    // Required for R2
    forcePathStyle: true,
  });
}

/**
 * List ALL objects in bucket (handles pagination)
 */
async function listAllObjects(client: S3Client, prefix: string = ''): Promise<_Object[]> {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;
  
  console.log(`🔍 Scanning bucket${prefix ? ` (prefix: ${prefix})` : ''}...`);
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });
    
    const response = await client.send(command);
    
    if (response.Contents) {
      objects.push(...response.Contents);
      process.stdout.write(`  Found ${objects.length} objects...\r`);
    }
    
    continuationToken = response.NextContinuationToken;
    
  } while (continuationToken);
  
  console.log(`  Found ${objects.length} objects total    `); // Clear line
  return objects;
}

/**
 * Delete objects in batches
 */
async function deleteObjectsBatch(
  client: S3Client, 
  objects: _Object[]
): Promise<{ deleted: number; failed: number; bytesFreed: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  let failed = 0;
  let bytesFreed = 0;
  
  // Process in batches of 1000 (S3 batch delete limit)
  const batchSize = 1000;
  const batches = Math.ceil(objects.length / batchSize);
  
  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    console.log(`\n🗑️  Processing batch ${batchNum}/${batches} (${batch.length} objects)...`);
    
    const deleteKeys = batch
      .map(obj => obj.Key)
      .filter((key): key is string => !!key)
      .map(key => ({ Key: key }));
    
    try {
      const command = new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: deleteKeys,
          Quiet: false,
        },
      });
      
      const response = await client.send(command);
      
      const batchDeleted = response.Deleted?.length || 0;
      const batchErrors = response.Errors || [];
      
      deleted += batchDeleted;
      failed += batchErrors.length;
      
      // Calculate bytes freed from successfully deleted objects
      const deletedKeys = new Set(response.Deleted?.map(d => d.Key) || []);
      batch.forEach(obj => {
        if (obj.Key && deletedKeys.has(obj.Key)) {
          bytesFreed += obj.Size || 0;
        }
      });
      
      console.log(`   ✓ Deleted: ${batchDeleted}, ✗ Failed: ${batchErrors.length}`);
      
      for (const error of batchErrors) {
        const errMsg = `Failed to delete ${error.Key}: ${error.Message} (${error.Code})`;
        errors.push(errMsg);
        console.log(`   ✗ ${errMsg}`);
      }
      
    } catch (error: any) {
      // If batch delete fails, try individual deletes
      console.log(`   ⚠️  Batch delete failed, trying individual deletes...`);
      
      for (const key of deleteKeys) {
        try {
          await client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key.Key,
          }));
          deleted++;
          const obj = batch.find(o => o.Key === key.Key);
          bytesFreed += obj?.Size || 0;
          process.stdout.write(`   ✓ Deleted: ${key.Key.slice(0, 50)}...\r`);
        } catch (e: any) {
          failed++;
          errors.push(`Failed to delete ${key.Key}: ${e.message}`);
          console.log(`   ✗ Failed: ${key.Key}`);
        }
      }
    }
  }
  
  return { deleted, failed, bytesFreed, errors };
}

/**
 * Delete a single file by URL or key
 */
async function deleteSingleFile(client: S3Client, urlOrKey: string): Promise<boolean> {
  // Extract key from URL if needed
  let key = urlOrKey;
  if (urlOrKey.includes('r2.dev')) {
    const match = urlOrKey.match(/r2\.dev\/(.+)$/);
    if (match) key = match[1];
  }
  
  try {
    await client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear recording URLs from database
 */
async function clearDatabaseRecordings(): Promise<{ cleared: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Get all call sessions with recordings
    const result = await db.execute({
      sql: `SELECT id FROM call_sessions 
            WHERE operator_track_url IS NOT NULL 
               OR agent_track_url IS NOT NULL 
               OR stereo_track_url IS NOT NULL`,
      args: [],
    });
    
    const ids = result.rows.map(r => r.id as string);
    
    if (ids.length === 0) {
      return { cleared: 0, errors: [] };
    }
    
    console.log(`\n🗑️  Clearing ${ids.length} recording records from database...`);
    
    for (const id of ids) {
      try {
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
      } catch (e: any) {
        errors.push(`Failed to clear ${id}: ${e.message}`);
      }
    }
    
    return { cleared: ids.length, errors };
  } catch (error: any) {
    return { cleared: 0, errors: [error.message] };
  }
}

/**
 * Main cleanup function
 */
async function cleanupR2Storage(options: { force?: boolean; dbOnly?: boolean } = {}): Promise<CleanupResult> {
  const { force = false, dbOnly = false } = options;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         R2 STORAGE CLEANUP - AWS SDK VERSION                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const result: CleanupResult = {
    success: false,
    totalObjects: 0,
    deleted: 0,
    failed: 0,
    bytesFreed: 0,
    errors: [],
  };
  
  try {
    // Validate configuration
    if (!R2_BUCKET) {
      throw new Error('EGRESS_S3_BUCKET environment variable is not set');
    }
    
    const client = createR2Client();
    
    console.log('📋 Configuration:');
    console.log(`   Bucket: ${R2_BUCKET}`);
    console.log(`   Endpoint: ${R2_ENDPOINT}`);
    console.log('');
    
    if (dbOnly) {
      console.log('🗑️  Database-only mode (skipping R2 cleanup)\n');
    } else {
      // List all objects
      const objects = await listAllObjects(client);
      result.totalObjects = objects.length;
      
      if (objects.length === 0) {
        console.log('\n✅ R2 bucket is already empty!');
      } else {
        // Calculate total size
        const totalBytes = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
        
        console.log('\n📊 Summary:');
        console.log(`   Total objects: ${objects.length}`);
        console.log(`   Total size: ${formatBytes(totalBytes)}`);
        console.log('');
        
        // Show sample
        console.log('Sample objects:');
        objects.slice(0, 5).forEach(obj => {
          console.log(`  - ${obj.Key} (${formatBytes(obj.Size || 0)})`);
        });
        if (objects.length > 5) {
          console.log(`  ... and ${objects.length - 5} more`);
        }
        console.log('');
        
        // Confirm deletion
        if (!force) {
          console.log('⚠️  WARNING: This will PERMANENTLY delete ALL files in the bucket!');
          console.log('   Press Ctrl+C now to cancel, or wait 5 seconds to proceed...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Delete objects
        console.log('\n🗑️  Starting deletion...\n');
        const deleteResult = await deleteObjectsBatch(client, objects);
        
        result.deleted = deleteResult.deleted;
        result.failed = deleteResult.failed;
        result.bytesFreed = deleteResult.bytesFreed;
        result.errors = deleteResult.errors;
        
        console.log('\n' + '═'.repeat(60));
        console.log('R2 CLEANUP RESULTS');
        console.log('═'.repeat(60));
        console.log(`Total objects: ${result.totalObjects}`);
        console.log(`Deleted:       ${result.deleted}`);
        console.log(`Failed:        ${result.failed}`);
        console.log(`Bytes freed:   ${formatBytes(result.bytesFreed)}`);
        console.log('═'.repeat(60) + '\n');
      }
    }
    
    // Clear database records
    const dbResult = await clearDatabaseRecordings();
    if (dbResult.cleared > 0) {
      console.log(`✅ Cleared ${dbResult.cleared} recording records from database`);
      if (dbResult.errors.length > 0) {
        console.log(`⚠️  ${dbResult.errors.length} database errors`);
        result.errors.push(...dbResult.errors);
      }
    }
    
    result.success = result.failed === 0 && result.errors.length === 0;
    
    if (result.success) {
      console.log('\n✅ Cleanup completed successfully!');
    } else {
      console.log('\n⚠️  Cleanup completed with some errors.');
    }
    
    return result;
    
  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error.message);
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Delete only known recording files (from database)
 */
async function cleanupKnownRecordingsOnly(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         CLEANUP KNOWN RECORDINGS ONLY                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  try {
    const client = createR2Client();
    
    // Get all recording URLs from database
    const result = await db.execute({
      sql: `SELECT id, operator_track_url, agent_track_url, stereo_track_url 
            FROM call_sessions 
            WHERE operator_track_url IS NOT NULL OR agent_track_url IS NOT NULL`,
      args: [],
    });
    
    const allKeys = new Set<string>();
    
    for (const row of result.rows) {
      if (row.operator_track_url) allKeys.add(row.operator_track_url as string);
      if (row.agent_track_url) allKeys.add(row.agent_track_url as string);
      if (row.stereo_track_url) allKeys.add(row.stereo_track_url as string);
    }
    
    if (allKeys.size === 0) {
      console.log('No recordings found in database.');
      return;
    }
    
    console.log(`Found ${allKeys.size} unique recording files to delete\n`);
    
    let deleted = 0;
    let failed = 0;
    
    for (const key of allKeys) {
      process.stdout.write(`Deleting: ${key.slice(0, 60)}... `);
      
      if (await deleteSingleFile(client, key)) {
        console.log('✓');
        deleted++;
      } else {
        console.log('✗');
        failed++;
      }
    }
    
    console.log(`\n✅ Deleted: ${deleted}, Failed: ${failed}`);
    
    // Clear database
    await clearDatabaseRecordings();
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Helper: Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Parse arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const dbOnly = args.includes('--db-only');
const knownOnly = args.includes('--known-only');

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: npx tsx server/cleanup-r2-aws-sdk.ts [options]

Options:
  --force, -f     Skip confirmation prompt
  --db-only       Only clear database records, skip R2 cleanup
  --known-only    Only delete files referenced in database
  --help, -h      Show this help

Environment Variables Required:
  EGRESS_S3_ENDPOINT      R2 endpoint URL
  EGRESS_S3_BUCKET        R2 bucket name
  EGRESS_S3_ACCESS_KEY    R2 access key
  EGRESS_S3_SECRET_KEY    R2 secret key

Examples:
  npx tsx server/cleanup-r2-aws-sdk.ts           # Interactive cleanup
  npx tsx server/cleanup-r2-aws-sdk.ts --force   # Auto-confirm deletion
  npx tsx server/cleanup-r2-aws-sdk.ts --db-only # Clear DB only
`);
  process.exit(0);
}

// Run main function
if (knownOnly) {
  cleanupKnownRecordingsOnly()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  cleanupR2Storage({ force, dbOnly })
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(() => process.exit(1));
}

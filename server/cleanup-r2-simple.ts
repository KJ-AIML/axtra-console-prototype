/**
 * Simple R2 Storage Cleanup Script
 * Provides commands to clear all R2 storage
 * 
 * Usage: npx tsx server/cleanup-r2-simple.ts
 */

import { getEnv } from './config';
import { db } from './db';
import { execSync } from 'child_process';

// R2 configuration
const R2_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';
const R2_BUCKET = process.env.EGRESS_S3_BUCKET || '';
const R2_ACCESS_KEY = process.env.EGRESS_S3_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.EGRESS_S3_SECRET_KEY || '';

interface CleanupOptions {
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Main cleanup function
 */
async function cleanupR2(options: CleanupOptions = {}): Promise<void> {
  const { dryRun = false, force = false } = options;
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         R2 STORAGE CLEANUP UTILITY                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // Check configuration
  if (!R2_ENDPOINT || !R2_BUCKET) {
    console.error('❌ R2 configuration missing!');
    console.error('\nRequired environment variables:');
    console.error('  EGRESS_S3_ENDPOINT  (e.g., https://<account>.r2.cloudflarestorage.com)');
    console.error('  EGRESS_S3_BUCKET    (e.g., axtraconsole001)');
    console.error('  EGRESS_S3_ACCESS_KEY');
    console.error('  EGRESS_S3_SECRET_KEY');
    console.error('\nAdd these to your .env.local file\n');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${R2_ENDPOINT}`);
  console.log(`   Bucket: ${R2_BUCKET}`);
  console.log(`   Public URL: https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev\n`);
  
  // Get all recordings from database
  console.log('🔍 Checking database for recordings...');
  const result = await db.execute({
    sql: `SELECT id, operator_track_url, agent_track_url, stereo_track_url, room_name, started_at 
          FROM call_sessions 
          WHERE operator_track_url IS NOT NULL OR agent_track_url IS NOT NULL`,
    args: [],
  });
  
  const recordings = result.rows;
  console.log(`   Found ${recordings.length} recordings with R2 files\n`);
  
  if (recordings.length === 0) {
    console.log('✅ No recordings found in database.');
    console.log('   If R2 still has files, they may be orphaned.\n');
  } else {
    console.log('📁 Files that need to be deleted from R2:\n');
    
    const allFiles = new Set<string>();
    recordings.forEach((row: any, index: number) => {
      console.log(`Recording #${index + 1}:`);
      console.log(`  Call ID: ${row.id}`);
      console.log(`  Room: ${row.room_name}`);
      console.log(`  Started: ${row.started_at}`);
      if (row.operator_track_url) {
        console.log(`  - Operator: ${row.operator_track_url}`);
        allFiles.add(row.operator_track_url);
      }
      if (row.agent_track_url) {
        console.log(`  - Agent: ${row.agent_track_url}`);
        allFiles.add(row.agent_track_url);
      }
      if (row.stereo_track_url) {
        console.log(`  - Stereo: ${row.stereo_track_url}`);
        allFiles.add(row.stereo_track_url);
      }
      console.log('');
    });
    
    console.log(`Total unique files in R2: ${allFiles.size}\n`);
  }
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
    printInstructions();
    return;
  }
  
  // Confirm deletion
  if (!force && process.stdin.isTTY) {
    console.log('⚠️  WARNING: This will help you delete ALL files from R2 storage!');
    console.log('   These files cannot be recovered after deletion.\n');
    console.log('   Waiting 5 seconds before showing cleanup options...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  printInstructions();
  
  // Try automated cleanup if AWS CLI is available
  await tryAutomatedCleanup();
}

function printInstructions(): void {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         HOW TO CLEAR R2 STORAGE                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  METHOD 1: Cloudflare Dashboard (Easiest)              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('  1. Open https://dash.cloudflare.com in your browser');
  console.log('  2. Navigate to: R2 Object Storage');
  console.log(`  3. Click on bucket: ${R2_BUCKET}`);
  console.log('  4. Click the checkbox at top to select ALL objects');
  console.log('  5. Click "Delete" button');
  console.log('  6. Type "delete" to confirm\n');
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  METHOD 2: AWS CLI (Command Line)                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('  1. Install AWS CLI: https://aws.amazon.com/cli/');
  console.log('  2. Configure R2 credentials:\n');
  console.log(`     aws configure --profile r2`);
  console.log(`     # AWS Access Key ID: ${R2_ACCESS_KEY ? '***' + R2_ACCESS_KEY.slice(-4) : '[your-key]'}`);
  console.log(`     # AWS Secret Access Key: ${R2_SECRET_KEY ? '***' : '[your-secret]'}`);
  console.log(`     # Default region name: auto`);
  console.log(`     # Default output format: json\n`);
  console.log('  3. Delete all files:\n');
  console.log(`     aws s3 rm s3://${R2_BUCKET}/ --recursive --endpoint-url=${R2_ENDPOINT} --profile r2\n`);
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  METHOD 3: Wrangler CLI (Cloudflare)                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('  1. Install Wrangler: npm install -g wrangler');
  console.log('  2. Authenticate: wrangler login');
  console.log('  3. List files: wrangler r2 object list ' + R2_BUCKET);
  console.log('  4. Delete all: wrangler r2 object delete ' + R2_BUCKET + ' --file-list <keys>\n');
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  METHOD 4: Install AWS SDK for Node.js                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('  1. Install SDK: npm install @aws-sdk/client-s3');
  console.log('  2. Run: npx tsx server/cleanup-r2-aws-sdk.ts\n');
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  DIRECT R2 PUBLIC URL                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Bucket URL: ${R2_ENDPOINT}/${R2_BUCKET}`);
  console.log(`  Public URL: https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev`);
  console.log('  (Files are stored under /recordings/<call-id>/...)\n');
}

async function tryAutomatedCleanup(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  ATTEMPTING AUTOMATED CLEANUP                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // Check if AWS CLI is installed
  try {
    execSync('aws --version', { stdio: 'ignore' });
    console.log('✅ AWS CLI found!');
    
    if (R2_ACCESS_KEY && R2_SECRET_KEY) {
      console.log('\n🔄 Attempting to delete with AWS CLI...\n');
      
      try {
        // Set environment variables for AWS CLI
        const env = {
          ...process.env,
          AWS_ACCESS_KEY_ID: R2_ACCESS_KEY,
          AWS_SECRET_ACCESS_KEY: R2_SECRET_KEY,
          AWS_DEFAULT_REGION: 'auto',
        };
        
        // First, list files
        console.log('Listing files in bucket...');
        const listOutput = execSync(
          `aws s3 ls s3://${R2_BUCKET}/ --endpoint-url=${R2_ENDPOINT} --recursive`,
          { env, encoding: 'utf-8' }
        );
        
        const files = listOutput.trim().split('\n').filter(Boolean);
        console.log(`Found ${files.length} objects in R2\n`);
        
        if (files.length > 0) {
          console.log('Sample files:');
          files.slice(0, 5).forEach(f => console.log(`  ${f}`));
          if (files.length > 5) console.log(`  ... and ${files.length - 5} more`);
          console.log('');
          
          // Confirm
          console.log('⚠️  About to delete ALL files. Press Ctrl+C to cancel...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Delete
          console.log('\n🗑️  Deleting files...');
          execSync(
            `aws s3 rm s3://${R2_BUCKET}/ --recursive --endpoint-url=${R2_ENDPOINT}`,
            { env, stdio: 'inherit' }
          );
          
          console.log('\n✅ R2 cleanup completed successfully!');
        } else {
          console.log('✅ R2 bucket is already empty!');
        }
        
        return;
      } catch (error: any) {
        console.error('\n❌ AWS CLI cleanup failed:', error.message);
      }
    } else {
      console.log('\n⚠️  AWS credentials not found in environment.');
    }
  } catch {
    console.log('⚠️  AWS CLI not installed.');
  }
  
  // Check if wrangler is installed
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
    console.log('✅ Wrangler CLI found!');
    console.log('\n📝 Use: wrangler r2 object list ' + R2_BUCKET);
    console.log('       wrangler r2 object delete ' + R2_BUCKET + ' --key <key>\n');
  } catch {
    console.log('⚠️  Wrangler CLI not installed.');
  }
  
  console.log('\n👉 Please use one of the manual methods shown above.\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: CleanupOptions = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
};

// Run
cleanupR2(options)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

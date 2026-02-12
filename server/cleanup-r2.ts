/**
 * R2 Storage Cleanup Script
 * Deletes ALL objects from Cloudflare R2 bucket
 * 
 * Usage: npx tsx server/cleanup-r2.ts
 */

import { getEnv } from './config';

// R2 configuration from environment
const R2_ENDPOINT = getEnv('EGRESS_S3_ENDPOINT', '');
const R2_BUCKET = getEnv('EGRESS_S3_BUCKET', '');
const R2_ACCESS_KEY = getEnv('EGRESS_S3_ACCESS_KEY', '');
const R2_SECRET_KEY = getEnv('EGRESS_S3_SECRET_KEY', '');

// R2 public URL pattern (from your code)
const R2_PUBLIC_URL = 'https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev';

interface R2Object {
  Key: string;
  LastModified: string;
  Size: number;
}

/**
 * List all objects in R2 bucket (with optional prefix)
 */
async function listAllR2Objects(prefix: string = ''): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;
  
  do {
    const params = new URLSearchParams();
    params.append('list-type', '2');
    if (prefix) params.append('prefix', prefix);
    if (continuationToken) params.append('continuation-token', continuationToken);
    
    const url = `${R2_ENDPOINT}/${R2_BUCKET}?${params.toString()}`;
    
    // Create AWS Signature V4
    const auth = await createAWSAuth('GET', `/${R2_BUCKET}?${params.toString()}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': auth,
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'x-amz-date': new Date().toISOString().replace(/[:\-]*/g, '').slice(0, 15) + 'Z',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list objects: ${response.status} ${errorText}`);
    }
    
    const xml = await response.text();
    
    // Parse XML response (simple regex parsing)
    const keyMatches = xml.match(/<Key>([^<]+)<\/Key>/g) || [];
    const lastModifiedMatches = xml.match(/<LastModified>([^<]+)<\/LastModified>/g) || [];
    const sizeMatches = xml.match(/<Size>(\d+)<\/Size>/g) || [];
    
    for (let i = 0; i < keyMatches.length; i++) {
      objects.push({
        Key: keyMatches[i].replace(/<\/?Key>/g, ''),
        LastModified: lastModifiedMatches[i]?.replace(/<\/?LastModified>/g, '') || '',
        Size: parseInt(sizeMatches[i]?.replace(/<\/?Size>/g, '') || '0'),
      });
    }
    
    // Check for more objects
    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    continuationToken = isTruncated && tokenMatch ? tokenMatch[1] : undefined;
    
  } while (continuationToken);
  
  return objects;
}

/**
 * Delete a single object from R2
 */
async function deleteR2Object(key: string): Promise<boolean> {
  try {
    const url = `${R2_ENDPOINT}/${R2_BUCKET}/${encodeURIComponent(key)}`;
    
    // Create AWS Signature V4
    const auth = await createAWSAuth('DELETE', `/${R2_BUCKET}/${key}`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': auth,
        'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'x-amz-date': new Date().toISOString().replace(/[:\-]*/g, '').slice(0, 15) + 'Z',
      },
    });
    
    return response.status === 204 || response.status === 200;
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple objects using batch delete
 */
async function deleteR2ObjectsBatch(keys: string[]): Promise<{ deleted: number; failed: string[] }> {
  const failed: string[] = [];
  let deleted = 0;
  
  // R2 supports batch delete via POST with delete body
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Delete>
  <Quiet>false</Quiet>
${keys.map(key => `  <Object><Key>${escapeXml(key)}</Key></Object>`).join('\n')}
</Delete>`;
  
  try {
    const url = `${R2_ENDPOINT}/${R2_BUCKET}?delete`;
    const auth = await createAWSAuth('POST', `/${R2_BUCKET}?delete`, xmlBody);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/xml',
        'Content-MD5': await calculateMD5(xmlBody),
        'x-amz-content-sha256': await calculateSHA256(xmlBody),
        'x-amz-date': new Date().toISOString().replace(/[:\-]*/g, '').slice(0, 15) + 'Z',
      },
      body: xmlBody,
    });
    
    if (response.ok) {
      deleted = keys.length;
    } else {
      const errorText = await response.text();
      console.error('Batch delete failed:', errorText);
      // Fall back to individual deletes
      for (const key of keys) {
        if (await deleteR2Object(key)) {
          deleted++;
        } else {
          failed.push(key);
        }
      }
    }
  } catch (error) {
    console.error('Batch delete error:', error);
    // Fall back to individual deletes
    for (const key of keys) {
      if (await deleteR2Object(key)) {
        deleted++;
      } else {
        failed.push(key);
      }
    }
  }
  
  return { deleted, failed };
}

/**
 * Simple AWS Signature V4 (simplified for R2)
 * Note: This is a basic implementation. For production, use @aws-sdk/client-s3
 */
async function createAWSAuth(method: string, path: string, body: string = ''): Promise<string> {
  const date = new Date().toISOString().replace(/[:\-]*/g, '').slice(0, 8);
  const dateTime = new Date().toISOString().replace(/[:\-]*/g, '').slice(0, 15) + 'Z';
  const region = 'auto'; // R2 uses 'auto' as region
  const service = 's3';
  
  // Create credential scope
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  
  // Create signing key
  const kDate = await hmac(`AWS4${R2_SECRET_KEY}`, date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  
  // Create canonical request
  const canonicalRequest = [
    method,
    path.split('?')[0],
    path.split('?')[1] || '',
    `host:${R2_ENDPOINT.replace('https://', '')}\n`,
    'host',
    await calculateSHA256(body),
  ].join('\n');
  
  // Create string to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateTime,
    credentialScope,
    await calculateSHA256(canonicalRequest),
  ].join('\n');
  
  // Calculate signature
  const signature = await hmacHex(kSigning, stringToSign);
  
  return `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=host, Signature=${signature}`;
}

// Helper functions for crypto
async function hmac(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const crypto = globalThis.crypto;
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key: string | ArrayBuffer, message: string): Promise<string> {
  const result = await hmac(key, message);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function calculateSHA256(message: string): Promise<string> {
  const crypto = globalThis.crypto;
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function calculateMD5(message: string): Promise<string> {
  // Simple MD5 implementation for basic auth
  // In production, use a proper MD5 library
  const crypto = globalThis.crypto;
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('MD5', data).catch(() => {
    // If MD5 not supported, return empty string
    return new ArrayBuffer(0);
  });
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main cleanup function using AWS SDK approach
 * This is the RECOMMENDED way - install aws-sdk first
 */
export async function cleanupR2Storage(): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deleted = 0;
  let failed = 0;
  
  console.log('=== R2 Storage Cleanup ===\n');
  
  // Check configuration
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.error('❌ R2 configuration missing!');
    console.error('Please set these environment variables:');
    console.error('  - EGRESS_S3_ENDPOINT');
    console.error('  - EGRESS_S3_BUCKET');
    console.error('  - EGRESS_S3_ACCESS_KEY');
    console.error('  - EGRESS_S3_SECRET_KEY');
    return { success: false, deleted: 0, failed: 0, errors: ['R2 not configured'] };
  }
  
  console.log(`R2 Endpoint: ${R2_ENDPOINT}`);
  console.log(`R2 Bucket: ${R2_BUCKET}`);
  console.log('');
  
  try {
    // Try to use @aws-sdk/client-s3 if available
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });
    
    console.log('🔍 Listing all objects in bucket...');
    
    // List all objects
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: '', // Empty to list everything
    });
    
    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];
    
    if (objects.length === 0) {
      console.log('✅ Bucket is already empty!');
      return { success: true, deleted: 0, failed: 0, errors: [] };
    }
    
    console.log(`Found ${objects.length} objects to delete\n`);
    
    // Show sample of what will be deleted
    console.log('Sample objects to delete:');
    objects.slice(0, 5).forEach(obj => {
      console.log(`  - ${obj.Key} (${formatBytes(obj.Size || 0)})`);
    });
    if (objects.length > 5) {
      console.log(`  ... and ${objects.length - 5} more`);
    }
    console.log('');
    
    // Confirm deletion (skip in non-interactive mode)
    if (process.stdin.isTTY) {
      console.log('⚠️  WARNING: This will permanently delete ALL files in the bucket!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Delete in batches of 1000 (S3 limit)
    const batchSize = 1000;
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      const deleteKeys = batch.map(obj => ({ Key: obj.Key! }));
      
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(objects.length / batchSize)} (${deleteKeys.length} objects)...`);
      
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: deleteKeys,
          Quiet: true,
        },
      });
      
      const deleteResponse = await s3Client.send(deleteCommand);
      
      const deletedCount = deleteResponse.Deleted?.length || 0;
      const errorCount = deleteResponse.Errors?.length || 0;
      
      deleted += deletedCount;
      failed += errorCount;
      
      if (deleteResponse.Errors) {
        for (const error of deleteResponse.Errors) {
          errors.push(`Failed to delete ${error.Key}: ${error.Message}`);
        }
      }
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted: ${deleted} objects`);
    console.log(`   Failed: ${failed} objects`);
    
    return { success: failed === 0, deleted, failed, errors };
    
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('@aws-sdk')) {
      console.log('⚠️  AWS SDK not installed. Using manual delete method...\n');
      return cleanupR2Manual();
    }
    console.error('❌ Cleanup failed:', error);
    return { success: false, deleted, failed, errors: [String(error)] };
  }
}

/**
 * Fallback manual cleanup using fetch API
 */
async function cleanupR2Manual(): Promise<{
  success: boolean;
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deleted = 0;
  let failed = 0;
  
  try {
    // Get all recording URLs from database to know what to delete
    const { db } = await import('./db');
    const result = await db.execute({
      sql: `SELECT operator_track_url, agent_track_url, stereo_track_url FROM call_sessions 
            WHERE operator_track_url IS NOT NULL OR agent_track_url IS NOT NULL`,
      args: [],
    });
    
    const keysToDelete = new Set<string>();
    
    for (const row of result.rows) {
      if (row.operator_track_url) keysToDelete.add(row.operator_track_url as string);
      if (row.agent_track_url) keysToDelete.add(row.agent_track_url as string);
      if (row.stereo_track_url) keysToDelete.add(row.stereo_track_url as string);
    }
    
    if (keysToDelete.size === 0) {
      console.log('No recording files found in database.');
      console.log('To delete ALL R2 files (not just known recordings), use the AWS CLI method below:\n');
      printManualInstructions();
      return { success: true, deleted: 0, failed: 0, errors: [] };
    }
    
    console.log(`Found ${keysToDelete.size} recording files to delete\n`);
    
    // Delete each file
    for (const key of keysToDelete) {
      process.stdout.write(`Deleting: ${key}... `);
      
      // Try to delete using R2 public URL with DELETE method
      // Note: This won't work without proper auth, but shows the intent
      const success = await deleteR2Object(key);
      
      if (success) {
        console.log('✓');
        deleted++;
      } else {
        console.log('✗');
        failed++;
        errors.push(`Failed to delete: ${key}`);
      }
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted: ${deleted} objects`);
    console.log(`   Failed: ${failed} objects`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some deletions failed. Use manual method:');
      printManualInstructions();
    }
    
    return { success: failed === 0, deleted, failed, errors };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    printManualInstructions();
    return { success: false, deleted, failed, errors: [String(error)] };
  }
}

function printManualInstructions(): void {
  console.log('\n=== Manual R2 Cleanup Instructions ===\n');
  
  console.log('Method 1: Cloudflare Dashboard (Easiest)');
  console.log('  1. Go to https://dash.cloudflare.com');
  console.log('  2. Navigate to R2 > your bucket');
  console.log('  3. Select all objects and delete\n');
  
  console.log('Method 2: AWS CLI (Requires installation)');
  console.log(`  aws configure --profile r2`);
  console.log(`  # Set access key, secret key, region=auto`);
  console.log(`  aws s3 rm s3://${R2_BUCKET}/ --recursive --endpoint-url=${R2_ENDPOINT} --profile r2\n`);
  
  console.log('Method 3: Using rclone');
  console.log(`  rclone delete remote:${R2_BUCKET}/\n`);
  
  console.log('Method 4: Install AWS SDK and run this script');
  console.log('  npm install @aws-sdk/client-s3');
  console.log('  npx tsx server/cleanup-r2.ts\n');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupR2Storage()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

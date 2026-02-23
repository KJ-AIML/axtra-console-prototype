/**
 * Check R2 Configuration
 * Verifies that R2 environment variables are set correctly
 * 
 * Usage: npx tsx server/check-r2-config.ts
 */

import { getEnv } from './config';

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║         R2 STORAGE CONFIGURATION CHECK                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const checks = [
  { name: 'EGRESS_S3_ENDPOINT', value: process.env.EGRESS_S3_ENDPOINT },
  { name: 'EGRESS_S3_BUCKET', value: process.env.EGRESS_S3_BUCKET },
  { name: 'EGRESS_S3_ACCESS_KEY', value: process.env.EGRESS_S3_ACCESS_KEY },
  { name: 'EGRESS_S3_SECRET_KEY', value: process.env.EGRESS_S3_SECRET_KEY },
];

let allConfigured = true;

for (const check of checks) {
  const status = check.value ? '✅' : '❌';
  const displayValue = check.value 
    ? check.name.includes('SECRET') 
      ? '***' + check.value.slice(-4) 
      : check.value
    : 'NOT SET';
  
  console.log(`${status} ${check.name}`);
  console.log(`   Value: ${displayValue}`);
  
  if (!check.value) {
    allConfigured = false;
  }
}

console.log('\n' + '═'.repeat(60));

if (allConfigured) {
  console.log('✅ All R2 configuration variables are set!');
  console.log('\nYou can now run cleanup commands:');
  console.log('  npm run cleanup:r2       # Show cleanup instructions');
  console.log('  npm run cleanup:r2:force # Delete all files (requires aws-sdk)');
} else {
  console.log('❌ Some configuration variables are missing!');
  console.log('\nPlease add these to your .env.local file:\n');
  console.log('# R2/Egress Configuration');
  console.log('EGRESS_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com');
  console.log('EGRESS_S3_BUCKET=axtraconsole001');
  console.log('EGRESS_S3_ACCESS_KEY=your_access_key');
  console.log('EGRESS_S3_SECRET_KEY=your_secret_key\n');
  console.log('Get these values from:');
  console.log('  https://dash.cloudflare.com → R2 → Manage API Tokens\n');
}

// Try to get from config.ts as well
console.log('\nChecking via config module...\n');

try {
  const endpoint = getEnv('EGRESS_S3_ENDPOINT', '');
  const bucket = getEnv('EGRESS_S3_BUCKET', '');
  
  console.log(`Endpoint (from getEnv): ${endpoint || 'NOT SET'}`);
  console.log(`Bucket (from getEnv): ${bucket || 'NOT SET'}`);
} catch (e: any) {
  console.log(`Error: ${e.message}`);
}

# R2 Storage Cleanup Guide

When you delete recordings from the Axtra Console app, the database records are removed, but the actual audio files remain in Cloudflare R2 storage. This guide shows you how to clean up those files.

## Quick Start

Choose the method that works best for you:

### Option 1: Cloudflare Dashboard (Easiest - No Tools Required)

1. Go to https://dash.cloudflare.com
2. Sign in to your account
3. Navigate to **R2 Object Storage**
4. Click on your bucket (e.g., `axtraconsole001`)
5. You'll see a list of all files
6. Click the checkbox at the top to select ALL objects
7. Click the **Delete** button
8. Type "delete" to confirm
9. Wait for deletion to complete

### Option 2: Using AWS CLI (Command Line)

If you have AWS CLI installed:

```bash
# 1. Configure R2 credentials
aws configure --profile r2
# Enter your Access Key ID, Secret Key, region=auto

# 2. List all files
aws s3 ls s3://axtraconsole001/ --recursive --endpoint-url=https://<your-account>.r2.cloudflarestorage.com --profile r2

# 3. Delete ALL files (⚠️ Permanent!)
aws s3 rm s3://axtraconsole001/ --recursive --endpoint-url=https://<your-account>.r2.cloudflarestorage.com --profile r2
```

### Option 3: Using the Cleanup Script

#### Step 1: Install AWS SDK

```bash
npm install @aws-sdk/client-s3
```

#### Step 2: Run the Cleanup Script

```bash
# Interactive mode (with confirmation)
npx tsx server/cleanup-r2-aws-sdk.ts

# Auto-confirm deletion (skip confirmation)
npx tsx server/cleanup-r2-aws-sdk.ts --force

# Only delete files referenced in database (safer)
npx tsx server/cleanup-r2-aws-sdk.ts --known-only

# Only clear database records, skip R2
npx tsx server/cleanup-r2-aws-sdk.ts --db-only
```

## Environment Variables

Make sure your `.env.local` file has these variables:

```bash
# R2/Egress Configuration
EGRESS_S3_ENDPOINT=https://<your-account>.r2.cloudflarestorage.com
EGRESS_S3_BUCKET=axtraconsole001
EGRESS_S3_ACCESS_KEY=your_access_key_here
EGRESS_S3_SECRET_KEY=your_secret_key_here
```

## Available Scripts

| Script | Purpose | Requirements |
|--------|---------|--------------|
| `cleanup-r2-simple.ts` | Shows instructions and tries AWS CLI | AWS CLI installed |
| `cleanup-r2-aws-sdk.ts` | Full automated cleanup with AWS SDK | `@aws-sdk/client-s3` |
| `cleanup-recordings.ts` | Clears database only | None |

## Understanding the Storage Structure

Files in R2 are organized as:

```
recordings/
  └── <call-id>/
      ├── operator-<timestamp>.ogg    # Operator audio track
      ├── agent-<timestamp>.ogg       # AI agent audio track
      └── stereo-<timestamp>.ogg      # Merged stereo (if available)
```

## Troubleshooting

### "Cannot find module '@aws-sdk/client-s3'"

Install the AWS SDK:
```bash
npm install @aws-sdk/client-s3
```

### "Missing R2 configuration"

Check your `.env.local` file has all required environment variables:
- `EGRESS_S3_ENDPOINT`
- `EGRESS_S3_BUCKET`
- `EGRESS_S3_ACCESS_KEY`
- `EGRESS_S3_SECRET_KEY`

### "Access Denied" errors

Your R2 API token may not have delete permissions. Check in Cloudflare Dashboard:
1. Go to R2 > Manage API Tokens
2. Ensure your token has `Object Read & Write` permission

### Files still showing after deletion

R2 may take a few minutes to fully clear. Refresh the dashboard after a minute or two.

## Safety Tips

⚠️ **Warning**: Deleting files from R2 is **PERMANENT** - there is no trash/recycle bin!

- Always double-check before running delete commands
- Use `--dry-run` flags when available to preview what will be deleted
- Consider backing up important recordings before bulk deletion
- The `--known-only` flag only deletes files referenced in your database (safer)

## Alternative: Wrangler CLI

If you use Cloudflare's Wrangler CLI:

```bash
# Install wrangler
npm install -g wrangler

# Login
wrangler login

# List files
wrangler r2 object list axtraconsole001

# Delete specific file
wrangler r2 object delete axtraconsole001 recordings/call-id/file.ogg
```

Note: Wrangler doesn't support bulk delete via wildcards, so you'd need to script it or use the AWS CLI method.

## Need Help?

If you're still having issues:
1. Check the Cloudflare R2 documentation: https://developers.cloudflare.com/r2/
2. Verify your credentials in the Cloudflare Dashboard
3. Check the script output for specific error messages

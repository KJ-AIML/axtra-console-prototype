#!/usr/bin/env node
/**
 * LiveKit Voice Agent Entry Point
 */

import { cli, ServerOptions } from '@livekit/agents';
import { JobType } from '@livekit/protocol';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.local';

dotenv.config({ path: envPath });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger
const logger = {
  info: (msg: string, meta?: unknown) => console.log(`[Agent] ${msg}`, meta || ''),
  error: (msg: string, err?: unknown) => console.error(`[Agent] ERROR: ${msg}`, err || ''),
};

function validateEnv(): boolean {
  const required = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL', 'OPENAI_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('❌ Missing env vars:', missing.join(', '));
    return false;
  }
  return true;
}

function printBanner() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Axtra AI Voice Agent - Call Center Training            ║');
  console.log('║                                                                ║');
  console.log('║  🤖 Ready to train call center agents with AI customers        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('Scenarios: 💰 Billing | 🔧 Technical | 💼 Sales | 🚪 Retention');
  console.log('           🔒 Compliance | 📦 Returns | ⭐ VIP | 🚨 Fraud\n');
}

async function main() {
  printBanner();
  
  if (!validateEnv()) {
    process.exit(1);
  }

  const agentPath = join(__dirname, 'voice-agent.ts');
  logger.info('Starting agent...', { agent: agentPath });
  logger.info('Waiting for room connections...');
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('Agent is running. Press Ctrl+C to stop.');
  console.log('─────────────────────────────────────────────────────────────────\n');

  // Set CLI arguments for the dev command
  process.argv = [
    process.argv[0], // node
    process.argv[1], // script path
    'dev',           // command
  ];

  // Create ServerOptions instance - the agent property is key
  const options = new ServerOptions({
    agent: agentPath,
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
    wsURL: process.env.LIVEKIT_URL!,
    serverType: JobType.JT_ROOM,
    production: process.env.NODE_ENV === 'production',
  });

  // Run the agent
  cli.runApp(options);
}

main().catch(err => {
  logger.error('Fatal error', err);
  process.exit(1);
});

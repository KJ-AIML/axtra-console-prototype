/**
 * Turso/libsql Database Configuration
 * 
 * Database URL: libsql://axdb-kjctsc.aws-ap-south-1.turso.io
 * Uses TURSO_AUTH_TOKEN for authentication (set in .env)
 */

import { config } from 'dotenv';
import { createClient, Client } from '@libsql/client';
import { resolve } from 'path';

// Load .env files
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Get environment variables
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://axdb-kjctsc.aws-ap-south-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_AUTH_TOKEN) {
  console.warn('⚠️ TURSO_AUTH_TOKEN not set. Database operations will fail.');
  console.warn('Set it in your .env file: TURSO_AUTH_TOKEN=your_token_here');
}

// Log config for debugging (remove in production)
console.log('📡 Database Config:');
console.log('   URL:', TURSO_DATABASE_URL);
console.log('   Token:', TURSO_AUTH_TOKEN ? `✓ Set (${TURSO_AUTH_TOKEN.substring(0, 20)}...)` : '✗ Not set');

// Create database client
export const db: Client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Database schema definitions
export const SCHEMA = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  
  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
  
  accounts: `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT DEFAULT 'personal',
      settings TEXT, -- JSON string for account settings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,

  // Dashboard metrics (KPIs)
  user_metrics: `
    CREATE TABLE IF NOT EXISTS user_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      metric_value TEXT NOT NULL,
      subtext TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, metric_key)
    )
  `,

  // Training scenarios
  scenarios: `
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      duration TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      persona TEXT DEFAULT 'Customer',
      rating REAL DEFAULT 4.5,
      completions INTEGER DEFAULT 0,
      is_recommended INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // User scenario progress
  user_scenarios: `
    CREATE TABLE IF NOT EXISTS user_scenarios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed')),
      score INTEGER,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
      UNIQUE(user_id, scenario_id)
    )
  `,

  // Skill velocity / progress
  skill_velocity: `
    CREATE TABLE IF NOT EXISTS skill_velocity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL DEFAULT 1,
      current_xp INTEGER NOT NULL DEFAULT 0,
      max_xp INTEGER NOT NULL DEFAULT 100,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,

  // QA Highlights
  qa_highlights: `
    CREATE TABLE IF NOT EXISTS qa_highlights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('positive', 'improvement')),
      call_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,

  // Call Sessions (voice call records)
  call_sessions: `
    CREATE TABLE IF NOT EXISTS call_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      room_name TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      total_turns INTEGER DEFAULT 0,
      customer_sentiment TEXT DEFAULT 'neutral' CHECK(customer_sentiment IN ('angry', 'frustrated', 'neutral', 'satisfied', 'happy')),
      final_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    )
  `,

  // Call Transcripts (conversation history)
  call_transcripts: `
    CREATE TABLE IF NOT EXISTS call_transcripts (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      speaker TEXT NOT NULL CHECK(speaker IN ('customer', 'operator')),
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    )
  `,

  // Call Coaching History (AXTRA Copilot data)
  call_coaching: `
    CREATE TABLE IF NOT EXISTS call_coaching (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      analysis_id INTEGER NOT NULL,
      card_1_title TEXT,
      card_1_detail TEXT,
      card_1_action TEXT,
      card_1_status TEXT,
      card_2_title TEXT,
      card_2_detail TEXT,
      card_2_action TEXT,
      card_2_status TEXT,
      card_3_title TEXT,
      card_3_detail TEXT,
      card_3_action TEXT,
      card_3_status TEXT,
      script_summary TEXT,
      script_suggestion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    )
  `,

  // Call Summaries (post-call analysis)
  call_summaries: `
    CREATE TABLE IF NOT EXISTS call_summaries (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      key_points TEXT, -- JSON array of key points
      strengths TEXT, -- JSON array of operator strengths
      improvements TEXT, -- JSON array of improvement areas
      customer_satisfaction INTEGER CHECK(customer_satisfaction BETWEEN 1 AND 5),
      resolution_status TEXT CHECK(resolution_status IN ('resolved', 'pending', 'escalated', 'unresolved')),
      coaching_effectiveness INTEGER CHECK(coaching_effectiveness BETWEEN 1 AND 5),
      generated_by TEXT DEFAULT 'mock', -- 'mock' or 'ai' to track if using mock or real AI
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    )
  `,
};

// Indexes for query performance
const INDEXES = [
  {
    name: 'idx_call_sessions_user_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_call_sessions_user_status ON call_sessions(user_id, status)`
  },
  {
    name: 'idx_call_sessions_user_ended',
    sql: `CREATE INDEX IF NOT EXISTS idx_call_sessions_user_ended ON call_sessions(user_id, ended_at DESC)`
  },
  {
    name: 'idx_call_coaching_call_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_call_coaching_call_id ON call_coaching(call_id)`
  },
  {
    name: 'idx_call_transcripts_call_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_id ON call_transcripts(call_id)`
  },
  {
    name: 'idx_user_scenarios_user_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_scenarios_user_status ON user_scenarios(user_id, status)`
  },
  {
    name: 'idx_sessions_token',
    sql: `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`
  },
  {
    name: 'idx_qa_highlights_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_qa_highlights_user ON qa_highlights(user_id, created_at DESC)`
  },
];

/**
 * Initialize database tables and indexes
 */
export async function initDatabase(): Promise<void> {
  try {
    console.log('📦 Initializing database...');
    
    // Create tables
    for (const [name, sql] of Object.entries(SCHEMA)) {
      await db.execute(sql);
      console.log(`  ✓ Table '${name}' ready`);
    }
    
    // Create indexes
    console.log('  Creating indexes...');
    for (const index of INDEXES) {
      await db.execute(index.sql);
      console.log(`    ✓ Index '${index.name}' ready`);
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

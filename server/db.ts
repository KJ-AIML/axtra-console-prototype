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
      -- Recording fields
      recording_status TEXT DEFAULT 'none' CHECK(recording_status IN ('none', 'recording', 'processing', 'completed', 'failed')),
      operator_track_url TEXT,
      agent_track_url TEXT,
      stereo_track_url TEXT,
      recording_started_at DATETIME,
      recording_ended_at DATETIME,
      operator_egress_id TEXT,
      agent_egress_id TEXT,
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
  // QA Configuration (configurable criteria)
  qa_config: `
    CREATE TABLE IF NOT EXISTS qa_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT DEFAULT 'Customer Service QA',
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,
  
  // QA Criteria (questions/prompts for AI evaluation)
  qa_criteria: `
    CREATE TABLE IF NOT EXISTS qa_criteria (
      id TEXT PRIMARY KEY,
      config_id TEXT DEFAULT 'default',
      sort_order INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      ai_prompt TEXT NOT NULL,
      scoring_type TEXT DEFAULT 'scale' CHECK(scoring_type IN ('scale', 'binary')),
      max_score INTEGER DEFAULT 5,
      weight INTEGER DEFAULT 0,
      is_required BOOLEAN DEFAULT 0,
      FOREIGN KEY (config_id) REFERENCES qa_config(id)
    )
  `,
  
  // AI QA Results (auto-generated after call)
  ai_qa_results: `
    CREATE TABLE IF NOT EXISTS ai_qa_results (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL UNIQUE,
      overall_score INTEGER CHECK(overall_score BETWEEN 0 AND 100),
      summary_feedback TEXT,
      status TEXT CHECK(status IN ('pending_review', 'reviewed')) DEFAULT 'pending_review',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    )
  `,
  
  // AI QA Criteria Scores (detailed breakdown)
  ai_qa_criteria_scores: `
    CREATE TABLE IF NOT EXISTS ai_qa_criteria_scores (
      id TEXT PRIMARY KEY,
      ai_qa_result_id TEXT NOT NULL,
      criteria_id TEXT NOT NULL,
      score INTEGER CHECK(score BETWEEN 1 AND 5),
      reasoning TEXT,
      evidence_quote TEXT,
      evidence_timestamp INTEGER,
      FOREIGN KEY (ai_qa_result_id) REFERENCES ai_qa_results(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
    )
  `,
  
  // Human QA Reviews (manual review by QA staff)
  human_qa_reviews: `
    CREATE TABLE IF NOT EXISTS human_qa_reviews (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      overall_score INTEGER CHECK(overall_score BETWEEN 0 AND 100),
      general_feedback TEXT,
      status TEXT CHECK(status IN ('draft', 'submitted')) DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(call_id, reviewer_id)
    )
  `,
  
  // Human QA Criteria Scores (detailed breakdown)
  human_qa_criteria_scores: `
    CREATE TABLE IF NOT EXISTS human_qa_criteria_scores (
      id TEXT PRIMARY KEY,
      human_qa_review_id TEXT NOT NULL,
      criteria_id TEXT NOT NULL,
      score INTEGER CHECK(score BETWEEN 1 AND 5),
      comment TEXT,
      FOREIGN KEY (human_qa_review_id) REFERENCES human_qa_reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id)
    )
  `,
  
  // Human QA Comments (timestamped during audio playback)
  human_qa_comments: `
    CREATE TABLE IF NOT EXISTS human_qa_comments (
      id TEXT PRIMARY KEY,
      human_qa_review_id TEXT NOT NULL,
      timestamp_seconds INTEGER,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (human_qa_review_id) REFERENCES human_qa_reviews(id) ON DELETE CASCADE
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
  // QA System indexes
  {
    name: 'idx_ai_qa_results_call',
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_qa_results_call ON ai_qa_results(call_id)`
  },
  {
    name: 'idx_ai_qa_results_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_qa_results_status ON ai_qa_results(status)`
  },
  {
    name: 'idx_ai_qa_criteria_scores_result',
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_qa_criteria_scores_result ON ai_qa_criteria_scores(ai_qa_result_id)`
  },
  {
    name: 'idx_human_qa_reviews_call',
    sql: `CREATE INDEX IF NOT EXISTS idx_human_qa_reviews_call ON human_qa_reviews(call_id)`
  },
  {
    name: 'idx_human_qa_reviews_reviewer',
    sql: `CREATE INDEX IF NOT EXISTS idx_human_qa_reviews_reviewer ON human_qa_reviews(reviewer_id)`
  },
  {
    name: 'idx_human_qa_criteria_scores_review',
    sql: `CREATE INDEX IF NOT EXISTS idx_human_qa_criteria_scores_review ON human_qa_criteria_scores(human_qa_review_id)`
  },
  {
    name: 'idx_human_qa_comments_review',
    sql: `CREATE INDEX IF NOT EXISTS idx_human_qa_comments_review ON human_qa_comments(human_qa_review_id)`
  },
  // Note: This index is created after migrations in initDatabase
];

// Migration queries for schema updates
const MIGRATIONS = [
  // Add recording columns to call_sessions (safe to run even if columns exist)
  // Note: SQLite ALTER TABLE doesn't support CHECK constraints, so we add without constraints
  {
    name: 'add_recording_status',
    sql: `ALTER TABLE call_sessions ADD COLUMN recording_status TEXT DEFAULT 'none';`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_operator_track_url',
    sql: `ALTER TABLE call_sessions ADD COLUMN operator_track_url TEXT;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_agent_track_url',
    sql: `ALTER TABLE call_sessions ADD COLUMN agent_track_url TEXT;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_stereo_track_url',
    sql: `ALTER TABLE call_sessions ADD COLUMN stereo_track_url TEXT;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_recording_started_at',
    sql: `ALTER TABLE call_sessions ADD COLUMN recording_started_at DATETIME;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_recording_ended_at',
    sql: `ALTER TABLE call_sessions ADD COLUMN recording_ended_at DATETIME;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_operator_egress_id',
    sql: `ALTER TABLE call_sessions ADD COLUMN operator_egress_id TEXT;`,
    fallback: 'Column may already exist'
  },
  {
    name: 'add_agent_egress_id',
    sql: `ALTER TABLE call_sessions ADD COLUMN agent_egress_id TEXT;`,
    fallback: 'Column may already exist'
  },
  // Add scoring_type column to qa_criteria
  {
    name: 'add_qa_criteria_scoring_type',
    sql: `ALTER TABLE qa_criteria ADD COLUMN scoring_type TEXT DEFAULT 'scale' CHECK(scoring_type IN ('scale', 'binary'));`,
    fallback: 'Column may already exist'
  },
  // Add max_score column to qa_criteria
  {
    name: 'add_qa_criteria_max_score',
    sql: `ALTER TABLE qa_criteria ADD COLUMN max_score INTEGER DEFAULT 5;`,
    fallback: 'Column may already exist'
  },
  // Add is_required column to qa_criteria
  {
    name: 'add_qa_criteria_is_required',
    sql: `ALTER TABLE qa_criteria ADD COLUMN is_required BOOLEAN DEFAULT 0;`,
    fallback: 'Column may already exist'
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
    
    // Run migrations (safe to fail if columns already exist)
    console.log('  Running migrations...');
    for (const migration of MIGRATIONS) {
      try {
        await db.execute(migration.sql);
        console.log(`    ✓ Migration '${migration.name}' applied`);
      } catch (err: any) {
        // Check if it's a "duplicate column" error
        const errorMessage = err?.message || String(err);
        if (errorMessage.includes('duplicate column') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('no such column')) {
          console.log(`    ⏭️  Migration '${migration.name}' skipped (column already exists)`);
        } else {
          console.log(`    ⚠️  Migration '${migration.name}' warning: ${errorMessage.substring(0, 100)}`);
        }
      }
    }
    
    // Create recording_status index after migrations (may fail if column doesn't exist yet)
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_call_sessions_recording_status ON call_sessions(recording_status)`);
      console.log(`    ✓ Index 'idx_call_sessions_recording_status' ready`);
    } catch (err) {
      console.log(`    ⏭️  Index 'idx_call_sessions_recording_status' skipped (column may not exist)`);
    }
    
    // Seed default QA criteria
    console.log('  Seeding QA criteria...');
    await seedQACriteria();
    
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

/**
 * Seed default QA criteria
 * This creates the 5 default criteria for customer service QA
 */
export async function seedQACriteria(): Promise<void> {
  try {
    // Check if config exists
    const configResult = await db.execute({
      sql: 'SELECT id FROM qa_config WHERE id = ?',
      args: ['default']
    });
    
    if (configResult.rows.length === 0) {
      // Create default config
      await db.execute({
        sql: 'INSERT INTO qa_config (id, name, description) VALUES (?, ?, ?)',
        args: ['default', 'Customer Service QA', 'Standard customer service quality assessment']
      });
      console.log('[Database] Created default QA config');
    }
    
    // Check if criteria exist
    const criteriaResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM qa_criteria WHERE config_id = ?',
      args: ['default']
    });
    
    const count = (criteriaResult.rows[0]?.count as number) || 0;
    
    if (count === 0) {
      // Insert 5 default criteria
      const criteria = [
        {
          id: 'qc_opening',
          sort_order: 1,
          name: 'Opening & Greeting',
          description: 'First impression and proper greeting',
          ai_prompt: 'Did the operator properly greet the customer, introduce themselves, and set a positive tone in the first 30 seconds? Evaluate warmth, professionalism, and clarity of the opening.'
        },
        {
          id: 'qc_empathy',
          sort_order: 2,
          name: 'Empathy & Understanding',
          description: 'Emotional intelligence and customer understanding',
          ai_prompt: 'Did the operator show genuine empathy, acknowledge the customer\'s feelings, and demonstrate understanding of their issue? Look for phrases like "I understand", "That must be frustrating", active listening, and emotional attunement.'
        },
        {
          id: 'qc_resolution',
          sort_order: 3,
          name: 'Problem Resolution',
          description: 'Effectiveness in solving the issue',
          ai_prompt: 'Did the operator effectively identify the problem, provide accurate information, and resolve the issue efficiently? Evaluate problem diagnosis, solution quality, and resolution completeness.'
        },
        {
          id: 'qc_professionalism',
          sort_order: 4,
          name: 'Professionalism',
          description: 'Professional conduct throughout the call',
          ai_prompt: 'Did the operator maintain a professional demeanor, use appropriate language, and stay calm throughout the call? Consider tone, language choice, patience, and handling of difficult moments.'
        },
        {
          id: 'qc_closing',
          sort_order: 5,
          name: 'Closing & Next Steps',
          description: 'Proper conclusion and follow-up',
          ai_prompt: 'Did the operator properly summarize the resolution, confirm customer satisfaction, and provide clear next steps if needed? Evaluate if the customer was left with a positive final impression and clear understanding of what happens next.'
        }
      ];
      
      for (const c of criteria) {
        await db.execute({
          sql: `
            INSERT INTO qa_criteria (id, config_id, sort_order, name, description, ai_prompt, scoring_type, max_score, weight, is_required)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [c.id, 'default', c.sort_order, c.name, c.description, c.ai_prompt, 'scale', 5, 20, 1]
        });
      }
      
      console.log('[Database] Seeded 5 default QA criteria');
    }
  } catch (error) {
    console.error('[Database] Error seeding QA criteria:', error);
  }
}

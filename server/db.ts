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
  // Supports hierarchical sub-criteria with parent_criteria_id
  qa_criteria: `
    CREATE TABLE IF NOT EXISTS qa_criteria (
      id TEXT PRIMARY KEY,
      config_id TEXT DEFAULT 'default',
      parent_criteria_id TEXT, -- NULL = main criteria, has value = sub-criteria
      sort_order INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      ai_prompt TEXT NOT NULL,
      scoring_type TEXT DEFAULT 'scale' CHECK(scoring_type IN ('scale', 'binary')),
      max_score INTEGER DEFAULT 5,
      weight INTEGER DEFAULT 0, -- Individual weight (0 = auto-calculate)
      is_required BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (config_id) REFERENCES qa_config(id),
      FOREIGN KEY (parent_criteria_id) REFERENCES qa_criteria(id) ON DELETE CASCADE
    )
  `,
  
  // QA Config Weights - configurable weight overrides at config level
  qa_config_weights: `
    CREATE TABLE IF NOT EXISTS qa_config_weights (
      id TEXT PRIMARY KEY,
      config_id TEXT DEFAULT 'default',
      criteria_id TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 0, -- 0-100
      auto_calculate BOOLEAN DEFAULT 1, -- if true, weight auto-calculated from sub-criteria
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_id) REFERENCES qa_config(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id) ON DELETE CASCADE,
      UNIQUE(config_id, criteria_id)
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
  
  // Sub-criteria Scores - stores scores for nested criteria
  sub_criteria_scores: `
    CREATE TABLE IF NOT EXISTS sub_criteria_scores (
      id TEXT PRIMARY KEY,
      parent_score_id TEXT NOT NULL, -- references ai_qa_criteria_scores or human_qa_criteria_scores
      score_type TEXT NOT NULL CHECK(score_type IN ('ai', 'human')),
      criteria_id TEXT NOT NULL,
      score INTEGER CHECK(score BETWEEN 1 AND 5),
      reasoning TEXT,
      comment TEXT,
      FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id) ON DELETE CASCADE
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

  // General Promotions (public campaigns)
  general_promotions: `
    CREATE TABLE IF NOT EXISTS general_promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_th TEXT,
      description TEXT NOT NULL,
      description_th TEXT,
      promo_code TEXT,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus')),
      discount_value INTEGER,
      max_discount_amount INTEGER,
      min_order_amount INTEGER DEFAULT 0,
      usage_limit_total INTEGER,
      usage_limit_per_user INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
      display_priority INTEGER DEFAULT 0,
      banner_image_url TEXT,
      terms_and_conditions TEXT,
      terms_and_conditions_th TEXT,
      copilot_suggestion_enabled BOOLEAN DEFAULT 0,
      copilot_trigger_keywords TEXT, -- JSON array
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Personal Promotions (targeted offers)
  personal_promotions: `
    CREATE TABLE IF NOT EXISTS personal_promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_th TEXT,
      description TEXT NOT NULL,
      description_th TEXT,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_gift', 'points_bonus', 'tier_upgrade')),
      discount_value INTEGER,
      max_discount_amount INTEGER,
      benefits_summary TEXT, -- JSON object
      target_tiers TEXT, -- JSON array
      target_min_tenure_months INTEGER,
      target_max_tenure_months INTEGER,
      target_account_age_years INTEGER,
      trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK(trigger_type IN ('manual', 'auto_escalation', 'auto_churn_risk', 'auto_birthday', 'auto_anniversary', 'auto_inactive')),
      trigger_conditions TEXT, -- JSON object
      auto_apply BOOLEAN DEFAULT 0,
      require_operator_approval BOOLEAN DEFAULT 1,
      usage_limit_total INTEGER,
      usage_limit_per_user INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'expired', 'disabled')),
      display_priority INTEGER DEFAULT 0,
      notification_message TEXT,
      notification_message_th TEXT,
      copilot_card_title TEXT,
      copilot_card_title_th TEXT,
      copilot_suggestion_script TEXT,
      copilot_suggestion_script_th TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  // Offers indexes
  {
    name: 'idx_general_promotions_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_general_promotions_status ON general_promotions(status)`
  },
  {
    name: 'idx_general_promotions_priority',
    sql: `CREATE INDEX IF NOT EXISTS idx_general_promotions_priority ON general_promotions(display_priority DESC)`
  },
  {
    name: 'idx_personal_promotions_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_personal_promotions_status ON personal_promotions(status)`
  },
  {
    name: 'idx_personal_promotions_priority',
    sql: `CREATE INDEX IF NOT EXISTS idx_personal_promotions_priority ON personal_promotions(display_priority DESC)`
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
  // Add is_active column to qa_criteria for soft delete
  {
    name: 'add_qa_criteria_is_active',
    sql: `ALTER TABLE qa_criteria ADD COLUMN is_active BOOLEAN DEFAULT 1;`,
    fallback: 'Column may already exist'
  },
  // Add parent_criteria_id for sub-criteria support
  {
    name: 'add_qa_criteria_parent_id',
    sql: `ALTER TABLE qa_criteria ADD COLUMN parent_criteria_id TEXT REFERENCES qa_criteria(id) ON DELETE CASCADE;`,
    fallback: 'Column may already exist'
  },
  // Create qa_config_weights table
  {
    name: 'create_qa_config_weights_table',
    sql: `
      CREATE TABLE IF NOT EXISTS qa_config_weights (
        id TEXT PRIMARY KEY,
        config_id TEXT DEFAULT 'default',
        criteria_id TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 0,
        auto_calculate BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES qa_config(id) ON DELETE CASCADE,
        FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id) ON DELETE CASCADE,
        UNIQUE(config_id, criteria_id)
      )
    `,
    fallback: 'Table may already exist'
  },
  // Create sub_criteria_scores table
  {
    name: 'create_sub_criteria_scores_table',
    sql: `
      CREATE TABLE IF NOT EXISTS sub_criteria_scores (
        id TEXT PRIMARY KEY,
        parent_score_id TEXT NOT NULL,
        score_type TEXT NOT NULL CHECK(score_type IN ('ai', 'human')),
        criteria_id TEXT NOT NULL,
        score INTEGER CHECK(score BETWEEN 1 AND 5),
        reasoning TEXT,
        comment TEXT,
        FOREIGN KEY (criteria_id) REFERENCES qa_criteria(id) ON DELETE CASCADE
      )
    `,
    fallback: 'Table may already exist'
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
    
    // Seed default QA criteria (SKIPPED - user will create their own)
    console.log('  Seeding QA criteria... SKIPPED (user-managed)');
    // await seedQACriteria();
    
    // Seed sample promotions
    console.log('  Seeding sample promotions...');
    await seedSamplePromotions();
    
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

/**
 * Seed sample promotions for development/testing
 */
export async function seedSamplePromotions(): Promise<void> {
  try {
    // Check if general promotions exist
    const generalResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM general_promotions',
      args: []
    });
    
    const generalCount = (generalResult.rows[0]?.count as number) || 0;
    
    if (generalCount === 0) {
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Insert sample general promotions
      const generalPromos = [
        {
          id: 'promo_the1_5th',
          name: 'The 1 5th Anniversary',
          name_th: 'ฉลองครบรอบ 5 ปี The 1',
          description: 'Celebrate with exclusive rewards: ฿4,300 in coupons, bonus points, and status extension for The 1 members.',
          description_th: 'ฉลองด้วยรางวัลพิเศษ: คูปอง 4,300 บาท คะแนนพิเศษ และต่ออายุสถานะสำหรับสมาชิก The 1',
          promo_code: 'THE1-5TH-ANNIVERSARY',
          discount_type: 'percentage',
          discount_value: 15,
          max_discount_amount: 1000,
          min_order_amount: 500,
          usage_limit_total: 10000,
          usage_limit_per_user: 1,
          start_date: now.toISOString(),
          end_date: oneMonthLater.toISOString(),
          status: 'active',
          display_priority: 100,
          copilot_suggestion_enabled: 1,
          copilot_trigger_keywords: JSON.stringify(['anniversary', 'promotion', 'the 1', 'coupon'])
        },
        {
          id: 'promo_welcome_new',
          name: 'New Member Welcome',
          name_th: 'ต้อนรับสมาชิกใหม่',
          description: 'Special 20% discount for new members on their first purchase.',
          description_th: 'ส่วนลดพิเศษ 20% สำหรับสมาชิกใหม่ในการซื้อครั้งแรก',
          promo_code: 'WELCOME20',
          discount_type: 'percentage',
          discount_value: 20,
          max_discount_amount: 500,
          min_order_amount: 300,
          usage_limit_total: null,
          usage_limit_per_user: 1,
          start_date: now.toISOString(),
          end_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          display_priority: 90,
          copilot_suggestion_enabled: 1,
          copilot_trigger_keywords: JSON.stringify(['new member', 'first purchase', 'welcome'])
        },
        {
          id: 'promo_free_ship',
          name: 'Free Shipping Campaign',
          name_th: 'แคมเปญส่งฟรี',
          description: 'Free shipping on orders over ฿1,000.',
          description_th: 'ส่งฟรีสำหรับการสั่งซื้อ 1,000 บาทขึ้นไป',
          promo_code: 'FREESHIP',
          discount_type: 'free_shipping',
          discount_value: null,
          max_discount_amount: null,
          min_order_amount: 1000,
          usage_limit_total: 5000,
          usage_limit_per_user: 3,
          start_date: now.toISOString(),
          end_date: oneMonthLater.toISOString(),
          status: 'active',
          display_priority: 80,
          copilot_suggestion_enabled: 0,
          copilot_trigger_keywords: JSON.stringify(['shipping', 'delivery'])
        }
      ];
      
      for (const p of generalPromos) {
        await db.execute({
          sql: `
            INSERT INTO general_promotions (
              id, name, name_th, description, description_th, promo_code, discount_type,
              discount_value, max_discount_amount, min_order_amount, usage_limit_total,
              usage_limit_per_user, start_date, end_date, status, display_priority,
              copilot_suggestion_enabled, copilot_trigger_keywords, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `,
          args: [
            p.id, p.name, p.name_th, p.description, p.description_th, p.promo_code,
            p.discount_type, p.discount_value, p.max_discount_amount, p.min_order_amount,
            p.usage_limit_total, p.usage_limit_per_user, p.start_date, p.end_date,
            p.status, p.display_priority, p.copilot_suggestion_enabled, p.copilot_trigger_keywords
          ]
        });
      }
      
      console.log('[Database] Seeded 3 sample general promotions');
    }
    
    // Check if personal promotions exist
    const personalResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM personal_promotions',
      args: []
    });
    
    const personalCount = (personalResult.rows[0]?.count as number) || 0;
    
    if (personalCount === 0) {
      const now = new Date();
      
      // Insert sample personal promotions
      const personalPromos = [
        {
          id: 'personal_gold_retention',
          name: 'Gold Member Retention Offer',
          name_th: 'ข้อเสนอรักษาสมาชิก Gold',
          description: 'Exclusive 15% discount + 5,000 bonus points for Gold members at risk of churning.',
          description_th: 'ส่วนลดพิเศษ 15% + คะแนนพิเศษ 5,000 คะแนนสำหรับสมาชิก Gold ที่มีความเสี่ยงลด',
          discount_type: 'percentage',
          discount_value: 15,
          max_discount_amount: 2000,
          benefits_summary: JSON.stringify({
            discount_percent: 15,
            extra_points: 5000,
            tier_extension_months: 6
          }),
          target_tiers: JSON.stringify(['Gold', 'Platinum']),
          target_min_tenure_months: 12,
          trigger_type: 'auto_churn_risk',
          auto_apply: 0,
          require_operator_approval: 1,
          usage_limit_total: null,
          usage_limit_per_user: 1,
          start_date: now.toISOString(),
          status: 'active',
          display_priority: 100,
          copilot_card_title: 'Retention Offer Available',
          copilot_card_title_th: 'มีข้อเสนอรักษาสมาชิก',
          copilot_suggestion_script: 'I see you\'re a valued Gold member. I\'d like to offer you a special 15% discount and 5,000 bonus points as our appreciation for your loyalty.',
          copilot_suggestion_script_th: 'ฉันเห็นว่าคุณเป็นสมาชิก Gold ที่มีค่า ฉันขอเสนอส่วนลดพิเศษ 15% และคะแนนพิเศษ 5,000 คะแนนเพื่อแสดงความขอบคุณสำหรับความภักดีของคุณ'
        },
        {
          id: 'personal_5year_milestone',
          name: '5-Year Milestone Reward',
          name_th: 'รางวัลครบรอบ 5 ปี',
          description: '฿500 credit reward for members who have been with us for 5+ years.',
          description_th: 'เครดิตรางวัล 500 บาทสำหรับสมาชิกที่อยู่กับเรามา 5 ปีขึ้นไป',
          discount_type: 'fixed_amount',
          discount_value: 500,
          max_discount_amount: null,
          benefits_summary: JSON.stringify({
            discount_amount: 500,
            welcome_gift: true
          }),
          target_tiers: JSON.stringify(['Silver', 'Gold', 'Platinum']),
          target_min_tenure_months: 48,
          trigger_type: 'auto_anniversary',
          auto_apply: 1,
          require_operator_approval: 0,
          usage_limit_total: null,
          usage_limit_per_user: 1,
          start_date: now.toISOString(),
          status: 'active',
          display_priority: 90,
          copilot_card_title: 'Milestone Anniversary',
          copilot_card_title_th: 'ครบรอบสำคัญ',
          copilot_suggestion_script: 'Congratulations on your 5-year anniversary with us! As a thank you, we\'ve credited ฿500 to your account.',
          copilot_suggestion_script_th: 'ขอแสดงความยินดีกับครบรอบ 5 ปีของคุณกับเรา! เพื่อเป็นการขอบคุณ เราได้เครดิต 500 บาทเข้าบัญชีของคุณแล้ว'
        },
        {
          id: 'personal_escalation_offer',
          name: 'Service Recovery Offer',
          name_th: 'ข้อเสนอชดเชยบริการ',
          description: 'Automatic offer for customers who escalate complaints.',
          description_th: 'ข้อเสนออัตโนมัติสำหรับลูกค้าที่ยื่นข้อร้องเรียน',
          discount_type: 'points_bonus',
          discount_value: 2000,
          max_discount_amount: null,
          benefits_summary: JSON.stringify({
            extra_points: 2000,
            free_shipping_months: true
          }),
          target_tiers: JSON.stringify(['All']),
          trigger_type: 'auto_escalation',
          auto_apply: 0,
          require_operator_approval: 1,
          usage_limit_total: null,
          usage_limit_per_user: 1,
          start_date: now.toISOString(),
          status: 'active',
          display_priority: 95,
          copilot_card_title: 'Escalation Compensation',
          copilot_card_title_th: 'การชดเชยสำหรับข้อร้องเรียน',
          copilot_suggestion_script: 'I sincerely apologize for the inconvenience. I\'d like to offer you 2,000 bonus points and free shipping for the next month as compensation.',
          copilot_suggestion_script_th: 'ฉันขออภัยอย่างสุดซึ้งสำหรับความไม่สะดวก ฉันขอเสนอคะแนนพิเศษ 2,000 คะแนนและส่งฟรีสำหรับเดือนหน้าเป็นการชดเชย'
        }
      ];
      
      for (const p of personalPromos) {
        await db.execute({
          sql: `
            INSERT INTO personal_promotions (
              id, name, name_th, description, description_th, discount_type, discount_value,
              max_discount_amount, benefits_summary, target_tiers, target_min_tenure_months,
              trigger_type, auto_apply, require_operator_approval, usage_limit_total,
              usage_limit_per_user, start_date, status, display_priority, copilot_card_title,
              copilot_card_title_th, copilot_suggestion_script, copilot_suggestion_script_th,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `,
          args: [
            p.id, p.name, p.name_th, p.description, p.description_th, p.discount_type,
            p.discount_value, p.max_discount_amount, p.benefits_summary, p.target_tiers,
            p.target_min_tenure_months, p.trigger_type, p.auto_apply, p.require_operator_approval,
            p.usage_limit_total, p.usage_limit_per_user, p.start_date, p.status,
            p.display_priority, p.copilot_card_title, p.copilot_card_title_th,
            p.copilot_suggestion_script, p.copilot_suggestion_script_th
          ]
        });
      }
      
      console.log('[Database] Seeded 3 sample personal promotions');
    }
  } catch (error) {
    console.error('[Database] Error seeding sample promotions:', error);
  }
}

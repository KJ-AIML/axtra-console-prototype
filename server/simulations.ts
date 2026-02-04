/**
 * Simulations Service
 * Handles training scenarios, user progress, and simulation sessions
 */

import { db } from './db';
import { randomUUID } from 'crypto';

// Types
export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category: string;
  persona: string;
  isRecommended: boolean;
  rating: number;
  completions: number;
  sortOrder: number;
  createdAt: string;
}

export interface UserScenario {
  id: string;
  userId: string;
  scenarioId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  feedback?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationSession {
  id: string;
  userId: string;
  scenarioId: string;
  transcript: string; // JSON string
  aiSuggestions: string; // JSON string
  emotionLog: string; // JSON string
  duration: number; // seconds
  score?: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all scenarios
 */
export async function getAllScenarios(): Promise<Scenario[]> {
  const result = await db.execute({
    sql: `
      SELECT id, title, description, difficulty, duration, type, category, 
             COALESCE(persona, 'Customer') as persona,
             COALESCE(rating, 4.5) as rating,
             COALESCE(completions, 0) as completions,
             is_recommended, sort_order, created_at
      FROM scenarios
      ORDER BY sort_order ASC
    `,
    args: [],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    duration: row.duration as string,
    type: row.type as string,
    category: row.category as string,
    persona: row.persona as string,
    isRecommended: (row.is_recommended as number) === 1,
    rating: row.rating as number,
    completions: row.completions as number,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: row.created_at as string,
  }));
}

/**
 * Get scenarios with user progress
 */
export async function getScenariosWithProgress(userId: string): Promise<(Scenario & { status: string; userScore?: number })[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        s.id, s.title, s.description, s.difficulty, s.duration, s.type, 
        s.category, 
        COALESCE(s.persona, 'Customer') as persona,
        COALESCE(s.rating, 4.5) as rating,
        COALESCE(s.completions, 0) as completions,
        s.is_recommended, s.sort_order, s.created_at,
        COALESCE(us.status, 'not_started') as user_status,
        us.score as user_score
      FROM scenarios s
      LEFT JOIN user_scenarios us ON s.id = us.scenario_id AND us.user_id = ?
      ORDER BY s.sort_order ASC
    `,
    args: [userId],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    duration: row.duration as string,
    type: row.type as string,
    category: row.category as string,
    persona: row.persona as string,
    isRecommended: (row.is_recommended as number) === 1,
    rating: row.rating as number,
    completions: row.completions as number,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: row.created_at as string,
    status: row.user_status as string,
    userScore: row.user_score as number | undefined,
  }));
}

/**
 * Get a single scenario by ID
 */
export async function getScenarioById(scenarioId: string): Promise<Scenario | null> {
  const result = await db.execute({
    sql: `
      SELECT id, title, description, difficulty, duration, type, category,
             COALESCE(persona, 'Customer') as persona,
             COALESCE(rating, 4.5) as rating,
             COALESCE(completions, 0) as completions,
             is_recommended, sort_order, created_at
      FROM scenarios
      WHERE id = ?
    `,
    args: [scenarioId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    duration: row.duration as string,
    type: row.type as string,
    category: row.category as string,
    persona: row.persona as string,
    isRecommended: (row.is_recommended as number) === 1,
    rating: row.rating as number,
    completions: row.completions as number,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: row.created_at as string,
  };
}

/**
 * Start a simulation session
 */
export async function startSimulation(userId: string, scenarioId: string): Promise<UserScenario> {
  const now = new Date().toISOString();
  const id = randomUUID();

  // Check if user_scenario exists
  const existing = await db.execute({
    sql: 'SELECT id FROM user_scenarios WHERE user_id = ? AND scenario_id = ?',
    args: [userId, scenarioId],
  });

  if (existing.rows.length === 0) {
    // Create new user_scenario
    await db.execute({
      sql: `
        INSERT INTO user_scenarios (id, user_id, scenario_id, status, started_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, scenarioId, 'in_progress', now, now, now],
    });
  } else {
    // Update existing
    await db.execute({
      sql: `
        UPDATE user_scenarios 
        SET status = ?, started_at = ?, updated_at = ?
        WHERE user_id = ? AND scenario_id = ?
      `,
      args: ['in_progress', now, now, userId, scenarioId],
    });
  }

  return {
    id,
    userId,
    scenarioId,
    status: 'in_progress',
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Complete a simulation session
 */
export async function completeSimulation(
  userId: string, 
  scenarioId: string, 
  score: number,
  feedback?: string
): Promise<void> {
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE user_scenarios 
      SET status = ?, score = ?, feedback = ?, completed_at = ?, updated_at = ?
      WHERE user_id = ? AND scenario_id = ?
    `,
    args: ['completed', score, feedback || null, now, now, userId, scenarioId],
  });

  // Increment scenario completions count
  await db.execute({
    sql: 'UPDATE scenarios SET completions = completions + 1 WHERE id = ?',
    args: [scenarioId],
  });
}

/**
 * Get user's simulation stats
 */
export async function getUserSimulationStats(userId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  averageScore: number;
}> {
  const result = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        AVG(score) as avg_score
      FROM user_scenarios
      WHERE user_id = ?
    `,
    args: [userId],
  });

  const row = result.rows[0];
  return {
    total: (row.total as number) || 0,
    completed: (row.completed as number) || 0,
    inProgress: (row.in_progress as number) || 0,
    averageScore: Math.round((row.avg_score as number) || 0),
  };
}

/**
 * Get recommended scenarios for user
 */
export async function getRecommendedScenarios(userId: string, limit: number = 4): Promise<Scenario[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        s.id, s.title, s.description, s.difficulty, s.duration, s.type, 
        s.category, 
        COALESCE(s.persona, 'Customer') as persona,
        COALESCE(s.rating, 4.5) as rating,
        COALESCE(s.completions, 0) as completions,
        s.is_recommended, s.sort_order, s.created_at
      FROM scenarios s
      LEFT JOIN user_scenarios us ON s.id = us.scenario_id AND us.user_id = ?
      WHERE s.is_recommended = 1 
        AND (us.status IS NULL OR us.status = 'not_started')
      ORDER BY s.sort_order ASC
      LIMIT ?
    `,
    args: [userId, limit],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    duration: row.duration as string,
    type: row.type as string,
    category: row.category as string,
    persona: row.persona as string,
    isRecommended: (row.is_recommended as number) === 1,
    rating: row.rating as number,
    completions: row.completions as number,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: row.created_at as string,
  }));
}

// ============================================
// Seed Data
// ============================================

const DEFAULT_SCENARIOS = [
  {
    title: 'Billing Dispute - Aggressive Persona',
    description: 'Handle an angry customer disputing their bill charges. Practice de-escalation and empathy.',
    difficulty: 'Hard',
    duration: '8-12 mins',
    type: 'Voice Simulation',
    category: 'Billing',
    persona: 'Angry Customer',
  },
  {
    title: 'Technical Support - Broadband Connectivity',
    description: 'Help customer troubleshoot internet connectivity issues with patience and clarity.',
    difficulty: 'Medium',
    duration: '15 mins',
    type: 'Knowledge Check',
    category: 'Technical',
    persona: 'Frustrated Senior',
  },
  {
    title: 'New Promotion - Upsell Opportunity',
    description: 'Present new promotional offers to existing customer and handle objections.',
    difficulty: 'Easy',
    duration: '5 mins',
    type: 'Objection Handling',
    category: 'Sales',
    persona: 'Interested Customer',
  },
  {
    title: 'Privacy & Data Protection Verification',
    description: 'Verify customer identity and handle privacy concerns professionally.',
    difficulty: 'Hard',
    duration: '10 mins',
    type: 'Compliance Training',
    category: 'Compliance',
    persona: 'Suspicious Caller',
  },
  {
    title: 'Service Cancellation - Retention',
    description: 'Attempt to retain a customer requesting service cancellation.',
    difficulty: 'Medium',
    duration: '12 mins',
    type: 'Voice Simulation',
    category: 'Retention',
    persona: 'Disappointed Customer',
  },
  {
    title: 'Product Return - Damaged Goods',
    description: 'Process return for damaged product and issue refund with empathy.',
    difficulty: 'Easy',
    duration: '7 mins',
    type: 'Process Training',
    category: 'Returns',
    persona: 'Upset Customer',
  },
  {
    title: 'Premium Upgrade - VIP Handling',
    description: 'Guide premium customer through upgrade process with white-glove service.',
    difficulty: 'Medium',
    duration: '10 mins',
    type: 'Voice Simulation',
    category: 'Sales',
    persona: 'VIP Customer',
  },
  {
    title: 'Fraud Alert - Security Verification',
    description: 'Handle sensitive fraud alert case with security protocols.',
    difficulty: 'Hard',
    duration: '15 mins',
    type: 'Compliance Training',
    category: 'Security',
    persona: 'Panicked Customer',
  },
];

/**
 * Seed default scenarios
 */
export async function seedScenarios(): Promise<void> {
  // Check if columns exist by trying a query
  try {
    await db.execute('SELECT persona FROM scenarios LIMIT 1');
  } catch (error) {
    console.log('⚠️  Adding missing columns to scenarios table...');
    try {
      await db.execute('ALTER TABLE scenarios ADD COLUMN persona TEXT DEFAULT \'Customer\'');
      await db.execute('ALTER TABLE scenarios ADD COLUMN rating REAL DEFAULT 4.5');
      await db.execute('ALTER TABLE scenarios ADD COLUMN completions INTEGER DEFAULT 0');
      console.log('✅ Columns added');
    } catch (alterError) {
      console.log('ℹ️  Columns may already exist or table needs recreation');
    }
  }

  const existing = await db.execute('SELECT COUNT(*) as count FROM scenarios');
  const count = (existing.rows[0].count as number) || 0;

  if (count > 0) {
    console.log(`📋 ${count} scenarios already exist, skipping seed`);
    return;
  }

  console.log('🌱 Seeding scenarios...');

  for (let i = 0; i < DEFAULT_SCENARIOS.length; i++) {
    const s = DEFAULT_SCENARIOS[i];
    await db.execute({
      sql: `
        INSERT INTO scenarios (
          id, title, description, difficulty, duration, type, category, 
          persona, is_recommended, rating, completions, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        s.title,
        s.description,
        s.difficulty,
        s.duration,
        s.type,
        s.category,
        s.persona,
        1, // is_recommended
        4.0 + Math.random(), // random rating 4.0-5.0
        Math.floor(Math.random() * 2000) + 100, // random completions
        i,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });
  }

  console.log(`✅ ${DEFAULT_SCENARIOS.length} scenarios seeded`);
}

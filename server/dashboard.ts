/**
 * Dashboard Service
 * Handles dashboard data: metrics, scenarios, skill velocity, QA highlights
 */

import { db } from './db';
import { randomUUID } from 'crypto';

// Types
export interface UserMetric {
  id: string;
  userId: string;
  metricKey: string;
  metricValue: string;
  subtext?: string;
  sortOrder: number;
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  type: string;
  category?: string;
  isRecommended: boolean;
  sortOrder: number;
}

export interface UserScenario extends Scenario {
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

export interface SkillVelocity {
  id: string;
  userId: string;
  level: number;
  currentXp: number;
  maxXp: number;
  progressPercentage: number;
  description?: string;
}

export interface QaHighlight {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'positive' | 'improvement';
  callId?: string;
  createdAt: string;
}

export interface DashboardData {
  metrics: UserMetric[];
  scenarios: UserScenario[];
  skillVelocity: SkillVelocity | null;
  qaHighlights: QaHighlight[];
}

/**
 * Get user metrics (KPIs)
 */
export async function getUserMetrics(userId: string): Promise<UserMetric[]> {
  const result = await db.execute({
    sql: `
      SELECT id, user_id, metric_key, metric_value, subtext, sort_order
      FROM user_metrics
      WHERE user_id = ?
      ORDER BY sort_order ASC
    `,
    args: [userId],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    metricKey: row.metric_key as string,
    metricValue: row.metric_value as string,
    subtext: row.subtext as string | undefined,
    sortOrder: row.sort_order as number,
  }));
}

/**
 * Get recommended scenarios for user
 */
export async function getUserScenarios(userId: string): Promise<UserScenario[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        s.id, s.title, s.description, s.difficulty, s.duration, s.type, s.category, s.sort_order,
        COALESCE(us.status, 'not_started') as status,
        us.score
      FROM scenarios s
      LEFT JOIN user_scenarios us ON s.id = us.scenario_id AND us.user_id = ?
      WHERE s.is_recommended = 1
      ORDER BY s.sort_order ASC
      LIMIT 10
    `,
    args: [userId],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    duration: row.duration as string,
    type: row.type as string,
    category: row.category as string | undefined,
    isRecommended: true,
    sortOrder: row.sort_order as number,
    status: row.status as 'not_started' | 'in_progress' | 'completed',
    score: row.score as number | undefined,
  }));
}

/**
 * Get user's skill velocity
 */
export async function getSkillVelocity(userId: string): Promise<SkillVelocity | null> {
  const result = await db.execute({
    sql: `
      SELECT id, user_id, level, current_xp, max_xp, progress_percentage, description
      FROM skill_velocity
      WHERE user_id = ?
    `,
    args: [userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    level: row.level as number,
    currentXp: row.current_xp as number,
    maxXp: row.max_xp as number,
    progressPercentage: row.progress_percentage as number,
    description: row.description as string | undefined,
  };
}

/**
 * Get QA highlights for user
 */
export async function getQaHighlights(userId: string): Promise<QaHighlight[]> {
  const result = await db.execute({
    sql: `
      SELECT id, user_id, title, description, type, call_id, created_at
      FROM qa_highlights
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `,
    args: [userId],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    type: row.type as 'positive' | 'improvement',
    callId: row.call_id as string | undefined,
    createdAt: row.created_at as string,
  }));
}

/**
 * Get full dashboard data for user
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [metrics, scenarios, skillVelocity, qaHighlights] = await Promise.all([
    getUserMetrics(userId),
    getUserScenarios(userId),
    getSkillVelocity(userId),
    getQaHighlights(userId),
  ]);

  return {
    metrics,
    scenarios,
    skillVelocity,
    qaHighlights,
  };
}

// ============================================
// Seed Data Functions
// ============================================

/**
 * Seed default scenarios
 */
export async function seedScenarios(): Promise<void> {
  const existing = await db.execute('SELECT COUNT(*) as count FROM scenarios');
  const count = (existing.rows[0].count as number) || 0;

  if (count > 0) {
    return; // Already seeded
  }

  console.log('🌱 Seeding scenarios...');

  const scenarios = [
    {
      title: 'Billing Dispute - Aggressive Persona',
      description: 'Handle an angry customer disputing their bill charges',
      difficulty: 'Hard',
      duration: '8-12 mins',
      type: 'Voice Simulation',
      category: 'Billing',
      sort_order: 1,
    },
    {
      title: 'Technical Support - Broadband Connectivity',
      description: 'Help customer troubleshoot internet connectivity issues',
      difficulty: 'Medium',
      duration: '15 mins',
      type: 'Knowledge Check',
      category: 'Technical',
      sort_order: 2,
    },
    {
      title: 'New Promotion - Upsell Opportunity',
      description: 'Present new promotional offers to existing customer',
      difficulty: 'Easy',
      duration: '5 mins',
      type: 'Objection Handling',
      category: 'Sales',
      sort_order: 3,
    },
    {
      title: 'Privacy & Data Protection Verification',
      description: 'Verify customer identity and handle privacy concerns',
      difficulty: 'Hard',
      duration: '10 mins',
      type: 'Compliance Training',
      category: 'Compliance',
      sort_order: 4,
    },
    {
      title: 'Service Cancellation - Retention',
      description: 'Attempt to retain a customer requesting cancellation',
      difficulty: 'Medium',
      duration: '12 mins',
      type: 'Voice Simulation',
      category: 'Retention',
      sort_order: 5,
    },
    {
      title: 'Product Return - Damaged Goods',
      description: 'Process return for damaged product and issue refund',
      difficulty: 'Easy',
      duration: '7 mins',
      type: 'Process Training',
      category: 'Returns',
      sort_order: 6,
    },
  ];

  for (const scenario of scenarios) {
    await db.execute({
      sql: `
        INSERT INTO scenarios (id, title, description, difficulty, duration, type, category, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        scenario.title,
        scenario.description,
        scenario.difficulty,
        scenario.duration,
        scenario.type,
        scenario.category,
        scenario.sort_order,
      ],
    });
  }

  console.log(`  ✓ ${scenarios.length} scenarios created`);
}

/**
 * Seed user dashboard data (metrics, skill velocity, QA highlights)
 */
export async function seedUserDashboardData(userId: string): Promise<void> {
  // Check if user already has metrics
  const existing = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_metrics WHERE user_id = ?',
    args: [userId],
  });

  if ((existing.rows[0].count as number) > 0) {
    return; // Already seeded
  }

  console.log(`🌱 Seeding dashboard data for user ${userId}...`);

  // Seed metrics
  const metrics = [
    { key: 'aht', value: '4m 22s', subtext: '-12% from target', order: 1 },
    { key: 'fcr', value: '84.2%', subtext: '+2.1% this week', order: 2 },
    { key: 'qa_score', value: '92/100', subtext: 'Top 5% of team', order: 3 },
    { key: 'compliance', value: '100%', subtext: 'No violations detected', order: 4 },
    { key: 'escalation', value: '4.1%', subtext: 'Below industry avg', order: 5 },
  ];

  for (const metric of metrics) {
    await db.execute({
      sql: `
        INSERT INTO user_metrics (id, user_id, metric_key, metric_value, subtext, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [randomUUID(), userId, metric.key, metric.value, metric.subtext, metric.order],
    });
  }
  console.log(`  ✓ ${metrics.length} metrics created`);

  // Seed skill velocity
  await db.execute({
    sql: `
      INSERT INTO skill_velocity (id, user_id, level, current_xp, max_xp, progress_percentage, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      userId,
      8, // level
      75, // current_xp (percentage)
      100, // max_xp
      75, // progress_percentage
      "You've completed 4 scenarios this week. You're ready for more complex billing disputes.",
    ],
  });
  console.log('  ✓ Skill velocity created');

  // Seed QA highlights
  const highlights = [
    {
      title: 'Excellent Empathy',
      description: 'Detected in call #4829 - "You handled the customer frustration perfectly."',
      type: 'positive',
      callId: '4829',
    },
    {
      title: 'Closing Script Gap',
      description: 'Missed required disclosure in call #4811. Reviewing recommended.',
      type: 'improvement',
      callId: '4811',
    },
    {
      title: 'Quick Resolution',
      description: 'Resolved customer issue in under 3 minutes. Great efficiency!',
      type: 'positive',
      callId: '4835',
    },
  ];

  for (const highlight of highlights) {
    await db.execute({
      sql: `
        INSERT INTO qa_highlights (id, user_id, title, description, type, call_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        userId,
        highlight.title,
        highlight.description,
        highlight.type,
        highlight.callId,
      ],
    });
  }
  console.log(`  ✓ ${highlights.length} QA highlights created`);
}

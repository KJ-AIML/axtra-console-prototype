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

export interface RecentCall {
  id: string;
  scenarioTitle: string;
  difficulty: string;
  duration: string;
  score?: number;
  customerSentiment: string;
  completedAt: string;
}

export interface CallStats {
  totalCalls: number;
  averageScore: number;
  totalCoaching: number;
  completionRate: number;
}

export interface DashboardData {
  metrics: UserMetric[];
  scenarios: UserScenario[];
  skillVelocity: SkillVelocity | null;
  qaHighlights: QaHighlight[];
  recentCalls: RecentCall[];
  callStats: CallStats;
}

/**
 * Calculate and get user metrics (KPIs) from real call data
 */
export async function getUserMetrics(userId: string): Promise<UserMetric[]> {
  // Get call sessions data for calculations (join with summaries for satisfaction score)
  const callsResult = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total_calls,
        AVG(cs.customer_satisfaction) as avg_satisfaction,
        AVG(CAST((julianday(sess.ended_at) - julianday(sess.started_at)) * 24 * 60 * 60 as INTEGER)) as avg_duration_sec,
        SUM(CASE WHEN cs.resolution_status = 'escalated' THEN 1 ELSE 0 END) as escalations
      FROM call_sessions sess
      LEFT JOIN call_summaries cs ON sess.id = cs.call_id
      WHERE sess.user_id = ? AND sess.status = 'ended' AND sess.ended_at IS NOT NULL
    `,
    args: [userId],
  });

  const row = callsResult.rows[0];
  const totalCalls = Number(row?.total_calls || 0);
  const avgSatisfaction = Number(row?.avg_satisfaction || 0);
  const avgDurationSec = Number(row?.avg_duration_sec || 0);
  const escalations = Number(row?.escalations || 0);

  // Get completion rate
  const completionResult = await db.execute({
    sql: `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM user_scenarios
      WHERE user_id = ?
    `,
    args: [userId],
  });

  const completed = Number(completionResult.rows[0]?.completed || 0);
  const totalScenarios = Number(completionResult.rows[0]?.total || 0);
  const completionRate = totalScenarios > 0 ? Math.round((completed / totalScenarios) * 100) : 0;

  // Calculate metrics from real data
  const avgDurationMin = Math.floor(avgDurationSec / 60);
  const avgDurationRemSec = Math.floor(avgDurationSec % 60);
  
  // FCR (First Call Resolution) - estimate from non-escalated calls
  const fcrRate = totalCalls > 0 ? Math.round(((totalCalls - escalations) / totalCalls) * 100) : 0;
  
  // Escalation rate
  const escalationRate = totalCalls > 0 ? ((escalations / totalCalls) * 100).toFixed(1) : '0.0';

  // Format metrics
  const metrics: UserMetric[] = [
    {
      id: 'metric-aht',
      userId,
      metricKey: 'aht',
      metricValue: totalCalls > 0 ? `${avgDurationMin}m ${avgDurationRemSec.toString().padStart(2, '0')}s` : '0m 00s',
      subtext: totalCalls > 0 ? `${totalCalls} calls handled` : 'No calls yet',
      sortOrder: 1,
    },
    {
      id: 'metric-fcr',
      userId,
      metricKey: 'fcr',
      metricValue: `${fcrRate}%`,
      subtext: totalCalls > 0 ? `${escalations} escalations` : 'No data',
      sortOrder: 2,
    },
    {
      id: 'metric-satisfaction',
      userId,
      metricKey: 'satisfaction',
      metricValue: avgSatisfaction > 0 ? `${avgSatisfaction.toFixed(1)}/5` : '-/5',
      subtext: totalCalls > 0 ? 'Average customer satisfaction' : 'Complete a call to get scored',
      sortOrder: 3,
    },
    {
      id: 'metric-completion',
      userId,
      metricKey: 'completion',
      metricValue: `${completionRate}%`,
      subtext: `${completed}/${totalScenarios} scenarios completed`,
      sortOrder: 4,
    },
    {
      id: 'metric-escalation',
      userId,
      metricKey: 'escalation',
      metricValue: `${escalationRate}%`,
      subtext: totalCalls > 0 ? 'Escalation rate' : 'No data',
      sortOrder: 5,
    },
  ];

  return metrics;
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
 * Get user's skill velocity (calculated from real scenario progress)
 */
export async function getSkillVelocity(userId: string): Promise<SkillVelocity | null> {
  // Calculate from real user scenario progress
  const progressResult = await db.execute({
    sql: `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM user_scenarios
      WHERE user_id = ?
    `,
    args: [userId],
  });

  const completed = Number(progressResult.rows[0]?.completed || 0);
  const total = Number(progressResult.rows[0]?.total || 0);
  
  if (total === 0) {
    return null; // No scenarios assigned yet
  }

  const progressPercentage = Math.round((completed / total) * 100);
  
  // Calculate level based on completed scenarios (every 5 scenarios = 1 level, max 20)
  const level = Math.min(20, Math.max(1, Math.floor(completed / 5) + 1));
  
  // Calculate XP within current level
  const scenariosInCurrentLevel = completed % 5;
  const currentXp = Math.round((scenariosInCurrentLevel / 5) * 100);

  return {
    id: `sv-${userId}`,
    userId,
    level,
    currentXp,
    maxXp: 100,
    progressPercentage,
    description: completed > 0 
      ? `You've completed ${completed} scenario${completed !== 1 ? 's' : ''}. Keep practicing to level up!`
      : "Start your first scenario to begin your training journey.",
  };
}

/**
 * Get QA highlights for user (from real QA reviews)
 */
export async function getQaHighlights(userId: string): Promise<QaHighlight[]> {
  // First, try to get from real human QA reviews (join with scenarios for title)
  const humanReviewsResult = await db.execute({
    sql: `
      SELECT 
        hqr.id,
        hqr.call_id,
        hqr.overall_score,
        hqr.status,
        s.title as scenario_title,
        hqr.created_at
      FROM human_qa_reviews hqr
      JOIN call_sessions cs ON hqr.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE hqr.reviewer_id = ?
      ORDER BY hqr.created_at DESC
      LIMIT 5
    `,
    args: [userId],
  });

  if (humanReviewsResult.rows.length > 0) {
    return humanReviewsResult.rows.map(row => {
      const score = Number(row.overall_score);
      const isPositive = score >= 80;
      return {
        id: row.id as string,
        userId,
        title: isPositive ? 'Strong Performance' : 'Areas for Improvement',
        description: `${isPositive ? 'Great job' : 'Review needed'} on "${row.scenario_title}" - scored ${score}/100`,
        type: isPositive ? 'positive' : 'improvement',
        callId: row.call_id as string,
        createdAt: row.created_at as string,
      };
    });
  }

  // Fall back to AI QA results if no human reviews
  const aiReviewsResult = await db.execute({
    sql: `
      SELECT 
        aqr.id,
        aqr.call_id,
        aqr.overall_score,
        s.title as scenario_title,
        aqr.created_at
      FROM ai_qa_results aqr
      JOIN call_sessions cs ON aqr.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.user_id = ?
      ORDER BY aqr.created_at DESC
      LIMIT 5
    `,
    args: [userId],
  });

  if (aiReviewsResult.rows.length > 0) {
    return aiReviewsResult.rows.map(row => {
      const score = Number(row.overall_score);
      const isPositive = score >= 80;
      return {
        id: row.id as string,
        userId,
        title: isPositive ? 'AI: Strong Performance' : 'AI: Areas for Improvement',
        description: `${isPositive ? 'Great job' : 'Practice recommended'} on "${row.scenario_title}" - AI scored ${score}/100`,
        type: isPositive ? 'positive' : 'improvement',
        callId: row.call_id as string,
        createdAt: row.created_at as string,
      };
    });
  }

  // Return empty if no QA data yet
  return [];
}

/**
 * Get recent calls for user
 */
export async function getRecentCalls(userId: string, limit: number = 5): Promise<RecentCall[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id,
        s.title as scenario_title,
        s.difficulty,
        cs.duration_seconds,
        cs.final_score as score,
        cs.customer_sentiment,
        cs.ended_at as completed_at
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.user_id = ? AND cs.status = 'completed'
      ORDER BY cs.ended_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });

  return result.rows.map(row => ({
    id: row.id as string,
    scenarioTitle: row.scenario_title as string,
    difficulty: row.difficulty as string,
    duration: formatDuration(row.duration_seconds as number),
    score: row.score as number | undefined,
    customerSentiment: row.customer_sentiment as string,
    completedAt: row.completed_at as string,
  }));
}

/**
 * Get call statistics
 */
export async function getCallStats(userId: string): Promise<CallStats> {
  // Get total calls and average score
  const callsResult = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total,
        AVG(final_score) as avg_score
      FROM call_sessions
      WHERE user_id = ? AND status = 'completed'
    `,
    args: [userId],
  });

  // Get total coaching count
  const coachingResult = await db.execute({
    sql: `
      SELECT COUNT(*) as total
      FROM call_coaching cc
      JOIN call_sessions cs ON cc.call_id = cs.id
      WHERE cs.user_id = ?
    `,
    args: [userId],
  });

  // Get completion rate (completed vs total scenarios)
  const completionResult = await db.execute({
    sql: `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM user_scenarios
      WHERE user_id = ?
    `,
    args: [userId],
  });

  const totalCalls = Number(callsResult.rows[0]?.total || 0);
  const avgScore = Number(callsResult.rows[0]?.avg_score || 0);
  const totalCoaching = Number(coachingResult.rows[0]?.total || 0);
  const completed = Number(completionResult.rows[0]?.completed || 0);
  const totalScenarios = Number(completionResult.rows[0]?.total || 1);

  return {
    totalCalls,
    averageScore: Math.round(avgScore),
    totalCoaching,
    completionRate: Math.round((completed / totalScenarios) * 100),
  };
}

// Helper to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get full dashboard data for user
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [metrics, scenarios, skillVelocity, qaHighlights, recentCalls, callStats] = await Promise.all([
    getUserMetrics(userId),
    getUserScenarios(userId),
    getSkillVelocity(userId),
    getQaHighlights(userId),
    getRecentCalls(userId),
    getCallStats(userId),
  ]);

  return {
    metrics,
    scenarios,
    skillVelocity,
    qaHighlights,
    recentCalls,
    callStats,
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
 * Seed user dashboard data (skill velocity, QA highlights)
 * Note: Metrics are now calculated dynamically from call data
 */
export async function seedUserDashboardData(userId: string): Promise<void> {
  // Check if user already has skill velocity
  const existing = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM skill_velocity WHERE user_id = ?',
    args: [userId],
  });

  if ((existing.rows[0].count as number) > 0) {
    return; // Already seeded
  }

  console.log(`🌱 Seeding dashboard data for user ${userId}...`);

  // Note: Metrics are now calculated dynamically from real call data in getUserMetrics()

  // Seed skill velocity (calculated from real scenario progress)
  const progressResult = await db.execute({
    sql: `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM user_scenarios
      WHERE user_id = ?
    `,
    args: [userId],
  });

  const completed = Number(progressResult.rows[0]?.completed || 0);
  const total = Number(progressResult.rows[0]?.total || 1);
  const progressPercentage = Math.round((completed / total) * 100);
  
  // Calculate level based on completed scenarios (every 5 scenarios = 1 level)
  const level = Math.max(1, Math.floor(completed / 5) + 1);

  await db.execute({
    sql: `
      INSERT INTO skill_velocity (id, user_id, level, current_xp, max_xp, progress_percentage, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      userId,
      level,
      progressPercentage,
      100,
      progressPercentage,
      completed > 0 
        ? `You've completed ${completed} scenarios. Keep practicing to level up!`
        : "Start your first scenario to begin your training journey.",
    ],
  });
  console.log('  ✓ Skill velocity created');

  // QA highlights are now generated from real QA reviews
  console.log('  ℹ️ QA highlights will appear after QA reviews are completed');
}

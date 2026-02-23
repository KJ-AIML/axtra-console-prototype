/**
 * QA Scoring Service
 * Manual scoring and review system for call recordings
 */

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface QAScore {
  id: string;
  call_id: string;
  scorer_id: string;
  scored_at: string;
  
  // Score categories (1-5 scale)
  professionalism: number;
  empathy: number;
  problem_solving: number;
  script_adherence: number;
  tone_manner: number;
  
  // Overall
  overall_score: number;
  
  // Comments
  strengths: string;
  improvements: string;
  general_notes: string;
  
  // Status
  status: 'draft' | 'submitted' | 'approved';
}

export interface QAScoreInput {
  call_id: string;
  scorer_id: string;
  professionalism: number;
  empathy: number;
  problem_solving: number;
  script_adherence: number;
  tone_manner: number;
  overall_score: number;
  strengths?: string;
  improvements?: string;
  general_notes?: string;
  status?: 'draft' | 'submitted' | 'approved';
}

export interface QAScoreSummary {
  call_id: string;
  has_qa_score: boolean;
  qa_score?: QAScore;
  ai_score?: {
    customer_satisfaction: number;
    coaching_effectiveness: number;
    resolution_status: string;
  };
  score_comparison?: {
    qa_overall: number;
    ai_overall: number;
    difference: number;
  };
}

export interface QARubricItem {
  category: string;
  description: string;
  criteria: {
    score: number;
    label: string;
    description: string;
  }[];
}

// Standard QA Rubric
export const QA_RUBRIC: QARubricItem[] = [
  {
    category: 'professionalism',
    description: 'Maintains professional demeanor throughout the call',
    criteria: [
      { score: 1, label: 'Poor', description: 'Unprofessional behavior, inappropriate language' },
      { score: 2, label: 'Below Average', description: 'Occasionally unprofessional, lacks polish' },
      { score: 3, label: 'Average', description: 'Generally professional, minor issues' },
      { score: 4, label: 'Good', description: 'Consistently professional and courteous' },
      { score: 5, label: 'Excellent', description: 'Exemplary professionalism throughout' },
    ],
  },
  {
    category: 'empathy',
    description: 'Shows understanding and compassion for customer concerns',
    criteria: [
      { score: 1, label: 'Poor', description: 'Dismissive or indifferent to customer feelings' },
      { score: 2, label: 'Below Average', description: 'Minimal acknowledgment of customer emotions' },
      { score: 3, label: 'Average', description: 'Shows basic empathy, could be more genuine' },
      { score: 4, label: 'Good', description: 'Demonstrates good understanding of customer perspective' },
      { score: 5, label: 'Excellent', description: 'Deep empathy, makes customer feel truly heard' },
    ],
  },
  {
    category: 'problem_solving',
    description: 'Effectively identifies and resolves customer issues',
    criteria: [
      { score: 1, label: 'Poor', description: 'Unable to identify or resolve the issue' },
      { score: 2, label: 'Below Average', description: 'Struggles to find solutions, needs guidance' },
      { score: 3, label: 'Average', description: 'Resolves basic issues, may miss complex ones' },
      { score: 4, label: 'Good', description: 'Effective problem solver, finds good solutions' },
      { score: 5, label: 'Excellent', description: 'Exceptional problem solver, creative solutions' },
    ],
  },
  {
    category: 'script_adherence',
    description: 'Follows approved scripts and procedures appropriately',
    criteria: [
      { score: 1, label: 'Poor', description: 'Ignores scripts, goes completely off-track' },
      { score: 2, label: 'Below Average', description: 'Frequently deviates from required procedures' },
      { score: 3, label: 'Average', description: 'Generally follows scripts, some deviations' },
      { score: 4, label: 'Good', description: 'Follows scripts well, adapts when needed' },
      { score: 5, label: 'Excellent', description: 'Perfect adherence, knows when to adapt' },
    ],
  },
  {
    category: 'tone_manner',
    description: 'Uses appropriate tone, pace, and communication style',
    criteria: [
      { score: 1, label: 'Poor', description: 'Inappropriate tone, rude or condescending' },
      { score: 2, label: 'Below Average', description: 'Tone often mismatched to situation' },
      { score: 3, label: 'Average', description: 'Generally appropriate tone' },
      { score: 4, label: 'Good', description: 'Well-matched tone, good pace' },
      { score: 5, label: 'Excellent', description: 'Perfect tone adaptation, excellent pace' },
    ],
  },
];

// ============================================
// Service Functions
// ============================================

/**
 * Create or update QA score for a call
 */
export async function saveQAScore(data: QAScoreInput): Promise<QAScore> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Check if score already exists
  const existingResult = await db.execute({
    sql: 'SELECT id FROM qa_scores WHERE call_id = ? AND scorer_id = ?',
    args: [data.call_id, data.scorer_id],
  });
  
  if (existingResult.rows.length > 0) {
    // Update existing
    const existingId = existingResult.rows[0].id;
    
    await db.execute({
      sql: `
        UPDATE qa_scores SET
          professionalism = ?,
          empathy = ?,
          problem_solving = ?,
          script_adherence = ?,
          tone_manner = ?,
          overall_score = ?,
          strengths = ?,
          improvements = ?,
          general_notes = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `,
      args: [
        data.professionalism,
        data.empathy,
        data.problem_solving,
        data.script_adherence,
        data.tone_manner,
        data.overall_score,
        data.strengths || '',
        data.improvements || '',
        data.general_notes || '',
        data.status || 'draft',
        now,
        existingId,
      ],
    });
    
    return getQAScoreById(existingId as string) as Promise<QAScore>;
  }
  
  // Create new
  await db.execute({
    sql: `
      INSERT INTO qa_scores (
        id, call_id, scorer_id, scored_at,
        professionalism, empathy, problem_solving,
        script_adherence, tone_manner, overall_score,
        strengths, improvements, general_notes, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      data.call_id,
      data.scorer_id,
      now,
      data.professionalism,
      data.empathy,
      data.problem_solving,
      data.script_adherence,
      data.tone_manner,
      data.overall_score,
      data.strengths || '',
      data.improvements || '',
      data.general_notes || '',
      data.status || 'draft',
      now,
      now,
    ],
  });
  
  return getQAScoreById(id) as Promise<QAScore>;
}

/**
 * Get QA score by ID
 */
export async function getQAScoreById(scoreId: string): Promise<QAScore | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM qa_scores WHERE id = ?',
    args: [scoreId],
  });
  
  if (result.rows.length === 0) return null;
  
  return rowToQAScore(result.rows[0]);
}

/**
 * Get QA score for a specific call and scorer
 */
export async function getQAScoreForCall(
  callId: string,
  scorerId: string
): Promise<QAScore | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM qa_scores WHERE call_id = ? AND scorer_id = ?',
    args: [callId, scorerId],
  });
  
  if (result.rows.length === 0) return null;
  
  return rowToQAScore(result.rows[0]);
}

/**
 * Get all QA scores for a call
 */
export async function getQAScoresForCall(callId: string): Promise<QAScore[]> {
  const result = await db.execute({
    sql: `
      SELECT qs.*, u.name as scorer_name
      FROM qa_scores qs
      JOIN users u ON qs.scorer_id = u.id
      WHERE qs.call_id = ?
      ORDER BY qs.scored_at DESC
    `,
    args: [callId],
  });
  
  return result.rows.map(rowToQAScore);
}

/**
 * Get QA summary for a call (includes AI score comparison)
 */
export async function getQASummary(callId: string): Promise<QAScoreSummary> {
  // Get AI summary scores
  const aiResult = await db.execute({
    sql: `
      SELECT customer_satisfaction, coaching_effectiveness, resolution_status
      FROM call_summaries
      WHERE call_id = ?
    `,
    args: [callId],
  });
  
  const aiScore = aiResult.rows.length > 0 ? {
    customer_satisfaction: aiResult.rows[0].customer_satisfaction as number,
    coaching_effectiveness: aiResult.rows[0].coaching_effectiveness as number,
    resolution_status: aiResult.rows[0].resolution_status as string,
  } : undefined;
  
  // Get QA scores
  const qaScores = await getQAScoresForCall(callId);
  const hasQAScore = qaScores.length > 0;
  const latestQAScore = hasQAScore ? qaScores[0] : undefined;
  
  // Calculate comparison
  let scoreComparison;
  if (latestQAScore && aiScore) {
    // Convert AI satisfaction (1-5) to percentage scale (0-100)
    const aiOverall = (aiScore.customer_satisfaction / 5) * 100;
    scoreComparison = {
      qa_overall: latestQAScore.overall_score,
      ai_overall: Math.round(aiOverall),
      difference: latestQAScore.overall_score - Math.round(aiOverall),
    };
  }
  
  return {
    call_id: callId,
    has_qa_score: hasQAScore,
    qa_score: latestQAScore,
    ai_score: aiScore,
    score_comparison: scoreComparison,
  };
}

/**
 * Get pending QA reviews (calls without QA scores)
 */
export async function getPendingQAReviews(
  userId: string,
  limit: number = 20
): Promise<{ call_id: string; scenario_title: string; started_at: string }[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id as call_id,
        s.title as scenario_title,
        cs.started_at
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      LEFT JOIN qa_scores qs ON cs.id = qs.call_id AND qs.scorer_id = ?
      WHERE cs.user_id = ?
        AND cs.status = 'completed'
        AND qs.id IS NULL
      ORDER BY cs.started_at DESC
      LIMIT ?
    `,
    args: [userId, userId, limit],
  });
  
  return result.rows.map((r: any) => ({
    call_id: r.call_id,
    scenario_title: r.scenario_title,
    started_at: r.started_at,
  }));
}

/**
 * Get QA statistics for a user
 */
export async function getQAStats(userId: string): Promise<{
  total_scored: number;
  total_pending: number;
  average_score: number;
  score_distribution: { score_range: string; count: number }[];
}> {
  // Total scored
  const scoredResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count, COALESCE(AVG(overall_score), 0) as avg_score
      FROM qa_scores
      WHERE scorer_id = ? AND status = 'submitted'
    `,
    args: [userId],
  });
  
  // Pending count
  const pendingResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM call_sessions cs
      LEFT JOIN qa_scores qs ON cs.id = qs.call_id AND qs.scorer_id = ?
      WHERE cs.user_id = ?
        AND cs.status = 'completed'
        AND qs.id IS NULL
    `,
    args: [userId, userId],
  });
  
  // Score distribution
  const distributionResult = await db.execute({
    sql: `
      SELECT 
        CASE
          WHEN overall_score >= 90 THEN '90-100'
          WHEN overall_score >= 80 THEN '80-89'
          WHEN overall_score >= 70 THEN '70-79'
          WHEN overall_score >= 60 THEN '60-69'
          ELSE 'Below 60'
        END as score_range,
        COUNT(*) as count
      FROM qa_scores
      WHERE scorer_id = ? AND status = 'submitted'
      GROUP BY score_range
    `,
    args: [userId],
  });
  
  return {
    total_scored: Number(scoredResult.rows[0]?.count || 0),
    total_pending: Number(pendingResult.rows[0]?.count || 0),
    average_score: Math.round(Number(scoredResult.rows[0]?.avg_score || 0)),
    score_distribution: distributionResult.rows.map((r: any) => ({
      score_range: r.score_range,
      count: Number(r.count),
    })),
  };
}

/**
 * Delete QA score
 */
export async function deleteQAScore(scoreId: string, scorerId: string): Promise<boolean> {
  const result = await db.execute({
    sql: 'DELETE FROM qa_scores WHERE id = ? AND scorer_id = ?',
    args: [scoreId, scorerId],
  });
  
  // Check if any row was deleted
  const checkResult = await db.execute({
    sql: 'SELECT changes() as deleted',
    args: [],
  });
  
  return Number(checkResult.rows[0]?.deleted) > 0;
}

// ============================================
// Helper Functions
// ============================================

function rowToQAScore(row: any): QAScore {
  return {
    id: row.id,
    call_id: row.call_id,
    scorer_id: row.scorer_id,
    scored_at: row.scored_at,
    professionalism: row.professionalism,
    empathy: row.empathy,
    problem_solving: row.problem_solving,
    script_adherence: row.script_adherence,
    tone_manner: row.tone_manner,
    overall_score: row.overall_score,
    strengths: row.strengths,
    improvements: row.improvements,
    general_notes: row.general_notes,
    status: row.status,
  };
}

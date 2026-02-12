/**
 * QA Review Service
 * Handles AI QA results and human QA reviews
 */

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { analyzeCallQuality } from './services/ai-qa-client';
import type { TranscriptEntry, CoachingData } from './call-sessions';

// ============================================
// Types
// ============================================

export type ScoringType = 'scale' | 'binary';

export interface QACriteria {
  id: string;
  name: string;
  description: string;
  ai_prompt: string;
  scoring_type: ScoringType;
  max_score: number;
  weight: number;
  is_required: boolean;
  sort_order: number;
}

export interface AIQAResult {
  id: string;
  call_id: string;
  overall_score: number;
  summary_feedback: string;
  status: 'pending_review' | 'reviewed';
  created_at: string;
  criteria_scores: AIQACriteriaScore[];
}

export interface AIQACriteriaScore {
  id: string;
  criteria_id: string;
  criteria_name: string;
  score: number;
  reasoning: string;
  evidence_quote: string;
  evidence_timestamp: number;
}

export interface HumanQAReview {
  id: string;
  call_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  overall_score: number;
  general_feedback: string;
  status: 'draft' | 'submitted';
  created_at: string;
  criteria_scores: HumanQACriteriaScore[];
  comments: HumanQAComment[];
}

export interface HumanQACriteriaScore {
  id: string;
  criteria_id: string;
  criteria_name: string;
  score: number;
  comment: string;
}

export interface HumanQAComment {
  id: string;
  timestamp_seconds: number;
  comment: string;
  created_at: string;
}

export interface QAReviewQueueItem {
  call_id: string;
  scenario_title: string;
  operator_name: string;
  duration_seconds: number;
  total_turns: number;
  ai_overall_score: number;
  created_at: string;
}

// ============================================
// AI QA Functions
// ============================================

/**
 * Run AI QA analysis on a call
 * This is called automatically after call summary is generated
 */
export async function runAIQAAnalysis(
  callId: string,
  transcripts: TranscriptEntry[],
  coachingHistory: CoachingData[],
  durationSeconds: number,
  totalTurns: number,
  scenarioType: string = 'customer_service'
): Promise<AIQAResult> {
  console.log(`[QAReview] Running AI QA analysis for call: ${callId}`);
  
  // Check if AI QA already exists
  const existingResult = await getAIQAResult(callId);
  if (existingResult) {
    console.log(`[QAReview] AI QA result already exists for call: ${callId}`);
    return existingResult;
  }
  
  // Get criteria from database
  const criteria = await getQACriteria();
  
  // Call AI QA service
  const { result: aiResult, source } = await analyzeCallQuality({
    call_id: callId,
    transcripts,
    coaching_history: coachingHistory,
    duration_seconds: durationSeconds,
    total_turns: totalTurns,
    scenario_type: scenarioType
  });
  
  console.log(`[QAReview] AI QA completed (source: ${source}), score: ${aiResult.overall_score}`);
  
  // Save to database
  const savedResult = await saveAIQAResult(callId, aiResult, criteria);
  
  return savedResult;
}

/**
 * Save AI QA result to database
 */
async function saveAIQAResult(
  callId: string,
  result: {
    overall_score: number;
    summary_feedback: string;
    key_strengths: string[];
    key_improvements: string[];
    criteria_scores: Array<{
      criteria_id?: string;
      criteria_name: string;
      score: number;
      reasoning: string;
      evidence_quote: string;
      evidence_timestamp: number;
    }>;
  },
  dbCriteria: QACriteria[]
): Promise<AIQAResult> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Create main result
  await db.execute({
    sql: `
      INSERT INTO ai_qa_results (id, call_id, overall_score, summary_feedback, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [id, callId, result.overall_score, result.summary_feedback, 'pending_review', now]
  });
  
  // Create criteria scores
  const criteriaScores: AIQACriteriaScore[] = [];
  
  for (const score of result.criteria_scores) {
    // Find matching criteria ID from database
    const matchingCriteria = dbCriteria.find(c => 
      c.name.toLowerCase() === score.criteria_name.toLowerCase() ||
      c.id === score.criteria_id
    );
    
    const criteriaId = matchingCriteria?.id || uuidv4();
    const scoreId = uuidv4();
    
    await db.execute({
      sql: `
        INSERT INTO ai_qa_criteria_scores 
        (id, ai_qa_result_id, criteria_id, score, reasoning, evidence_quote, evidence_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        scoreId,
        id,
        criteriaId,
        score.score,
        score.reasoning,
        score.evidence_quote,
        score.evidence_timestamp
      ]
    });
    
    criteriaScores.push({
      id: scoreId,
      criteria_id: criteriaId,
      criteria_name: score.criteria_name,
      score: score.score,
      reasoning: score.reasoning,
      evidence_quote: score.evidence_quote,
      evidence_timestamp: score.evidence_timestamp
    });
  }
  
  return {
    id,
    call_id: callId,
    overall_score: result.overall_score,
    summary_feedback: result.summary_feedback,
    status: 'pending_review',
    created_at: now,
    criteria_scores: criteriaScores
  };
}

/**
 * Get AI QA result for a call
 */
export async function getAIQAResult(callId: string): Promise<AIQAResult | null> {
  // Get main result
  const result = await db.execute({
    sql: 'SELECT * FROM ai_qa_results WHERE call_id = ?',
    args: [callId]
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Get criteria scores
  const scoresResult = await db.execute({
    sql: `
      SELECT 
        aqcs.*,
        qc.name as criteria_name
      FROM ai_qa_criteria_scores aqcs
      LEFT JOIN qa_criteria qc ON aqcs.criteria_id = qc.id
      WHERE aqcs.ai_qa_result_id = ?
      ORDER BY qc.sort_order ASC
    `,
    args: [row.id]
  });
  
  const criteriaScores: AIQACriteriaScore[] = scoresResult.rows.map(s => ({
    id: s.id as string,
    criteria_id: s.criteria_id as string,
    criteria_name: (s.criteria_name || s.criteria_id) as string,
    score: s.score as number,
    reasoning: s.reasoning as string,
    evidence_quote: s.evidence_quote as string,
    evidence_timestamp: s.evidence_timestamp as number
  }));
  
  return {
    id: row.id as string,
    call_id: row.call_id as string,
    overall_score: row.overall_score as number,
    summary_feedback: row.summary_feedback as string,
    status: row.status as 'pending_review' | 'reviewed',
    created_at: row.created_at as string,
    criteria_scores: criteriaScores
  };
}

// ============================================
// QA Criteria Functions
// ============================================

/**
 * Get all QA criteria
 */
export async function getQACriteria(): Promise<QACriteria[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM qa_criteria 
      WHERE config_id = 'default'
      ORDER BY sort_order ASC
    `
  });
  
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    ai_prompt: row.ai_prompt as string,
    scoring_type: (row.scoring_type as ScoringType) || 'scale',
    max_score: (row.max_score as number) || 5,
    weight: (row.weight as number) || 0,
    is_required: Boolean(row.is_required),
    sort_order: row.sort_order as number
  }));
}

/**
 * Save or update QA criteria
 * Admin function to configure criteria
 */
export async function saveQACriteria(data: {
  id: string;
  name: string;
  description: string;
  ai_prompt: string;
  scoring_type: ScoringType;
  max_score: number;
  weight: number;
  is_required: boolean;
  sort_order: number;
}): Promise<void> {
  // Check if criteria exists
  const existing = await db.execute({
    sql: 'SELECT id FROM qa_criteria WHERE id = ?',
    args: [data.id]
  });
  
  if (existing.rows.length > 0) {
    // Update existing
    await db.execute({
      sql: `
        UPDATE qa_criteria SET
          name = ?,
          description = ?,
          ai_prompt = ?,
          scoring_type = ?,
          max_score = ?,
          weight = ?,
          is_required = ?,
          sort_order = ?
        WHERE id = ?
      `,
      args: [
        data.name,
        data.description,
        data.ai_prompt,
        data.scoring_type,
        data.max_score,
        data.weight,
        data.is_required ? 1 : 0,
        data.sort_order,
        data.id
      ]
    });
  } else {
    // Insert new
    await db.execute({
      sql: `
        INSERT INTO qa_criteria (id, config_id, name, description, ai_prompt, scoring_type, max_score, weight, is_required, sort_order)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.id,
        data.name,
        data.description,
        data.ai_prompt,
        data.scoring_type,
        data.max_score,
        data.weight,
        data.is_required ? 1 : 0,
        data.sort_order
      ]
    });
  }
}

/**
 * Delete QA criteria
 */
export async function deleteQACriteria(id: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM qa_criteria WHERE id = ?',
    args: [id]
  });
}

// ============================================
// Human QA Review Functions
// ============================================

/**
 * Save human QA review
 */
export async function saveHumanQAReview(data: {
  call_id: string;
  reviewer_id: string;
  overall_score: number;
  general_feedback: string;
  status: 'draft' | 'submitted';
  criteria_scores: Array<{
    criteria_id: string;
    score: number;
    comment?: string;
  }>;
  comments?: Array<{
    timestamp_seconds: number;
    comment: string;
  }>;
}): Promise<HumanQAReview> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Check if review already exists
  const existingResult = await db.execute({
    sql: 'SELECT id FROM human_qa_reviews WHERE call_id = ? AND reviewer_id = ?',
    args: [data.call_id, data.reviewer_id]
  });
  
  if (existingResult.rows.length > 0) {
    // Update existing
    const existingId = existingResult.rows[0].id as string;
    
    await db.execute({
      sql: `
        UPDATE human_qa_reviews SET
          overall_score = ?,
          general_feedback = ?,
          status = ?,
          created_at = ?
        WHERE id = ?
      `,
      args: [data.overall_score, data.general_feedback, data.status, now, existingId]
    });
    
    // Delete old criteria scores and comments
    await db.execute({
      sql: 'DELETE FROM human_qa_criteria_scores WHERE human_qa_review_id = ?',
      args: [existingId]
    });
    await db.execute({
      sql: 'DELETE FROM human_qa_comments WHERE human_qa_review_id = ?',
      args: [existingId]
    });
    
    // Insert new criteria scores
    for (const score of data.criteria_scores) {
      await db.execute({
        sql: `
          INSERT INTO human_qa_criteria_scores (id, human_qa_review_id, criteria_id, score, comment)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [uuidv4(), existingId, score.criteria_id, score.score, score.comment || '']
      });
    }
    
    // Insert new comments
    if (data.comments) {
      for (const comment of data.comments) {
        await db.execute({
          sql: `
            INSERT INTO human_qa_comments (id, human_qa_review_id, timestamp_seconds, comment, created_at)
            VALUES (?, ?, ?, ?, ?)
          `,
          args: [uuidv4(), existingId, comment.timestamp_seconds, comment.comment, now]
        });
      }
    }
    
    // Update AI QA status to reviewed
    if (data.status === 'submitted') {
      await db.execute({
        sql: "UPDATE ai_qa_results SET status = 'reviewed' WHERE call_id = ?",
        args: [data.call_id]
      });
    }
    
    return getHumanQAReview(existingId) as Promise<HumanQAReview>;
  }
  
  // Create new review
  await db.execute({
    sql: `
      INSERT INTO human_qa_reviews (id, call_id, reviewer_id, overall_score, general_feedback, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [id, data.call_id, data.reviewer_id, data.overall_score, data.general_feedback, data.status, now]
  });
  
  // Insert criteria scores
  for (const score of data.criteria_scores) {
    await db.execute({
      sql: `
        INSERT INTO human_qa_criteria_scores (id, human_qa_review_id, criteria_id, score, comment)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [uuidv4(), id, score.criteria_id, score.score, score.comment || '']
    });
  }
  
  // Insert comments
  if (data.comments) {
    for (const comment of data.comments) {
      await db.execute({
        sql: `
          INSERT INTO human_qa_comments (id, human_qa_review_id, timestamp_seconds, comment, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [uuidv4(), id, comment.timestamp_seconds, comment.comment, now]
      });
    }
  }
  
  // Update AI QA status to reviewed
  if (data.status === 'submitted') {
    await db.execute({
      sql: "UPDATE ai_qa_results SET status = 'reviewed' WHERE call_id = ?",
      args: [data.call_id]
    });
  }
  
  return getHumanQAReview(id) as Promise<HumanQAReview>;
}

/**
 * Get human QA review by ID
 */
export async function getHumanQAReview(reviewId: string): Promise<HumanQAReview | null> {
  const result = await db.execute({
    sql: `
      SELECT 
        hqr.*,
        u.name as reviewer_name
      FROM human_qa_reviews hqr
      LEFT JOIN users u ON hqr.reviewer_id = u.id
      WHERE hqr.id = ?
    `,
    args: [reviewId]
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Get criteria scores
  const scoresResult = await db.execute({
    sql: `
      SELECT 
        hqcs.*,
        qc.name as criteria_name
      FROM human_qa_criteria_scores hqcs
      LEFT JOIN qa_criteria qc ON hqcs.criteria_id = qc.id
      WHERE hqcs.human_qa_review_id = ?
    `,
    args: [reviewId]
  });
  
  const criteriaScores: HumanQACriteriaScore[] = scoresResult.rows.map(s => ({
    id: s.id as string,
    criteria_id: s.criteria_id as string,
    criteria_name: (s.criteria_name || s.criteria_id) as string,
    score: s.score as number,
    comment: s.comment as string
  }));
  
  // Get comments
  const commentsResult = await db.execute({
    sql: `
      SELECT * FROM human_qa_comments
      WHERE human_qa_review_id = ?
      ORDER BY timestamp_seconds ASC
    `,
    args: [reviewId]
  });
  
  const comments: HumanQAComment[] = commentsResult.rows.map(c => ({
    id: c.id as string,
    timestamp_seconds: c.timestamp_seconds as number,
    comment: c.comment as string,
    created_at: c.created_at as string
  }));
  
  return {
    id: row.id as string,
    call_id: row.call_id as string,
    reviewer_id: row.reviewer_id as string,
    reviewer_name: row.reviewer_name as string,
    overall_score: row.overall_score as number,
    general_feedback: row.general_feedback as string,
    status: row.status as 'draft' | 'submitted',
    created_at: row.created_at as string,
    criteria_scores: criteriaScores,
    comments
  };
}

/**
 * Get human QA review for a call
 */
export async function getHumanQAReviewForCall(
  callId: string,
  reviewerId: string
): Promise<HumanQAReview | null> {
  const result = await db.execute({
    sql: `
      SELECT id FROM human_qa_reviews
      WHERE call_id = ? AND reviewer_id = ?
    `,
    args: [callId, reviewerId]
  });
  
  if (result.rows.length === 0) return null;
  
  return getHumanQAReview(result.rows[0].id as string);
}

// ============================================
// QA Review Queue
// ============================================

/**
 * Get QA review queue (calls pending review)
 */
export async function getQAReviewQueue(
  limit: number = 20,
  offset: number = 0
): Promise<QAReviewQueueItem[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id as call_id,
        s.title as scenario_title,
        u.name as operator_name,
        cs.duration_seconds,
        cs.total_turns,
        aiqr.overall_score as ai_overall_score,
        aiqr.created_at
      FROM ai_qa_results aiqr
      JOIN call_sessions cs ON aiqr.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      JOIN users u ON cs.user_id = u.id
      WHERE aiqr.status = 'pending_review'
      ORDER BY aiqr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [limit, offset]
  });
  
  return result.rows.map(row => ({
    call_id: row.call_id as string,
    scenario_title: row.scenario_title as string,
    operator_name: row.operator_name as string,
    duration_seconds: row.duration_seconds as number,
    total_turns: row.total_turns as number,
    ai_overall_score: row.ai_overall_score as number,
    created_at: row.created_at as string
  }));
}

/**
 * Get reviewed calls (calls with human QA reviews)
 */
export async function getReviewedCalls(
  reviewerId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<Array<{
  call_id: string;
  scenario_title: string;
  operator_name: string;
  duration_seconds: number;
  ai_overall_score: number;
  human_overall_score: number;
  reviewer_name: string;
  reviewed_at: string;
}>> {
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id as call_id,
        s.title as scenario_title,
        u.name as operator_name,
        cs.duration_seconds,
        aiqr.overall_score as ai_overall_score,
        hqr.overall_score as human_overall_score,
        ru.name as reviewer_name,
        hqr.created_at as reviewed_at
      FROM human_qa_reviews hqr
      JOIN call_sessions cs ON hqr.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      JOIN users u ON cs.user_id = u.id
      JOIN ai_qa_results aiqr ON hqr.call_id = aiqr.call_id
      LEFT JOIN users ru ON hqr.reviewer_id = ru.id
      WHERE hqr.status = 'submitted'
      ${reviewerId ? 'AND hqr.reviewer_id = ?' : ''}
      ORDER BY hqr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: reviewerId ? [reviewerId, limit, offset] : [limit, offset]
  });
  
  return result.rows.map(row => ({
    call_id: row.call_id as string,
    scenario_title: row.scenario_title as string,
    operator_name: row.operator_name as string,
    duration_seconds: row.duration_seconds as number,
    ai_overall_score: row.ai_overall_score as number,
    human_overall_score: row.human_overall_score as number,
    reviewer_name: row.reviewer_name as string,
    reviewed_at: row.reviewed_at as string
  }));
}

/**
 * Get complete QA data for a call (AI + Human)
 */
export async function getCompleteQAData(callId: string, reviewerId?: string) {
  const [aiResult, humanReview, criteria] = await Promise.all([
    getAIQAResult(callId),
    reviewerId ? getHumanQAReviewForCall(callId, reviewerId) : null,
    getQACriteria()
  ]);
  
  return {
    ai_qa: aiResult,
    human_qa: humanReview,
    criteria,
    comparison: aiResult && humanReview ? {
      ai_overall: aiResult.overall_score,
      human_overall: humanReview.overall_score,
      difference: humanReview.overall_score - aiResult.overall_score,
      variance: Math.abs(humanReview.overall_score - aiResult.overall_score) <= 10 ? 'aligned' :
                Math.abs(humanReview.overall_score - aiResult.overall_score) <= 20 ? 'minor' : 'significant'
    } : null
  };
}

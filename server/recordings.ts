/**
 * Recordings Service
 * Manage call recordings library - list, filter, playback data
 */

import { db } from './db';
import type { CallSession, TranscriptEntry, CoachingData, CallSummary } from './call-sessions';

// ============================================
// Types
// ============================================

export interface Recording {
  id: string;
  user_id: string;
  scenario_id: string;
  scenario_title: string;
  scenario_difficulty: string;
  scenario_category: string;
  room_name: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  total_turns: number;
  customer_sentiment: string;
  final_score?: number;
  has_summary: boolean;
  thumbnail_url?: string;
}

export interface RecordingFilters {
  userId?: string;
  scenarioId?: string;
  difficulty?: string;
  status?: 'completed' | 'abandoned';
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
  searchQuery?: string;
}

export interface RecordingListItem {
  id: string;
  scenario_title: string;
  scenario_difficulty: string;
  scenario_category: string;
  duration_seconds: number;
  total_turns: number;
  final_score?: number;
  customer_sentiment: string;
  started_at: string;
  status: string;
  has_summary: boolean;
}

export interface RecordingDetail extends Recording {
  transcripts: TranscriptEntry[];
  coaching: CoachingData[];
  summary: CallSummary | null;
}

export interface RecordingStats {
  total_recordings: number;
  total_duration_seconds: number;
  average_score: number;
  by_scenario: { scenario_id: string; title: string; count: number }[];
  by_difficulty: { difficulty: string; count: number; avg_score: number }[];
}

// ============================================
// Service Functions
// ============================================

/**
 * Get recordings list with filters and pagination
 */
export async function getRecordings(
  filters: RecordingFilters = {},
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'started_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ recordings: RecordingListItem[]; total: number }> {
  const offset = (page - 1) * limit;
  
  // Build WHERE clauses
  const whereConditions: string[] = ['1=1'];
  const args: any[] = [];
  
  if (filters.userId) {
    whereConditions.push('cs.user_id = ?');
    args.push(filters.userId);
  }
  
  if (filters.scenarioId) {
    whereConditions.push('cs.scenario_id = ?');
    args.push(filters.scenarioId);
  }
  
  if (filters.difficulty) {
    whereConditions.push('s.difficulty = ?');
    args.push(filters.difficulty);
  }
  
  if (filters.status) {
    whereConditions.push('cs.status = ?');
    args.push(filters.status);
  }
  
  if (filters.dateFrom) {
    whereConditions.push('cs.started_at >= ?');
    args.push(filters.dateFrom);
  }
  
  if (filters.dateTo) {
    whereConditions.push('cs.started_at <= ?');
    args.push(filters.dateTo);
  }
  
  if (filters.minScore !== undefined) {
    whereConditions.push('cs.final_score >= ?');
    args.push(filters.minScore);
  }
  
  if (filters.maxScore !== undefined) {
    whereConditions.push('cs.final_score <= ?');
    args.push(filters.maxScore);
  }
  
  if (filters.searchQuery) {
    whereConditions.push('(s.title LIKE ? OR s.description LIKE ?)');
    args.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Get total count
  const countResult = await db.execute({
    sql: `
      SELECT COUNT(*) as total
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE ${whereClause}
    `,
    args: [...args],
  });
  
  const total = Number(countResult.rows[0]?.total || 0);
  
  // Get recordings
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id,
        s.title as scenario_title,
        s.difficulty as scenario_difficulty,
        s.category as scenario_category,
        cs.duration_seconds,
        cs.total_turns,
        cs.final_score,
        cs.customer_sentiment,
        cs.started_at,
        cs.status,
        CASE WHEN sm.id IS NOT NULL THEN 1 ELSE 0 END as has_summary
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      LEFT JOIN call_summaries sm ON cs.id = sm.call_id
      WHERE ${whereClause}
      ORDER BY cs.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `,
    args: [...args, limit, offset],
  });
  
  const recordings = result.rows.map((row: any) => ({
    id: row.id,
    scenario_title: row.scenario_title,
    scenario_difficulty: row.scenario_difficulty,
    scenario_category: row.scenario_category || 'General',
    duration_seconds: row.duration_seconds,
    total_turns: row.total_turns,
    final_score: row.final_score,
    customer_sentiment: row.customer_sentiment,
    started_at: row.started_at,
    status: row.status,
    has_summary: Boolean(row.has_summary),
  })) as RecordingListItem[];
  
  return { recordings, total };
}

/**
 * Get single recording with full details
 */
export async function getRecordingDetail(recordingId: string): Promise<RecordingDetail | null> {
  // Get base recording
  const recordingResult = await db.execute({
    sql: `
      SELECT 
        cs.*,
        s.title as scenario_title,
        s.difficulty as scenario_difficulty,
        s.category as scenario_category,
        s.description as scenario_description
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.id = ?
    `,
    args: [recordingId],
  });
  
  if (recordingResult.rows.length === 0) {
    return null;
  }
  
  const row = recordingResult.rows[0] as any;
  
  // Get transcripts
  const transcriptsResult = await db.execute({
    sql: `
      SELECT speaker, text, timestamp, sequence_order
      FROM call_transcripts
      WHERE call_id = ?
      ORDER BY sequence_order ASC
    `,
    args: [recordingId],
  });
  
  const transcripts: TranscriptEntry[] = transcriptsResult.rows.map((t: any) => ({
    speaker: t.speaker,
    text: t.text,
    timestamp: t.timestamp,
  }));
  
  // Get coaching history
  const coachingResult = await db.execute({
    sql: `
      SELECT *
      FROM call_coaching
      WHERE call_id = ?
      ORDER BY analysis_id ASC
    `,
    args: [recordingId],
  });
  
  const coaching: CoachingData[] = coachingResult.rows.map((c: any) => ({
    analysis_id: c.analysis_id,
    cards: [
      { title: c.card_1_title, detail: c.card_1_detail, action: c.card_1_action, status: c.card_1_status },
      { title: c.card_2_title, detail: c.card_2_detail, action: c.card_2_action, status: c.card_2_status },
      { title: c.card_3_title, detail: c.card_3_detail, action: c.card_3_action, status: c.card_3_status },
    ],
    script: { summary: c.script_summary, suggestion: c.script_suggestion },
  }));
  
  // Get summary
  const summaryResult = await db.execute({
    sql: `
      SELECT *
      FROM call_summaries
      WHERE call_id = ?
    `,
    args: [recordingId],
  });
  
  let summary: CallSummary | null = null;
  if (summaryResult.rows.length > 0) {
    const s = summaryResult.rows[0] as any;
    summary = {
      summary: s.summary,
      key_points: JSON.parse(s.key_points || '[]'),
      strengths: JSON.parse(s.strengths || '[]'),
      improvements: JSON.parse(s.improvements || '[]'),
      customer_satisfaction: s.customer_satisfaction,
      resolution_status: s.resolution_status,
      coaching_effectiveness: s.coaching_effectiveness,
    };
  }
  
  return {
    id: row.id,
    user_id: row.user_id,
    scenario_id: row.scenario_id,
    scenario_title: row.scenario_title,
    scenario_difficulty: row.scenario_difficulty,
    scenario_category: row.scenario_category || 'General',
    room_name: row.room_name,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    total_turns: row.total_turns,
    customer_sentiment: row.customer_sentiment,
    final_score: row.final_score,
    has_summary: summary !== null,
    transcripts,
    coaching,
    summary,
  };
}

/**
 * Get user's recording statistics
 */
export async function getRecordingStats(userId: string): Promise<RecordingStats> {
  // Total recordings and duration
  const totalsResult = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        COALESCE(AVG(final_score), 0) as avg_score
      FROM call_sessions
      WHERE user_id = ? AND status = 'completed'
    `,
    args: [userId],
  });
  
  const totals = totalsResult.rows[0] as any;
  
  // By scenario
  const byScenarioResult = await db.execute({
    sql: `
      SELECT 
        s.id as scenario_id,
        s.title,
        COUNT(*) as count
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.user_id = ? AND cs.status = 'completed'
      GROUP BY s.id, s.title
      ORDER BY count DESC
    `,
    args: [userId],
  });
  
  // By difficulty
  const byDifficultyResult = await db.execute({
    sql: `
      SELECT 
        s.difficulty,
        COUNT(*) as count,
        COALESCE(AVG(cs.final_score), 0) as avg_score
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.user_id = ? AND cs.status = 'completed'
      GROUP BY s.difficulty
    `,
    args: [userId],
  });
  
  return {
    total_recordings: Number(totals.total),
    total_duration_seconds: Number(totals.total_duration),
    average_score: Math.round(Number(totals.avg_score)),
    by_scenario: byScenarioResult.rows.map((r: any) => ({
      scenario_id: r.scenario_id,
      title: r.title,
      count: Number(r.count),
    })),
    by_difficulty: byDifficultyResult.rows.map((r: any) => ({
      difficulty: r.difficulty,
      count: Number(r.count),
      avg_score: Math.round(Number(r.avg_score)),
    })),
  };
}

/**
 * Delete a recording
 */
export async function deleteRecording(recordingId: string, userId: string): Promise<boolean> {
  // Verify ownership
  const checkResult = await db.execute({
    sql: 'SELECT id FROM call_sessions WHERE id = ? AND user_id = ?',
    args: [recordingId, userId],
  });
  
  if (checkResult.rows.length === 0) {
    return false;
  }
  
  // Delete related data first (cascade delete would be better in schema)
  await db.execute({
    sql: 'DELETE FROM call_transcripts WHERE call_id = ?',
    args: [recordingId],
  });
  
  await db.execute({
    sql: 'DELETE FROM call_coaching WHERE call_id = ?',
    args: [recordingId],
  });
  
  await db.execute({
    sql: 'DELETE FROM call_summaries WHERE call_id = ?',
    args: [recordingId],
  });
  
  await db.execute({
    sql: 'DELETE FROM call_sessions WHERE id = ?',
    args: [recordingId],
  });
  
  return true;
}

/**
 * Get recent recordings for dashboard
 */
export async function getRecentRecordings(
  userId: string,
  limit: number = 5
): Promise<RecordingListItem[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        cs.id,
        s.title as scenario_title,
        s.difficulty as scenario_difficulty,
        s.category as scenario_category,
        cs.duration_seconds,
        cs.total_turns,
        cs.final_score,
        cs.customer_sentiment,
        cs.started_at,
        cs.status,
        CASE WHEN sm.id IS NOT NULL THEN 1 ELSE 0 END as has_summary
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      LEFT JOIN call_summaries sm ON cs.id = sm.call_id
      WHERE cs.user_id = ? AND cs.status = 'completed'
      ORDER BY cs.started_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  
  return result.rows.map((row: any) => ({
    id: row.id,
    scenario_title: row.scenario_title,
    scenario_difficulty: row.scenario_difficulty,
    scenario_category: row.scenario_category || 'General',
    duration_seconds: row.duration_seconds,
    total_turns: row.total_turns,
    final_score: row.final_score,
    customer_sentiment: row.customer_sentiment,
    started_at: row.started_at,
    status: row.status,
    has_summary: Boolean(row.has_summary),
  })) as RecordingListItem[];
}

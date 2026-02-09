/**
 * Call Sessions Service
 * Manage voice call data, transcripts, coaching history, and summaries
 */

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface CreateCallSessionRequest {
  user_id: string;
  scenario_id: string;
  room_name: string;
}

export interface CallSession {
  id: string;
  user_id: string;
  scenario_id: string;
  room_name: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  total_turns: number;
  customer_sentiment: string;
  final_score?: number;
}

export interface TranscriptEntry {
  speaker: 'customer' | 'operator';
  text: string;
  timestamp: string;
}

export interface CoachingData {
  analysis_id: number;
  cards: {
    title: string;
    detail: string;
    action: string;
    status: string;
  }[];
  script: {
    summary: string;
    suggestion: string;
  };
}

export interface CallSummary {
  summary: string;
  key_points: string[];
  strengths: string[];
  improvements: string[];
  customer_satisfaction: number;
  resolution_status: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coaching_effectiveness: number;
}

export interface CompleteCallRequest {
  call_id: string;
  duration_seconds: number;
  total_turns: number;
  customer_sentiment: string;
  transcripts: TranscriptEntry[];
  coaching_history: CoachingData[];
  final_score?: number;
}

// ============================================
// MOCK SUMMARY GENERATOR
// Replace this with your real AI node later
// ============================================

function generateMockSummary(transcripts: TranscriptEntry[], coachingHistory: CoachingData[]): CallSummary {
  const customerMessages = transcripts.filter(t => t.speaker === 'customer');
  const operatorMessages = transcripts.filter(t => t.speaker === 'operator');
  
  // Simple sentiment analysis based on keywords
  const allText = customerMessages.map(t => t.text.toLowerCase()).join(' ');
  const angryWords = ['angry', 'mad', 'frustrated', 'terrible', 'awful', 'hate', 'worst'];
  const happyWords = ['thank', 'great', 'good', 'satisfied', 'happy', 'appreciate', 'excellent'];
  
  const angryCount = angryWords.filter(w => allText.includes(w)).length;
  const happyCount = happyWords.filter(w => allText.includes(w)).length;
  
  let satisfaction = 3;
  if (happyCount > angryCount) satisfaction = 4;
  if (happyCount > angryCount + 2) satisfaction = 5;
  if (angryCount > happyCount) satisfaction = 2;
  if (angryCount > happyCount + 2) satisfaction = 1;
  
  // Determine resolution status
  const lastMessages = transcripts.slice(-3).map(t => t.text.toLowerCase());
  const hasResolution = lastMessages.some(m => 
    m.includes('resolved') || m.includes('fixed') || m.includes('solved') || 
    m.includes('thank you') || m.includes('goodbye')
  );
  const hasEscalation = lastMessages.some(m => 
    m.includes('escalate') || m.includes('manager') || m.includes('supervisor')
  );
  
  let resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved' = 'pending';
  if (hasResolution) resolutionStatus = 'resolved';
  else if (hasEscalation) resolutionStatus = 'escalated';
  else if (transcripts.length > 10) resolutionStatus = 'unresolved';
  
  // Generate summary based on conversation
  let summary = '';
  if (resolutionStatus === 'resolved') {
    summary = `The operator successfully handled the customer's concerns through active listening and appropriate solutions. The conversation ended positively with the customer expressing satisfaction.`;
  } else if (resolutionStatus === 'escalated') {
    summary = `The operator recognized the complexity of the issue and appropriately escalated to a supervisor. Good judgment was shown in knowing when to seek additional help.`;
  } else {
    summary = `The operator engaged with the customer and attempted to address their concerns. The conversation provided good practice in handling ${customerMessages.length > 5 ? 'extended' : 'brief'} customer interactions.`;
  }
  
  // Generate key points
  const keyPoints: string[] = [
    `Conversation lasted ${transcripts.length} exchanges`,
    `Customer showed ${satisfaction >= 4 ? 'positive' : satisfaction <= 2 ? 'negative' : 'neutral'} sentiment`,
    `Operator used ${coachingHistory.length} coaching suggestions`,
  ];
  
  if (coachingHistory.length > 0) {
    const lastCoaching = coachingHistory[coachingHistory.length - 1];
    if (lastCoaching.cards[0]?.status === 'danger') {
      keyPoints.push('Required de-escalation techniques');
    }
    if (lastCoaching.cards[1]?.status === 'success') {
      keyPoints.push('Effectively used customer leverage points');
    }
  }
  
  // Generate strengths
  const strengths: string[] = [];
  if (operatorMessages.length >= customerMessages.length * 0.8) {
    strengths.push('Maintained good conversation flow');
  }
  if (coachingHistory.length > 0) {
    strengths.push('Utilized real-time coaching effectively');
  }
  if (!hasEscalation && resolutionStatus === 'resolved') {
    strengths.push('Resolved issue without escalation');
  }
  strengths.push('Professional tone throughout');
  
  // Generate improvements
  const improvements: string[] = [];
  if (satisfaction <= 2) {
    improvements.push('Could improve empathy statements');
    improvements.push('Work on faster resolution');
  }
  if (transcripts.length > 20 && resolutionStatus !== 'resolved') {
    improvements.push('More efficient problem-solving');
  }
  if (coachingHistory.length === 0) {
    improvements.push('Consider using coaching suggestions more');
  }
  if (improvements.length === 0) {
    improvements.push('Continue practicing active listening');
    improvements.push('Explore more upselling opportunities');
  }
  
  return {
    summary,
    key_points: keyPoints,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    customer_satisfaction: satisfaction,
    resolution_status: resolutionStatus,
    coaching_effectiveness: coachingHistory.length > 0 ? Math.min(5, 3 + Math.floor(coachingHistory.length / 3)) : 3,
  };
}

// ============================================
// Service Functions
// ============================================

/**
 * Create a new call session
 */
export async function createCallSession(
  data: CreateCallSessionRequest
): Promise<CallSession> {
  const id = uuidv4();
  
  await db.execute({
    sql: `
      INSERT INTO call_sessions (
        id, user_id, scenario_id, room_name, status, started_at
      ) VALUES (?, ?, ?, ?, 'in_progress', datetime('now'))
    `,
    args: [id, data.user_id, data.scenario_id, data.room_name],
  });
  
  const result = await db.execute({
    sql: 'SELECT * FROM call_sessions WHERE id = ?',
    args: [id],
  });
  
  return result.rows[0] as unknown as CallSession;
}

/**
 * Get call session by ID
 */
export async function getCallSession(callId: string): Promise<CallSession | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM call_sessions WHERE id = ?',
    args: [callId],
  });
  
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as CallSession;
}

/**
 * Get active call for user and scenario
 */
export async function getActiveCall(
  userId: string, 
  scenarioId: string
): Promise<CallSession | null> {
  const result = await db.execute({
    sql: `
      SELECT * FROM call_sessions 
      WHERE user_id = ? AND scenario_id = ? AND status = 'in_progress'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    args: [userId, scenarioId],
  });
  
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as CallSession;
}

/**
 * Complete a call session and save all data
 */
export async function completeCallSession(
  data: CompleteCallRequest
): Promise<{ session: CallSession; summary: CallSummary }> {
  // Get call session first (need user_id and scenario_id)
  const session = await getCallSession(data.call_id);
  if (!session) throw new Error('Call session not found');
  
  // Generate mock summary (replace with real AI later)
  const summary = generateMockSummary(data.transcripts, data.coaching_history);
  
  // Update call session
  await db.execute({
    sql: `
      UPDATE call_sessions SET
        status = 'completed',
        ended_at = datetime('now'),
        duration_seconds = ?,
        total_turns = ?,
        customer_sentiment = ?,
        final_score = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [
      data.duration_seconds,
      data.total_turns,
      data.customer_sentiment,
      data.final_score || null,
      data.call_id,
    ],
  });
  
  // Also mark the simulation as completed for this user
  try {
    // Calculate a score based on coaching effectiveness and satisfaction
    const calculatedScore = Math.round(
      ((summary.coaching_effectiveness + summary.customer_satisfaction) / 10) * 100
    );
    
    // Check if user_scenarios record exists
    const existing = await db.execute({
      sql: 'SELECT id FROM user_scenarios WHERE user_id = ? AND scenario_id = ?',
      args: [session.user_id, session.scenario_id],
    });
    
    if (existing.rows.length === 0) {
      // Create new record
      await db.execute({
        sql: `
          INSERT INTO user_scenarios (id, user_id, scenario_id, status, score, started_at, completed_at, created_at, updated_at)
          VALUES (?, ?, ?, 'completed', ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))
        `,
        args: [uuidv4(), session.user_id, session.scenario_id, calculatedScore],
      });
      console.log(`[CallSession] Created and completed scenario ${session.scenario_id} for user ${session.user_id}`);
    } else {
      // Update existing record
      await db.execute({
        sql: `
          UPDATE user_scenarios SET
            status = 'completed',
            score = ?,
            completed_at = datetime('now'),
            updated_at = datetime('now')
          WHERE user_id = ? AND scenario_id = ?
        `,
        args: [calculatedScore, session.user_id, session.scenario_id],
      });
      console.log(`[CallSession] Marked scenario ${session.scenario_id} as completed for user ${session.user_id}`);
    }
  } catch (e) {
    console.error('[CallSession] Failed to update user_scenarios:', e);
    // Don't fail the whole operation if this fails
  }
  
  // Save transcripts
  for (let i = 0; i < data.transcripts.length; i++) {
    const transcript = data.transcripts[i];
    await db.execute({
      sql: `
        INSERT INTO call_transcripts (
          id, call_id, speaker, text, timestamp, sequence_order
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        uuidv4(),
        data.call_id,
        transcript.speaker,
        transcript.text,
        transcript.timestamp,
        i,
      ],
    });
  }
  
  // Save coaching history
  for (const coaching of data.coaching_history) {
    await db.execute({
      sql: `
        INSERT INTO call_coaching (
          id, call_id, analysis_id,
          card_1_title, card_1_detail, card_1_action, card_1_status,
          card_2_title, card_2_detail, card_2_action, card_2_status,
          card_3_title, card_3_detail, card_3_action, card_3_status,
          script_summary, script_suggestion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        uuidv4(),
        data.call_id,
        coaching.analysis_id,
        coaching.cards[0]?.title || '',
        coaching.cards[0]?.detail || '',
        coaching.cards[0]?.action || '',
        coaching.cards[0]?.status || '',
        coaching.cards[1]?.title || '',
        coaching.cards[1]?.detail || '',
        coaching.cards[1]?.action || '',
        coaching.cards[1]?.status || '',
        coaching.cards[2]?.title || '',
        coaching.cards[2]?.detail || '',
        coaching.cards[2]?.action || '',
        coaching.cards[2]?.status || '',
        coaching.script?.summary || '',
        coaching.script?.suggestion || '',
      ],
    });
  }
  
  // Save summary
  await db.execute({
    sql: `
      INSERT INTO call_summaries (
        id, call_id, summary, key_points, strengths, improvements,
        customer_satisfaction, resolution_status, coaching_effectiveness, generated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      uuidv4(),
      data.call_id,
      summary.summary,
      JSON.stringify(summary.key_points),
      JSON.stringify(summary.strengths),
      JSON.stringify(summary.improvements),
      summary.customer_satisfaction,
      summary.resolution_status,
      summary.coaching_effectiveness,
      'mock', // Change to 'ai' when using real AI
    ],
  });
  
  // Get updated session data
  const updatedSession = await getCallSession(data.call_id);
  if (!updatedSession) throw new Error('Call session not found after update');
  
  return { session: updatedSession, summary };
}

/**
 * Get call history for a user
 */
export async function getUserCallHistory(userId: string, limit: number = 10): Promise<CallSession[]> {
  const result = await db.execute({
    sql: `
      SELECT cs.*, s.title as scenario_title, s.difficulty as scenario_difficulty
      FROM call_sessions cs
      JOIN scenarios s ON cs.scenario_id = s.id
      WHERE cs.user_id = ?
      ORDER BY cs.started_at DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  
  return result.rows as unknown as CallSession[];
}

/**
 * Get full call details including transcripts, coaching, and summary
 */
export async function getCallDetails(callId: string): Promise<{
  session: CallSession;
  transcripts: TranscriptEntry[];
  coaching: CoachingData[];
  summary: CallSummary | null;
}> {
  // Get session
  const session = await getCallSession(callId);
  if (!session) throw new Error('Call session not found');
  
  // Get transcripts
  const transcriptsResult = await db.execute({
    sql: `
      SELECT speaker, text, timestamp
      FROM call_transcripts
      WHERE call_id = ?
      ORDER BY sequence_order ASC
    `,
    args: [callId],
  });
  const transcripts = transcriptsResult.rows as unknown as TranscriptEntry[];
  
  // Get coaching history
  const coachingResult = await db.execute({
    sql: `
      SELECT *
      FROM call_coaching
      WHERE call_id = ?
      ORDER BY analysis_id ASC
    `,
    args: [callId],
  });
  
  const coaching: CoachingData[] = coachingResult.rows.map((row: any) => ({
    analysis_id: row.analysis_id,
    cards: [
      {
        title: row.card_1_title,
        detail: row.card_1_detail,
        action: row.card_1_action,
        status: row.card_1_status,
      },
      {
        title: row.card_2_title,
        detail: row.card_2_detail,
        action: row.card_2_action,
        status: row.card_2_status,
      },
      {
        title: row.card_3_title,
        detail: row.card_3_detail,
        action: row.card_3_action,
        status: row.card_3_status,
      },
    ],
    script: {
      summary: row.script_summary,
      suggestion: row.script_suggestion,
    },
  }));
  
  // Get summary
  const summaryResult = await db.execute({
    sql: 'SELECT * FROM call_summaries WHERE call_id = ?',
    args: [callId],
  });
  
  let summary: CallSummary | null = null;
  if (summaryResult.rows.length > 0) {
    const row = summaryResult.rows[0] as any;
    summary = {
      summary: row.summary,
      key_points: JSON.parse(row.key_points || '[]'),
      strengths: JSON.parse(row.strengths || '[]'),
      improvements: JSON.parse(row.improvements || '[]'),
      customer_satisfaction: row.customer_satisfaction,
      resolution_status: row.resolution_status,
      coaching_effectiveness: row.coaching_effectiveness,
    };
  }
  
  return { session, transcripts, coaching, summary };
}

/**
 * Abandon a call (user left without ending properly)
 */
export async function abandonCallSession(callId: string): Promise<void> {
  await db.execute({
    sql: `
      UPDATE call_sessions SET
        status = 'abandoned',
        ended_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [callId],
  });
}

/**
 * QA Review Service
 * Handles AI QA results and human QA reviews
 * CACHE_BUST: 2026-02-19-v2
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
  // Sub-criteria support
  parent_criteria_id?: string;
  level: number; // 0 = main criteria, 1 = sub-criteria, 2 = sub-sub-criteria
  children?: QACriteria[]; // Nested sub-criteria
  config_weight?: QAConfigWeight; // Config-level weight override
}

export interface QAConfigWeight {
  id: string;
  config_id: string;
  criteria_id: string;
  weight: number; // 0-100
  auto_calculate: boolean; // If true, auto-calculate from sub-criteria weights
  created_at: string;
  updated_at: string;
}

export interface QACriteriaWithChildren extends QACriteria {
  children: QACriteriaWithChildren[];
  calculated_weight: number; // Computed weight (either from config or auto-calculated)
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

function normalizeScoringType(value: unknown): ScoringType {
  if (value === 'binary' || value === 'binary_yes_no') return 'binary';
  if (value === 'scale') return 'scale';
  // Legacy values found in older rows.
  if (value === 'percentage' || value === 'scale_5' || value === 'scale_10') return 'scale';
  return 'scale';
}

function deriveMaxScore(scoringTypeRaw: unknown, scoringType: ScoringType, maxScore: unknown): number {
  if (scoringTypeRaw === 'binary_yes_no') return 1;
  if (scoringTypeRaw === 'scale_5') return 5;
  if (scoringTypeRaw === 'scale_10') return 10;

  if (scoringType === 'binary') return 1;

  const parsed = Number(maxScore);
  if (!Number.isFinite(parsed)) {
    if (scoringTypeRaw === 'percentage') return 100;
    return 5;
  }
  return Math.min(1000, Math.max(1, Math.round(parsed)));
}

function sanitizeWeight(weight: unknown): number {
  const parsed = Number(weight);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function isScoringTypeConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('CHECK constraint failed') && message.includes('scoring_type');
}

function toLegacyScoringType(scoringType: ScoringType, maxScore: number): string {
  if (scoringType === 'binary') return 'binary_yes_no';
  if (maxScore === 10) return 'scale_10';
  if (maxScore === 5) return 'scale_5';
  return 'percentage';
}

function toBinaryLogicalScore(score: number): number {
  if (score > 1) {
    return score >= 3 ? 1 : 0;
  }
  return score >= 1 ? 1 : 0;
}

function logicalToStoredScore(
  logicalScore: number,
  scoringType: ScoringType,
  maxScore: number
): number {
  if (scoringType === 'binary') {
    const binaryValue = toBinaryLogicalScore(logicalScore);
    return binaryValue === 1 ? 5 : 1;
  }

  if (maxScore <= 1) {
    return 1;
  }

  // Map 1..maxScore into 1..5 for storage compatibility.
  const clamped = Math.min(maxScore, Math.max(1, Math.round(logicalScore)));
  const normalized = (clamped - 1) / (maxScore - 1);
  const stored = Math.round(normalized * 4) + 1;
  return Math.min(5, Math.max(1, stored));
}

function storedToLogicalScore(
  storedScore: number,
  scoringType: ScoringType,
  maxScore: number
): number {
  const clampedStored = Math.min(5, Math.max(1, Math.round(storedScore)));

  if (scoringType === 'binary') {
    return clampedStored >= 3 ? 1 : 0;
  }

  if (maxScore <= 1) {
    return 1;
  }

  // Map 1..5 back into 1..maxScore for UI/API consumers.
  const normalized = (clampedStored - 1) / 4;
  const logical = Math.round(normalized * (maxScore - 1)) + 1;
  return Math.min(maxScore, Math.max(1, logical));
}

function normalizeLogicalScore(
  logicalScore: number,
  scoringType: ScoringType,
  maxScore: number
): number {
  if (scoringType === 'binary') {
    return toBinaryLogicalScore(logicalScore) === 1 ? 100 : 0;
  }

  const clamped = Math.min(maxScore, Math.max(1, Math.round(logicalScore)));
  return (clamped / maxScore) * 100;
}

function calculateOverallScore(
  scores: Array<{ criteria_id: string; score: number }>,
  criteria: QACriteria[]
): number {
  if (scores.length === 0) return 0;

  const criteriaById = new Map(criteria.map((c) => [c.id, c]));
  const normalized = scores.map((item) => {
    const criteriaDef = criteriaById.get(item.criteria_id);
    const scoringType = criteriaDef?.scoring_type || 'scale';
    const maxScore = criteriaDef?.max_score || (scoringType === 'binary' ? 1 : 5);
    return normalizeLogicalScore(item.score, scoringType, maxScore);
  });

  if (normalized.length === 0) return 0;
  const sum = normalized.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / normalized.length);
}

// ============================================
// Weighted Score Calculation with Sub-Criteria
// ============================================

/**
 * Build hierarchical criteria tree from flat list
 */
function buildCriteriaHierarchy(
  criteria: QACriteria[],
  weights: Map<string, QAConfigWeight>
): QACriteriaWithChildren[] {
  const criteriaMap = new Map<string, QACriteriaWithChildren>();
  const roots: QACriteriaWithChildren[] = [];
  
  // First pass: create all nodes
  for (const c of criteria) {
    const configWeight = weights.get(c.id);
    const calculatedWeight = configWeight?.auto_calculate 
      ? 0 
      : (configWeight?.weight ?? c.weight);
    
    criteriaMap.set(c.id, {
      ...c,
      children: [],
      calculated_weight: calculatedWeight,
      config_weight: configWeight,
    });
  }
  
  // Second pass: build hierarchy
  for (const c of criteria) {
    const node = criteriaMap.get(c.id)!;
    if (c.parent_criteria_id) {
      const parent = criteriaMap.get(c.parent_criteria_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}

/**
 * Auto-calculate weights for parent criteria based on children
 * If auto_calculate is true and weight is 0, distribute equally among children
 */
function autoCalculateWeights(criteria: QACriteriaWithChildren[]): void {
  for (const c of criteria) {
    if (c.children.length > 0) {
      // Recursively calculate children first
      autoCalculateWeights(c.children);
      
      // If weight is 0 or auto_calculate is true, sum children's weights
      if (c.calculated_weight === 0 || c.config_weight?.auto_calculate) {
        const childrenWeight = c.children.reduce((sum, child) => sum + child.calculated_weight, 0);
        c.calculated_weight = childrenWeight > 0 ? childrenWeight : 0;
      }
    } else if (c.calculated_weight === 0) {
      // Leaf node with no weight - assign default weight of 1
      c.calculated_weight = 1;
    }
  }
}

/**
 * Calculate weighted overall score using hierarchy
 */
function calculateWeightedOverallScore(
  scores: Map<string, number>,
  criteria: QACriteriaWithChildren[]
): { overall: number; breakdown: Array<{ criteria_id: string; name: string; score: number; weight: number; weighted_score: number }> } {
  const breakdown: Array<{ criteria_id: string; name: string; score: number; weight: number; weighted_score: number }> = [];
  let totalWeight = 0;
  let weightedSum = 0;
  
  function processNode(node: QACriteriaWithChildren): number {
    const score = scores.get(node.id);
    
    // If this node has children, calculate from children
    if (node.children.length > 0) {
      const childResults = node.children.map(processNode);
      const childWeightedSum = childResults.reduce((sum, r, i) => {
        const child = node.children[i];
        return sum + (r * child.calculated_weight);
      }, 0);
      const childTotalWeight = node.children.reduce((sum, c) => sum + c.calculated_weight, 0);
      const aggregatedScore = childTotalWeight > 0 ? childWeightedSum / childTotalWeight : 0;
      
      // Store breakdown for parent
      if (score !== undefined) {
        breakdown.push({
          criteria_id: node.id,
          name: node.name,
          score: aggregatedScore,
          weight: node.calculated_weight,
          weighted_score: aggregatedScore * node.calculated_weight,
        });
      }
      
      return aggregatedScore;
    }
    
    // Leaf node - use direct score
    if (score !== undefined) {
      const normalizedScore = normalizeLogicalScore(score, node.scoring_type, node.max_score);
      const weightedScore = normalizedScore * node.calculated_weight;
      
      breakdown.push({
        criteria_id: node.id,
        name: node.name,
        score: normalizedScore,
        weight: node.calculated_weight,
        weighted_score: weightedScore,
      });
      
      totalWeight += node.calculated_weight;
      weightedSum += weightedScore;
      
      return normalizedScore;
    }
    
    return 0;
  }
  
  for (const root of criteria) {
    processNode(root);
  }
  
  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  return { overall, breakdown };
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
  const aiCriteria = criteria.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    prompt: c.ai_prompt,
    ai_prompt: c.ai_prompt,
    scoring_type: c.scoring_type,
    max_score: c.max_score,
    weight: c.weight,
    is_required: c.is_required,
  }));

  const { result: aiResult, source } = await analyzeCallQuality({
    call_id: callId,
    transcripts,
    coaching_history: coachingHistory,
    duration_seconds: durationSeconds,
    total_turns: totalTurns,
    scenario_type: scenarioType,
    criteria: aiCriteria,
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
  
  for (const [index, score] of result.criteria_scores.entries()) {
    // Find matching criteria ID from database
    const matchingCriteria = dbCriteria.find(c => 
      c.name.toLowerCase() === score.criteria_name.toLowerCase() ||
      c.id === score.criteria_id
    );
    
    const fallbackCriteria = dbCriteria[index];
    const criteriaId = matchingCriteria?.id || fallbackCriteria?.id;
    if (!criteriaId) {
      console.warn(`[QAReview] Skipping AI criteria score without matching criteria id: ${score.criteria_name}`);
      continue;
    }
    const criteriaDef = matchingCriteria || fallbackCriteria;
    const scoringType = criteriaDef?.scoring_type || 'scale';
    const maxScore = criteriaDef?.max_score || 5;
    const logicalScore = Number(score.score) || 0;
    const storedScore = logicalToStoredScore(logicalScore, scoringType, maxScore);
    const displayScore = storedToLogicalScore(storedScore, scoringType, maxScore);
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
        storedScore,
        score.reasoning,
        score.evidence_quote,
        score.evidence_timestamp
      ]
    });
    
    criteriaScores.push({
      id: scoreId,
      criteria_id: criteriaId,
      criteria_name: score.criteria_name,
      score: displayScore,
      reasoning: score.reasoning,
      evidence_quote: score.evidence_quote,
      evidence_timestamp: score.evidence_timestamp
    });
  }

  const computedOverallScore = criteriaScores.length > 0
    ? calculateOverallScore(
        criteriaScores.map((item) => ({ criteria_id: item.criteria_id, score: item.score })),
        dbCriteria
      )
    : result.overall_score;

  if (criteriaScores.length > 0 && computedOverallScore !== result.overall_score) {
    await db.execute({
      sql: 'UPDATE ai_qa_results SET overall_score = ? WHERE id = ?',
      args: [computedOverallScore, id]
    });
  }
  
  return {
    id,
    call_id: callId,
    overall_score: computedOverallScore,
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
        qc.name as criteria_name,
        qc.scoring_type as criteria_scoring_type,
        qc.max_score as criteria_max_score
      FROM ai_qa_criteria_scores aqcs
      LEFT JOIN qa_criteria qc ON aqcs.criteria_id = qc.id
      WHERE aqcs.ai_qa_result_id = ?
      ORDER BY qc.sort_order ASC
    `,
    args: [row.id]
  });
  
  const criteriaScores: AIQACriteriaScore[] = scoresResult.rows.map(s => {
    const scoringType = normalizeScoringType(s.criteria_scoring_type);
    const maxScore = deriveMaxScore(s.criteria_scoring_type, scoringType, s.criteria_max_score);
    const displayScore = storedToLogicalScore(Number(s.score), scoringType, maxScore);

    return {
      id: s.id as string,
      criteria_id: s.criteria_id as string,
      criteria_name: (s.criteria_name || s.criteria_id) as string,
      score: displayScore,
      reasoning: s.reasoning as string,
      evidence_quote: s.evidence_quote as string,
      evidence_timestamp: s.evidence_timestamp as number
    };
  });
  
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
// QA Criteria Functions (with Sub-Criteria Support)
// ============================================

/**
 * Get all QA criteria as flat list
 */
export async function getQACriteria(): Promise<QACriteria[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        qc.*,
        COALESCE(qcw.weight, qc.weight) as effective_weight,
        COALESCE(qcw.auto_calculate, 1) as auto_calculate
      FROM qa_criteria qc
      LEFT JOIN qa_config_weights qcw ON qc.id = qcw.criteria_id AND qcw.config_id = 'default'
      WHERE qc.config_id = 'default'
        AND COALESCE(qc.is_active, 1) = 1
      ORDER BY qc.sort_order ASC
    `
  });
  
  console.log(`[QAReview] getQACriteria returned ${result.rows.length} rows`);
  if (result.rows.length > 0) {
    console.log(`[QAReview] First row:`, JSON.stringify(result.rows[0], null, 2));
  }
  
  return result.rows.map((row, index) => {
    const scoringType = normalizeScoringType(row.scoring_type);
    const id = row.id ? String(row.id) : `row-${index}`;
    if (!row.id) {
      console.error(`[QAReview] Row ${index} has no id:`, row);
    }
    return {
      id: id,
      name: row.name as string,
      description: (row.description as string) || '',
      ai_prompt: (row.ai_prompt as string) || '',
      scoring_type: scoringType,
      max_score: deriveMaxScore(row.scoring_type, scoringType, row.max_score),
      weight: sanitizeWeight(row.effective_weight),
      is_required: Boolean(row.is_required),
      sort_order: Number(row.sort_order) || 0,
      parent_criteria_id: row.parent_criteria_id ? String(row.parent_criteria_id) : undefined,
      level: row.parent_criteria_id ? 1 : 0,
      config_weight: row.auto_calculate !== undefined ? {
        id: '',
        config_id: 'default',
        criteria_id: row.id as string,
        weight: sanitizeWeight(row.effective_weight),
        auto_calculate: Boolean(row.auto_calculate),
        created_at: '',
        updated_at: '',
      } : undefined,
    };
  });
}

/**
 * Get QA criteria as hierarchical tree with calculated weights
 */
export async function getQACriteriaHierarchy(): Promise<QACriteriaWithChildren[]> {
  const [criteriaResult, weightsResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT * FROM qa_criteria 
        WHERE config_id = 'default'
          AND COALESCE(is_active, 1) = 1
        ORDER BY sort_order ASC
      `
    }),
    db.execute({
      sql: `SELECT * FROM qa_config_weights WHERE config_id = 'default'`
    }),
  ]);
  
  const weights = new Map<string, QAConfigWeight>();
  for (const row of weightsResult.rows) {
    weights.set(row.criteria_id as string, {
      id: row.id as string,
      config_id: row.config_id as string,
      criteria_id: row.criteria_id as string,
      weight: sanitizeWeight(row.weight),
      auto_calculate: Boolean(row.auto_calculate),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    });
  }
  
  const criteria: QACriteria[] = criteriaResult.rows.map(row => {
    const scoringType = normalizeScoringType(row.scoring_type);
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      ai_prompt: (row.ai_prompt as string) || '',
      scoring_type: scoringType,
      max_score: deriveMaxScore(row.scoring_type, scoringType, row.max_score),
      weight: sanitizeWeight(row.weight),
      is_required: Boolean(row.is_required),
      sort_order: Number(row.sort_order) || 0,
      parent_criteria_id: row.parent_criteria_id as string | undefined,
      level: row.parent_criteria_id ? 1 : 0,
    };
  });
  
  const hierarchy = buildCriteriaHierarchy(criteria, weights);
  autoCalculateWeights(hierarchy);
  
  return hierarchy;
}

/**
 * Get config weights for all criteria
 */
export async function getQAConfigWeights(configId: string = 'default'): Promise<QAConfigWeight[]> {
  const result = await db.execute({
    sql: `SELECT * FROM qa_config_weights WHERE config_id = ?`,
    args: [configId]
  });
  
  return result.rows.map(row => ({
    id: row.id as string,
    config_id: row.config_id as string,
    criteria_id: row.criteria_id as string,
    weight: sanitizeWeight(row.weight),
    auto_calculate: Boolean(row.auto_calculate),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

/**
 * Save or update config weight for a criteria
 */
export async function saveQAConfigWeight(
  criteriaId: string,
  weight: number,
  autoCalculate: boolean,
  configId: string = 'default'
): Promise<void> {
  // Ensure proper types
  const sanitizedWeight = Math.min(100, Math.max(0, Math.round(Number(weight) || 0)));
  const autoCalculateInt = autoCalculate ? 1 : 0;
  const now = new Date().toISOString();
  
  // Ensure config exists (to satisfy FK constraint)
  const configCheck = await db.execute({
    sql: 'SELECT id FROM qa_config WHERE id = ?',
    args: [configId]
  });
  
  if (configCheck.rows.length === 0) {
    // Create the config if it doesn't exist
    await db.execute({
      sql: 'INSERT INTO qa_config (id, name, description) VALUES (?, ?, ?)',
      args: [configId, 'Customer Service QA', 'Standard customer service quality assessment']
    });
    console.log(`[QAReview] Created QA config: ${configId}`);
  }
  
  // Verify criteria exists
  const criteriaCheck = await db.execute({
    sql: 'SELECT id FROM qa_criteria WHERE id = ?',
    args: [criteriaId]
  });
  
  if (criteriaCheck.rows.length === 0) {
    throw new Error(`Criteria '${criteriaId}' not found`);
  }
  
  // Check if weight config exists
  const existing = await db.execute({
    sql: 'SELECT id FROM qa_config_weights WHERE config_id = ? AND criteria_id = ?',
    args: [configId, criteriaId]
  });
  
  if (existing.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE qa_config_weights 
        SET weight = ?, auto_calculate = ?, updated_at = ?
        WHERE config_id = ? AND criteria_id = ?
      `,
      args: [sanitizedWeight, autoCalculateInt, now, configId, criteriaId]
    });
  } else {
    await db.execute({
      sql: `
        INSERT INTO qa_config_weights (id, config_id, criteria_id, weight, auto_calculate, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [uuidv4(), configId, criteriaId, sanitizedWeight, autoCalculateInt, now, now]
    });
  }
}

/**
 * Auto-distribute weights equally among criteria at the same level
 */
export async function autoDistributeWeights(configId: string = 'default'): Promise<void> {
  const criteria = await getQACriteria();
  
  console.log(`[QAReview] Auto-distributing weights for ${criteria.length} criteria`);
  
  if (criteria.length === 0) {
    throw new Error('No criteria found to distribute weights');
  }
  
  const mainCriteria = criteria.filter(c => !c.parent_criteria_id);
  const subCriteria = criteria.filter(c => c.parent_criteria_id);
  
  console.log(`[QAReview] Main criteria: ${mainCriteria.length}, Sub criteria: ${subCriteria.length}`);
  
  if (mainCriteria.length === 0) {
    throw new Error('No main criteria found');
  }
  
  const weightPerMain = Math.floor(100 / mainCriteria.length);
  
  // Distribute main criteria weights
  for (let i = 0; i < mainCriteria.length; i++) {
    const c = mainCriteria[i];
    console.log(`[QAReview] Processing main criteria ${i}:`, c.id, c.name);
    // Last one gets the remainder to ensure sum = 100
    const weight = i === mainCriteria.length - 1 
      ? 100 - (weightPerMain * (mainCriteria.length - 1))
      : weightPerMain;
    
    if (!c.id) {
      console.error(`[QAReview] Criteria ${i} has no id:`, c);
      throw new Error(`Criteria at index ${i} has no id`);
    }
    
    await saveQAConfigWeight(String(c.id), Number(weight), true, String(configId));
  }
  
  // For sub-criteria, distribute within each parent
  const subByParent = new Map<string, QACriteria[]>();
  for (const c of subCriteria) {
    const parentId = c.parent_criteria_id!;
    if (!subByParent.has(parentId)) {
      subByParent.set(parentId, []);
    }
    subByParent.get(parentId)!.push(c);
  }
  
  for (const [parentId, children] of subByParent) {
    if (children.length === 0) continue;
    console.log(`[QAReview] Processing ${children.length} sub-criteria for parent ${parentId}`);
    const weightPerChild = Math.floor(100 / children.length);
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      console.log(`[QAReview] Processing sub-criteria ${i}:`, c.id, c.name);
      
      if (!c.id) {
        console.error(`[QAReview] Sub-criteria ${i} has no id:`, c);
        throw new Error(`Sub-criteria at index ${i} has no id`);
      }
      
      const weight = i === children.length - 1
        ? 100 - (weightPerChild * (children.length - 1))
        : weightPerChild;
      
      await saveQAConfigWeight(String(c.id), Number(weight), true, String(configId));
    }
  }
}

/**
 * Save or update QA criteria (with sub-criteria support)
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
  parent_criteria_id?: string;
}): Promise<void> {
  const scoringType = normalizeScoringType(data.scoring_type);
  const maxScore = deriveMaxScore(data.scoring_type, scoringType, data.max_score);
  const weight = sanitizeWeight(data.weight);
  const sortOrder = Math.max(0, Math.round(Number(data.sort_order) || 0));
  const isRequired = Boolean(data.is_required);
  const name = (data.name || '').trim();
  const aiPrompt = (data.ai_prompt || '').trim();
  const description = (data.description || '').trim();
  const parentCriteriaId = data.parent_criteria_id || null;

  if (!data.id || !name || !aiPrompt) {
    throw new Error('id, name, and ai_prompt are required');
  }
  
  // Validate parent exists if specified
  if (parentCriteriaId) {
    const parentCheck = await db.execute({
      sql: 'SELECT id FROM qa_criteria WHERE id = ? AND COALESCE(is_active, 1) = 1',
      args: [parentCriteriaId]
    });
    if (parentCheck.rows.length === 0) {
      throw new Error(`Parent criteria '${parentCriteriaId}' not found`);
    }
  }

  // Check if criteria exists
  const existing = await db.execute({
    sql: 'SELECT id FROM qa_criteria WHERE id = ?',
    args: [data.id]
  });
  
  if (existing.rows.length > 0) {
    // Update existing
    const updateSql = `
      UPDATE qa_criteria SET
        name = ?,
        description = ?,
        ai_prompt = ?,
        scoring_type = ?,
        max_score = ?,
        weight = ?,
        is_required = ?,
        is_active = 1,
        sort_order = ?,
        parent_criteria_id = ?
      WHERE id = ?
    `;
    try {
      await db.execute({
        sql: updateSql,
        args: [
          name,
          description,
          aiPrompt,
          scoringType,
          maxScore,
          weight,
          isRequired ? 1 : 0,
          sortOrder,
          parentCriteriaId,
          data.id
        ]
      });
    } catch (error) {
      if (!isScoringTypeConstraintError(error)) throw error;

      const legacyScoringType = toLegacyScoringType(scoringType, maxScore);
      await db.execute({
        sql: updateSql,
        args: [
          name,
          description,
          aiPrompt,
          legacyScoringType,
          maxScore,
          weight,
          isRequired ? 1 : 0,
          sortOrder,
          parentCriteriaId,
          data.id
        ]
      });
    }
  } else {
    // Insert new
    const insertSql = `
      INSERT INTO qa_criteria (id, config_id, parent_criteria_id, name, description, ai_prompt, scoring_type, max_score, weight, is_required, sort_order)
      VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      await db.execute({
        sql: insertSql,
        args: [
          data.id,
          parentCriteriaId,
          name,
          description,
          aiPrompt,
          scoringType,
          maxScore,
          weight,
          isRequired ? 1 : 0,
          sortOrder
        ]
      });
    } catch (error) {
      if (!isScoringTypeConstraintError(error)) throw error;

      const legacyScoringType = toLegacyScoringType(scoringType, maxScore);
      await db.execute({
        sql: insertSql,
        args: [
          data.id,
          parentCriteriaId,
          name,
          description,
          aiPrompt,
          legacyScoringType,
          maxScore,
          weight,
          isRequired ? 1 : 0,
          sortOrder
        ]
      });
    }
  }
}

/**
 * Delete QA criteria
 */
export async function deleteQACriteria(id: string): Promise<void> {
  if (!id) {
    throw new Error('criteria id is required');
  }

  await db.execute({
    // Soft delete to preserve FK-linked historical QA scores.
    sql: 'UPDATE qa_criteria SET is_active = 0 WHERE id = ?',
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

  const criteria = await getQACriteria();
  const criteriaById = new Map(criteria.map((c) => [c.id, c]));

  const normalizedScores = data.criteria_scores.map((score) => {
    const criteriaDef = criteriaById.get(score.criteria_id);
    const scoringType = criteriaDef?.scoring_type || 'scale';
    const maxScore = criteriaDef?.max_score || 5;
    const logicalScore = Number(score.score) || 0;
    const storedScore = logicalToStoredScore(logicalScore, scoringType, maxScore);

    return {
      ...score,
      score: storedScore,
    };
  });

  const computedOverallScore = calculateOverallScore(
    data.criteria_scores.map((item) => ({
      criteria_id: item.criteria_id,
      score: Number(item.score) || 0,
    })),
    criteria
  );
  
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
      args: [computedOverallScore, data.general_feedback, data.status, now, existingId]
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
    for (const score of normalizedScores) {
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
    args: [id, data.call_id, data.reviewer_id, computedOverallScore, data.general_feedback, data.status, now]
  });
  
  // Insert criteria scores
  for (const score of normalizedScores) {
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
        qc.name as criteria_name,
        qc.scoring_type as criteria_scoring_type,
        qc.max_score as criteria_max_score
      FROM human_qa_criteria_scores hqcs
      LEFT JOIN qa_criteria qc ON hqcs.criteria_id = qc.id
      WHERE hqcs.human_qa_review_id = ?
    `,
    args: [reviewId]
  });
  
  const criteriaScores: HumanQACriteriaScore[] = scoresResult.rows.map(s => {
    const scoringType = normalizeScoringType(s.criteria_scoring_type);
    const maxScore = deriveMaxScore(s.criteria_scoring_type, scoringType, s.criteria_max_score);
    const displayScore = storedToLogicalScore(Number(s.score), scoringType, maxScore);

    return {
      id: s.id as string,
      criteria_id: s.criteria_id as string,
      criteria_name: (s.criteria_name || s.criteria_id) as string,
      score: displayScore,
      comment: (s.comment as string) || ''
    };
  });
  
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

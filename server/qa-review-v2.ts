import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { analyzeCallQuality } from './services/ai-qa-client';
import type { CoachingData, TranscriptEntry } from './call-sessions';

export type ScoringType = 'scale' | 'binary';
export type QAConfigVersionStatus = 'draft' | 'published' | 'archived';

export interface QACriteriaNode {
  id: string;
  config_version_id: string;
  parent_id: string | null;
  level: 0 | 1;
  code: string;
  head: string;
  title: string;
  detail: string;
  ai_prompt: string;
  scoring_type: ScoringType | null;
  max_score: number | null;
  weight: number;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  is_scorable: boolean;        // NEW: Can this node be directly scored
  rollup_mode: 'children' | 'self' | 'both';  // NEW: How to calculate score
  created_at: string;
  children?: QACriteriaNode[];
}

// Rollup mode determines how parent scores are calculated:
// - 'children': Score = weighted average of children (default for parents with children)
// - 'self': Score = direct input (parent is independently scored)
// - 'both': Combination of children rollup and direct score

const DEFAULT_CONFIG_ID = 'default';

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

function safeText(v: unknown): string {
  return String(v ?? '').trim();
}

function clampPercent(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function normalizeScoringType(v: unknown): ScoringType {
  if (v === 'binary' || v === 'binary_yes_no') return 'binary';
  return 'scale';
}

function normalizeTo100(raw: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((raw / max) * 100);
}

function buildTree(nodes: QACriteriaNode[]): QACriteriaNode[] {
  const map = new Map(nodes.map((n) => [n.id, { ...n, children: [] as QACriteriaNode[] }]));
  const roots: QACriteriaNode[] = [];
  for (const node of nodes) {
    const current = map.get(node.id)!;
    if (node.parent_id) {
      const parent = map.get(node.parent_id);
      if (parent) parent.children!.push(current);
    } else {
      roots.push(current);
    }
  }
  for (const parent of roots) parent.children!.sort((a, b) => a.sort_order - b.sort_order);
  return roots.sort((a, b) => a.sort_order - b.sort_order);
}

function flattenLeaves(tree: QACriteriaNode[]): QACriteriaNode[] {
  const out: QACriteriaNode[] = [];
  for (const p of tree) for (const c of p.children || []) out.push(c);
  return out.sort((a, b) => a.sort_order - b.sort_order);
}

async function ensureTables(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_configs (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_config_versions (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'published', 'archived')),
      published_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_id) REFERENCES qa_configs(id) ON DELETE CASCADE,
      UNIQUE(config_id, version_no)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_criteria_nodes (
      id TEXT PRIMARY KEY,
      config_version_id TEXT NOT NULL,
      parent_id TEXT,
      level INTEGER NOT NULL CHECK(level IN (0,1)),
      code TEXT NOT NULL,
      head TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      ai_prompt TEXT NOT NULL DEFAULT '',
      scoring_type TEXT CHECK(scoring_type IN ('scale', 'binary')),
      max_score INTEGER,
      weight INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_required BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      is_scorable BOOLEAN DEFAULT 0,      -- NEW: Can be directly scored
      rollup_mode TEXT DEFAULT 'children', -- NEW: children|self|both
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (config_version_id) REFERENCES qa_config_versions(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES qa_criteria_nodes(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_reviews (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      review_type TEXT NOT NULL CHECK(review_type IN ('ai', 'human')),
      reviewer_id TEXT,
      config_version_id TEXT NOT NULL,
      overall_score_100 INTEGER NOT NULL CHECK(overall_score_100 BETWEEN 0 AND 100),
      status TEXT NOT NULL CHECK(status IN ('draft', 'submitted', 'pending_review', 'reviewed')),
      summary_feedback TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (config_version_id) REFERENCES qa_config_versions(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_review_scores (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      criteria_node_id TEXT NOT NULL,
      raw_score REAL NOT NULL,
      max_score_at_review REAL NOT NULL,
      normalized_score_100 REAL NOT NULL,
      comment TEXT,
      reasoning TEXT,
      evidence_quote TEXT,
      evidence_timestamp INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES qa_reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (criteria_node_id) REFERENCES qa_criteria_nodes(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS qa_review_comments (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      timestamp_seconds INTEGER NOT NULL DEFAULT 0,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES qa_reviews(id) ON DELETE CASCADE
    )
  `);
  
  // Migrate: Add is_scorable column if not exists
  try {
    await db.execute(`ALTER TABLE qa_criteria_nodes ADD COLUMN is_scorable BOOLEAN DEFAULT 0`);
  } catch (e) {
    // Column may already exist
  }
  
  // Migrate: Add rollup_mode column if not exists
  try {
    await db.execute(`ALTER TABLE qa_criteria_nodes ADD COLUMN rollup_mode TEXT DEFAULT 'children'`);
  } catch (e) {
    // Column may already exist
  }
}

async function getLatestVersion(configId: string, status?: QAConfigVersionStatus): Promise<any | null> {
  const clause = status ? 'AND status = ?' : '';
  const args = status ? [configId, status] : [configId];
  const result = await db.execute({
    sql: `
      SELECT * FROM qa_config_versions
      WHERE config_id = ?
      ${clause}
      ORDER BY version_no DESC
      LIMIT 1
    `,
    args,
  });
  return result.rows[0] || null;
}

async function getVersionById(versionId: string): Promise<any | null> {
  const result = await db.execute({ sql: `SELECT * FROM qa_config_versions WHERE id = ?`, args: [versionId] });
  return result.rows[0] || null;
}

export async function listQAConfigVersions(configId: string): Promise<any[]> {
  const result = await db.execute({
    sql: `
      SELECT id, config_id, version_no, status, published_at, created_by, created_at
      FROM qa_config_versions
      WHERE config_id = ?
      ORDER BY version_no DESC
    `,
    args: [configId],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    config_id: String(row.config_id),
    version_no: Number(row.version_no),
    status: String(row.status),
    published_at: row.published_at ? String(row.published_at) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
  }));
}

async function readNodes(versionId: string): Promise<QACriteriaNode[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM qa_criteria_nodes
      WHERE config_version_id = ? AND COALESCE(is_active, 1) = 1
      ORDER BY level ASC, sort_order ASC
    `,
    args: [versionId],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    config_version_id: String(row.config_version_id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    level: Number(row.level) as 0 | 1,
    code: safeText(row.code),
    head: safeText(row.head),
    title: safeText(row.title),
    detail: safeText(row.detail),
    ai_prompt: safeText(row.ai_prompt),
    scoring_type: row.scoring_type ? normalizeScoringType(row.scoring_type) : null,
    max_score: row.max_score === null || row.max_score === undefined ? null : Number(row.max_score),
    weight: Number(row.weight || 0),
    sort_order: Number(row.sort_order || 0),
    is_required: toBool(row.is_required),
    is_active: toBool(row.is_active),
    is_scorable: toBool(row.is_scorable),
    rollup_mode: (row.rollup_mode as 'children' | 'self' | 'both') || 'children',
    created_at: String(row.created_at),
  }));
}

async function seedInitialVersionFromLegacy(): Promise<void> {
  const hasConfig = await db.execute({ sql: `SELECT id FROM qa_configs WHERE id = ?`, args: [DEFAULT_CONFIG_ID] });
  if (hasConfig.rows.length === 0) {
    const now = new Date().toISOString();
    await db.execute({
      sql: `
        INSERT INTO qa_configs (id, code, name, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `,
      args: [DEFAULT_CONFIG_ID, 'customer-service-qa', 'Customer Service QA', 'Versioned QA config', now, now],
    });
  }

  const latest = await getLatestVersion(DEFAULT_CONFIG_ID);
  if (latest) return;

  const versionId = uuidv4();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO qa_config_versions (id, config_id, version_no, status, published_at, created_by, created_at)
      VALUES (?, ?, 1, 'published', ?, NULL, ?)
    `,
    args: [versionId, DEFAULT_CONFIG_ID, now, now],
  });

  const legacy = await db.execute({
    sql: `
      SELECT * FROM qa_criteria
      WHERE config_id = 'default' AND COALESCE(is_active, 1) = 1
      ORDER BY sort_order ASC
    `,
  });

  const rows = legacy.rows;
  if (rows.length === 0) return;
  const childrenByParent = new Map<string, any[]>();
  for (const row of rows) {
    const parentId = row.parent_criteria_id ? String(row.parent_criteria_id) : null;
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId)!.push(row);
  }

  let parentOrder = 0;
  for (const root of rows.filter((r) => !r.parent_criteria_id)) {
    const rootId = String(root.id);
    const children = (childrenByParent.get(rootId) || []).sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    );
    const parentNodeId = children.length > 0 ? rootId : `v2_parent_${rootId}`;
    await db.execute({
      sql: `
        INSERT INTO qa_criteria_nodes (
          id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
          scoring_type, max_score, weight, sort_order, is_required, is_active, created_at
        ) VALUES (?, ?, NULL, 0, ?, ?, ?, ?, '', NULL, NULL, 100, ?, 0, 1, ?)
      `,
      args: [
        parentNodeId,
        versionId,
        parentNodeId,
        safeText(root.name) || rootId,
        safeText(root.name) || rootId,
        safeText(root.description),
        parentOrder++,
        now,
      ],
    });

    const leafRows = children.length > 0 ? children : [root];
    let childOrder = 0;
    const eachWeight = Math.floor(100 / leafRows.length);
    for (const child of leafRows) {
      const childId = String(child.id);
      const scoringType = normalizeScoringType(child.scoring_type);
      const maxScore = scoringType === 'binary' ? 1 : Number(child.max_score || 5);
      const weight = childOrder === leafRows.length - 1 ? 100 - eachWeight * (leafRows.length - 1) : eachWeight;
      await db.execute({
        sql: `
          INSERT INTO qa_criteria_nodes (
            id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
            scoring_type, max_score, weight, sort_order, is_required, is_active, created_at
          ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `,
        args: [
          childId,
          versionId,
          parentNodeId,
          childId,
          safeText(root.name) || rootId,
          safeText(child.name) || childId,
          safeText(child.description),
          safeText(child.ai_prompt),
          scoringType,
          maxScore,
          weight,
          childOrder++,
          toBool(child.is_required) ? 1 : 0,
          now,
        ],
      });
    }
  }
}

async function backfillLegacyReviewsIfNeeded(): Promise<void> {
  const existing = await db.execute({ sql: `SELECT COUNT(*) as count FROM qa_reviews` });
  if (Number(existing.rows[0]?.count || 0) > 0) return;

  const version = await getLatestVersion(DEFAULT_CONFIG_ID, 'published');
  if (!version) return;

  const validNodeResult = await db.execute({
    sql: `SELECT id FROM qa_criteria_nodes WHERE config_version_id = ?`,
    args: [String(version.id)],
  });
  const validNodeIds = new Set(validNodeResult.rows.map((r) => String(r.id)));

  const aiHeaders = await db.execute({ sql: `SELECT * FROM ai_qa_results` });
  for (const row of aiHeaders.rows) {
    const callExists = await db.execute({
      sql: `SELECT id FROM call_sessions WHERE id = ? LIMIT 1`,
      args: [String(row.call_id)],
    });
    if (callExists.rows.length === 0) {
      continue;
    }

    const reviewId = uuidv4();
    const createdAt = String(row.created_at || new Date().toISOString());
    await db.execute({
      sql: `
        INSERT INTO qa_reviews (
          id, call_id, review_type, reviewer_id, config_version_id, overall_score_100,
          status, summary_feedback, created_at, updated_at
        ) VALUES (?, ?, 'ai', NULL, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        reviewId,
        String(row.call_id),
        String(version.id),
        clampPercent(Number(row.overall_score || 0)),
        String(row.status || 'pending_review'),
        safeText(row.summary_feedback),
        createdAt,
        createdAt,
      ],
    });

    const scores = await db.execute({
      sql: `SELECT * FROM ai_qa_criteria_scores WHERE ai_qa_result_id = ?`,
      args: [String(row.id)],
    });
    for (const score of scores.rows) {
      const criteriaId = String(score.criteria_id);
      if (!validNodeIds.has(criteriaId)) {
        continue;
      }
      const raw = Number(score.score || 0);
      const max = 5;
      await db.execute({
        sql: `
          INSERT INTO qa_review_scores (
            id, review_id, criteria_node_id, raw_score, max_score_at_review, normalized_score_100,
            comment, reasoning, evidence_quote, evidence_timestamp, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
        `,
        args: [
          uuidv4(),
          reviewId,
          criteriaId,
          raw,
          max,
          normalizeTo100(raw, max),
          safeText(score.reasoning),
          safeText(score.evidence_quote),
          Number(score.evidence_timestamp || 0),
          createdAt,
        ],
      });
    }
  }

  const humanHeaders = await db.execute({ sql: `SELECT * FROM human_qa_reviews` });
  for (const row of humanHeaders.rows) {
    const callExists = await db.execute({
      sql: `SELECT id FROM call_sessions WHERE id = ? LIMIT 1`,
      args: [String(row.call_id)],
    });
    if (callExists.rows.length === 0) {
      continue;
    }
    const reviewerExists = await db.execute({
      sql: `SELECT id FROM users WHERE id = ? LIMIT 1`,
      args: [String(row.reviewer_id)],
    });
    if (reviewerExists.rows.length === 0) {
      continue;
    }

    const reviewId = uuidv4();
    const createdAt = String(row.created_at || new Date().toISOString());
    await db.execute({
      sql: `
        INSERT INTO qa_reviews (
          id, call_id, review_type, reviewer_id, config_version_id, overall_score_100,
          status, summary_feedback, created_at, updated_at
        ) VALUES (?, ?, 'human', ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        reviewId,
        String(row.call_id),
        String(row.reviewer_id),
        String(version.id),
        clampPercent(Number(row.overall_score || 0)),
        String(row.status || 'draft'),
        safeText(row.general_feedback),
        createdAt,
        createdAt,
      ],
    });
    const scores = await db.execute({
      sql: `SELECT * FROM human_qa_criteria_scores WHERE human_qa_review_id = ?`,
      args: [String(row.id)],
    });
    for (const score of scores.rows) {
      const criteriaId = String(score.criteria_id);
      if (!validNodeIds.has(criteriaId)) {
        continue;
      }
      const raw = Number(score.score || 0);
      const max = 5;
      await db.execute({
        sql: `
          INSERT INTO qa_review_scores (
            id, review_id, criteria_node_id, raw_score, max_score_at_review, normalized_score_100,
            comment, reasoning, evidence_quote, evidence_timestamp, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', 0, ?)
        `,
        args: [
          uuidv4(),
          reviewId,
          criteriaId,
          raw,
          max,
          normalizeTo100(raw, max),
          safeText(score.comment),
          createdAt,
        ],
      });
    }

    const comments = await db.execute({
      sql: `SELECT * FROM human_qa_comments WHERE human_qa_review_id = ?`,
      args: [String(row.id)],
    });
    for (const comment of comments.rows) {
      await db.execute({
        sql: `
          INSERT INTO qa_review_comments (id, review_id, timestamp_seconds, comment, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          uuidv4(),
          reviewId,
          Number(comment.timestamp_seconds || 0),
          safeText(comment.comment),
          String(comment.created_at || createdAt),
        ],
      });
    }
  }
}

export async function initializeQAV2(): Promise<void> {
  await ensureTables();
  await seedInitialVersionFromLegacy();
  await backfillLegacyReviewsIfNeeded();
}

export async function getQAConfigVersion(configId: string, versionId?: string): Promise<any> {
  const configResult = await db.execute({
    sql: `SELECT * FROM qa_configs WHERE id = ?`,
    args: [configId],
  });
  if (configResult.rows.length === 0) throw new Error(`Config '${configId}' not found`);

  const versionRow = versionId
    ? await getVersionById(versionId)
    : (await getLatestVersion(configId, 'published')) || (await getLatestVersion(configId));
  if (!versionRow) throw new Error(`No config version found for '${configId}'`);

  const nodes = await readNodes(String(versionRow.id));
  const tree = buildTree(nodes);
  const leaves = flattenLeaves(tree);

  return {
    config: configResult.rows[0],
    version: {
      id: String(versionRow.id),
      config_id: String(versionRow.config_id),
      version_no: Number(versionRow.version_no),
      status: String(versionRow.status),
      published_at: versionRow.published_at ? String(versionRow.published_at) : null,
      created_by: versionRow.created_by ? String(versionRow.created_by) : null,
      created_at: String(versionRow.created_at),
    },
    tree,
    leaves,
  };
}

export async function createQADraftVersion(configId: string, createdBy?: string): Promise<any> {
  const latest = await getLatestVersion(configId);
  if (!latest) throw new Error(`Config '${configId}' not found`);
  const now = new Date().toISOString();
  const versionId = uuidv4();
  const versionNo = Number(latest.version_no) + 1;
  await db.execute({
    sql: `
      INSERT INTO qa_config_versions (id, config_id, version_no, status, published_at, created_by, created_at)
      VALUES (?, ?, ?, 'draft', NULL, ?, ?)
    `,
    args: [versionId, configId, versionNo, createdBy || null, now],
  });

  const srcNodes = await readNodes(String(latest.id));
  const map = new Map<string, string>();
  for (const node of srcNodes.filter((n) => n.level === 0)) {
    const newId = uuidv4();
    map.set(node.id, newId);
    map.set(node.code, newId);
    await db.execute({
      sql: `
        INSERT INTO qa_criteria_nodes (
          id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
          scoring_type, max_score, weight, sort_order, is_required, is_active, created_at
        ) VALUES (?, ?, NULL, 0, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
      `,
      args: [
        newId,
        versionId,
        node.code,
        node.head,
        node.title,
        node.detail,
        node.ai_prompt,
        clampPercent(node.weight),
        node.sort_order,
        node.is_required ? 1 : 0,
        node.is_active ? 1 : 0,
        now,
      ],
    });
  }
  for (const node of srcNodes.filter((n) => n.level === 1)) {
    const newId = uuidv4();
    const newParentId = node.parent_id ? (map.get(node.parent_id) || null) : null;
    if (!newParentId) {
      continue;
    }
    await db.execute({
      sql: `
        INSERT INTO qa_criteria_nodes (
          id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
          scoring_type, max_score, weight, sort_order, is_required, is_active, created_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        newId,
        versionId,
        newParentId,
        node.code,
        node.head,
        node.title,
        node.detail,
        node.ai_prompt,
        normalizeScoringType(node.scoring_type),
        Number(node.max_score || 5),
        clampPercent(node.weight),
        node.sort_order,
        node.is_required ? 1 : 0,
        node.is_active ? 1 : 0,
        now,
      ],
    });
  }

  // Compatibility/self-heal:
  // If legacy data produced parents without children, auto-create one leaf per parent
  // so publish validation can pass and admin edits remain operable.
  const clonedNodes = await readNodes(versionId);
  const parentNodes = clonedNodes.filter((n) => n.level === 0);
  const childByParent = new Map<string, number>();
  for (const n of clonedNodes.filter((n) => n.level === 1 && !!n.parent_id)) {
    const key = String(n.parent_id);
    childByParent.set(key, (childByParent.get(key) || 0) + 1);
  }
  for (const parent of parentNodes) {
    if ((childByParent.get(parent.id) || 0) > 0) continue;
    await db.execute({
      sql: `
        INSERT INTO qa_criteria_nodes (
          id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
          scoring_type, max_score, weight, sort_order, is_required, is_active, created_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'scale', 5, 100, 0, 0, 1, ?)
      `,
      args: [
        uuidv4(),
        versionId,
        parent.id,
        `${safeText(parent.code) || parent.id}__leaf`,
        safeText(parent.head) || safeText(parent.title) || 'General',
        safeText(parent.title) || safeText(parent.code) || 'Criteria',
        safeText(parent.detail),
        safeText(parent.ai_prompt),
        now,
      ],
    });
  }

  return getQAConfigVersion(configId, versionId);
}

export async function upsertQACriteriaNode(
  configId: string,
  versionId: string,
  payload: {
    id?: string;
    parent_id?: string | null;
    level: 0 | 1;
    code: string;
    head: string;
    title: string;
    detail?: string;
    ai_prompt?: string;
    scoring_type?: ScoringType;
    max_score?: number;
    weight: number;
    sort_order: number;
    is_required?: boolean;
    is_active?: boolean;
    is_scorable?: boolean;
    rollup_mode?: 'children' | 'self' | 'both';
  }
): Promise<any> {
  const version = await getVersionById(versionId);
  if (!version || String(version.config_id) !== configId) throw new Error('Version not found');
  if (String(version.status) !== 'draft') throw new Error('Only draft version can be edited');

  if (payload.level === 0 && payload.parent_id) throw new Error('Parent criteria cannot have parent_id');
  if (payload.level === 1 && !payload.parent_id) throw new Error('Sub-criteria must have parent_id');
  if (payload.level === 1) {
    const parentResult = await db.execute({
      sql: `SELECT level FROM qa_criteria_nodes WHERE id = ? AND config_version_id = ?`,
      args: [payload.parent_id, versionId],
    });
    if (parentResult.rows.length === 0) throw new Error('Parent not found');
    if (Number(parentResult.rows[0].level) !== 0) throw new Error('Parent must be level 0');
  }

  const nodeId = payload.id || uuidv4();
  // Allow scoring_type and max_score on all levels (not just children)
  const isScorable = payload.is_scorable ?? (payload.level === 1);
  const rollupMode = payload.rollup_mode || (payload.level === 0 ? 'children' : 'self');
  const scoringType = isScorable ? normalizeScoringType(payload.scoring_type) : null;
  const maxScore = isScorable 
    ? (scoringType === 'binary' ? 1 : Math.max(1, Math.round(Number(payload.max_score || 5)))) 
    : null;
  const now = new Date().toISOString();
  const exists = await db.execute({
    sql: `SELECT id FROM qa_criteria_nodes WHERE id = ? AND config_version_id = ?`,
    args: [nodeId, versionId],
  });
  if (exists.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE qa_criteria_nodes SET
          parent_id = ?, level = ?, code = ?, head = ?, title = ?, detail = ?, ai_prompt = ?,
          scoring_type = ?, max_score = ?, weight = ?, sort_order = ?, is_required = ?, is_active = ?,
          is_scorable = ?, rollup_mode = ?
        WHERE id = ? AND config_version_id = ?
      `,
      args: [
        payload.parent_id || null,
        payload.level,
        safeText(payload.code),
        safeText(payload.head),
        safeText(payload.title),
        safeText(payload.detail),
        safeText(payload.ai_prompt),
        scoringType,
        maxScore,
        clampPercent(payload.weight),
        Math.max(0, Math.round(Number(payload.sort_order || 0))),
        payload.is_required ? 1 : 0,
        payload.is_active === false ? 0 : 1,
        isScorable ? 1 : 0,
        rollupMode,
        nodeId,
        versionId,
      ],
    });
  } else {
    await db.execute({
      sql: `
        INSERT INTO qa_criteria_nodes (
          id, config_version_id, parent_id, level, code, head, title, detail, ai_prompt,
          scoring_type, max_score, weight, sort_order, is_required, is_active, is_scorable, rollup_mode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        nodeId,
        versionId,
        payload.parent_id || null,
        payload.level,
        safeText(payload.code),
        safeText(payload.head),
        safeText(payload.title),
        safeText(payload.detail),
        safeText(payload.ai_prompt),
        scoringType,
        maxScore,
        clampPercent(payload.weight),
        Math.max(0, Math.round(Number(payload.sort_order || 0))),
        payload.is_required ? 1 : 0,
        payload.is_active === false ? 0 : 1,
        isScorable ? 1 : 0,
        rollupMode,
        now,
      ],
    });
  }
  return getQAConfigVersion(configId, versionId);
}

export async function softDeleteQACriteriaNode(configId: string, versionId: string, nodeId: string): Promise<any> {
  const version = await getVersionById(versionId);
  if (!version || String(version.config_id) !== configId) throw new Error('Version not found');
  if (String(version.status) !== 'draft') throw new Error('Only draft version can be edited');
  const existing = await db.execute({
    sql: `SELECT id, level FROM qa_criteria_nodes WHERE id = ? AND config_version_id = ?`,
    args: [nodeId, versionId],
  });
  if (existing.rows.length === 0) throw new Error('Criteria node not found');
  const level = Number(existing.rows[0].level);
  await db.execute({
    sql: `UPDATE qa_criteria_nodes SET is_active = 0 WHERE id = ? AND config_version_id = ?`,
    args: [nodeId, versionId],
  });
  if (level === 0) {
    await db.execute({
      sql: `UPDATE qa_criteria_nodes SET is_active = 0 WHERE parent_id = ? AND config_version_id = ?`,
      args: [nodeId, versionId],
    });
  }
  return getQAConfigVersion(configId, versionId);
}

export async function publishQAVersion(configId: string, versionId: string): Promise<any> {
  const version = await getVersionById(versionId);
  if (!version || String(version.config_id) !== configId) throw new Error('Version not found');
  const tree = buildTree(await readNodes(versionId));
  if (tree.length === 0) throw new Error('Cannot publish empty criteria');
  
  // Validate each parent and its children
  for (const parent of tree) {
    const children = parent.children || [];
    if (children.length === 0) throw new Error(`Parent '${parent.title}' must have sub-criteria`);
    
    // Children weights must sum to 100 for rollup calculation
    const childSum = children.reduce((acc, c) => acc + clampPercent(c.weight), 0);
    if (childSum !== 100) throw new Error(`Children weights under '${parent.title}' must sum to 100 (got ${childSum})`);
    
    for (const child of children) {
      if (child.level !== 1) throw new Error('Only parent/sub hierarchy is supported');
      if (normalizeScoringType(child.scoring_type) === 'binary' && Number(child.max_score || 1) !== 1) {
        throw new Error(`Binary sub-criteria '${child.title}' must have max_score=1`);
      }
    }
  }
  
  // Validate parent weights sum to 100 for overall score calculation
  const parentSum = tree.reduce((acc, p) => acc + clampPercent(p.weight), 0);
  if (parentSum !== 100) throw new Error(`Parent weights must sum to 100 for overall calculation (got ${parentSum})`);
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE qa_config_versions SET status = 'archived' WHERE config_id = ? AND status = 'published' AND id != ?`,
    args: [configId, versionId],
  });
  await db.execute({
    sql: `UPDATE qa_config_versions SET status = 'published', published_at = ? WHERE id = ?`,
    args: [now, versionId],
  });
  return getQAConfigVersion(configId, versionId);
}

function computeWeighted(tree: QACriteriaNode[], inputScores: Map<string, number>) {
  const leafBreakdown: Array<{ criteria_id: string; raw_score: number; max_score: number; normalized_score_100: number }> = [];
  const parentBreakdown: Array<{ parent_id: string; title: string; score_100: number; weight: number; weighted_contribution: number }> = [];
  
  // Step 1: Calculate parent scores from children (weighted average)
  for (const parent of tree) {
    const children = parent.children || [];
    let childWeightedSum = 0;
    let childWeightSum = 0;
    
    for (const child of children) {
      const type = normalizeScoringType(child.scoring_type);
      const maxScore = type === 'binary' ? 1 : Number(child.max_score || 5);
      let raw = Number(inputScores.get(child.id) ?? 0);
      if (type === 'binary') raw = raw >= 1 ? 1 : 0;
      else raw = Math.min(maxScore, Math.max(1, Math.round(raw)));
      const normalized = normalizeTo100(raw, maxScore);
      const weight = clampPercent(child.weight);
      childWeightedSum += normalized * weight;
      childWeightSum += weight;
      leafBreakdown.push({ criteria_id: child.id, raw_score: raw, max_score: maxScore, normalized_score_100: normalized });
    }
    
    // Parent score = weighted average of children (0-100 scale)
    const parentScore = childWeightSum > 0 ? Math.round(childWeightedSum / childWeightSum) : 0;
    const parentWeight = clampPercent(parent.weight);
    const weightedContribution = parentScore * parentWeight;
    
    parentBreakdown.push({ 
      parent_id: parent.id, 
      title: parent.title, 
      score_100: parentScore,
      weight: parentWeight,
      weighted_contribution: weightedContribution 
    });
  }
  
  // Step 2: Calculate overall as weighted average of parents
  const totalParentWeight = parentBreakdown.reduce((sum, p) => sum + p.weight, 0);
  const totalWeightedScore = parentBreakdown.reduce((sum, p) => sum + p.weighted_contribution, 0);
  const overall = totalParentWeight > 0 ? Math.round(totalWeightedScore / totalParentWeight) : 0;
  
  return {
    overall,
    leafBreakdown,
    parentBreakdown,
  };
}

export async function saveHumanQAReviewV2(payload: {
  call_id: string;
  reviewer_id: string;
  status: 'draft' | 'submitted';
  general_feedback?: string;
  config_id?: string;
  config_version_id?: string;
  criteria_scores: Array<{ criteria_id: string; score: number; comment?: string }>;
  comments?: Array<{ timestamp_seconds: number; comment: string }>;
}): Promise<any> {
  const configId = payload.config_id || DEFAULT_CONFIG_ID;
  const cfg = payload.config_version_id
    ? await getQAConfigVersion(configId, payload.config_version_id)
    : await getQAConfigVersion(configId);
  const tree = cfg.tree as QACriteriaNode[];
  const leaves = flattenLeaves(tree);
  const leafMap = new Map(leaves.map((l) => [l.id, l]));
  const input = new Map<string, number>();
  for (const score of payload.criteria_scores) {
    if (!leafMap.has(score.criteria_id)) throw new Error(`Invalid criteria_id '${score.criteria_id}'`);
    input.set(score.criteria_id, Number(score.score || 0));
  }
  if (payload.status === 'submitted') {
    const missing = leaves.filter((l) => l.is_required && !input.has(l.id));
    if (missing.length > 0) throw new Error(`Missing required sub-criteria: ${missing.map((m) => m.title).join(', ')}`);
  }

  const computed = computeWeighted(tree, input);
  const now = new Date().toISOString();
  const existing = await db.execute({
    sql: `
      SELECT id FROM qa_reviews
      WHERE call_id = ? AND review_type = 'human' AND reviewer_id = ?
      ORDER BY created_at DESC LIMIT 1
    `,
    args: [payload.call_id, payload.reviewer_id],
  });
  const reviewId = existing.rows.length > 0 ? String(existing.rows[0].id) : uuidv4();
  if (existing.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE qa_reviews
        SET config_version_id = ?, overall_score_100 = ?, status = ?, summary_feedback = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [cfg.version.id, computed.overall, payload.status, safeText(payload.general_feedback), now, reviewId],
    });
    await db.execute({ sql: `DELETE FROM qa_review_scores WHERE review_id = ?`, args: [reviewId] });
    await db.execute({ sql: `DELETE FROM qa_review_comments WHERE review_id = ?`, args: [reviewId] });
  } else {
    await db.execute({
      sql: `
        INSERT INTO qa_reviews (
          id, call_id, review_type, reviewer_id, config_version_id, overall_score_100,
          status, summary_feedback, created_at, updated_at
        ) VALUES (?, ?, 'human', ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        reviewId,
        payload.call_id,
        payload.reviewer_id,
        cfg.version.id,
        computed.overall,
        payload.status,
        safeText(payload.general_feedback),
        now,
        now,
      ],
    });
  }

  const commentMap = new Map(payload.criteria_scores.map((s) => [s.criteria_id, safeText(s.comment)]));
  for (const leaf of computed.leafBreakdown) {
    await db.execute({
      sql: `
        INSERT INTO qa_review_scores (
          id, review_id, criteria_node_id, raw_score, max_score_at_review, normalized_score_100,
          comment, reasoning, evidence_quote, evidence_timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', 0, ?)
      `,
      args: [
        uuidv4(),
        reviewId,
        leaf.criteria_id,
        leaf.raw_score,
        leaf.max_score,
        leaf.normalized_score_100,
        commentMap.get(leaf.criteria_id) || '',
        now,
      ],
    });
  }
  for (const comment of payload.comments || []) {
    await db.execute({
      sql: `
        INSERT INTO qa_review_comments (id, review_id, timestamp_seconds, comment, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [uuidv4(), reviewId, Number(comment.timestamp_seconds || 0), safeText(comment.comment), now],
    });
  }

  if (payload.status === 'submitted') {
    await db.execute({
      sql: `UPDATE qa_reviews SET status = 'reviewed', updated_at = ? WHERE call_id = ? AND review_type = 'ai'`,
      args: [now, payload.call_id],
    });
  }

  const result = await db.execute({ sql: `SELECT * FROM qa_reviews WHERE id = ?`, args: [reviewId] });
  return result.rows[0];
}

export async function runAIQAAnalysisV2(
  callId: string,
  transcripts: TranscriptEntry[],
  coachingHistory: CoachingData[],
  durationSeconds: number,
  totalTurns: number,
  scenarioType: string = 'customer_service'
): Promise<any> {
  const existing = await db.execute({
    sql: `SELECT * FROM qa_reviews WHERE call_id = ? AND review_type = 'ai' ORDER BY created_at DESC LIMIT 1`,
    args: [callId],
  });
  if (existing.rows.length > 0) return existing.rows[0];

  const cfg = await getQAConfigVersion(DEFAULT_CONFIG_ID);
  const leaves: QACriteriaNode[] = cfg.leaves;
  const aiCriteria = leaves.map((leaf) => ({
    id: leaf.id,
    name: leaf.title,
    description: leaf.detail,
    prompt: leaf.ai_prompt,
    ai_prompt: leaf.ai_prompt,
    scoring_type: normalizeScoringType(leaf.scoring_type),
    max_score: Number(leaf.max_score || 5),
    weight: leaf.weight,
    is_required: leaf.is_required,
  }));
  const { result } = await analyzeCallQuality({
    call_id: callId,
    transcripts,
    coaching_history: coachingHistory,
    duration_seconds: durationSeconds,
    total_turns: totalTurns,
    scenario_type: scenarioType,
    criteria: aiCriteria,
  });
  const scoreMap = new Map<string, number>();
  const aiMeta = new Map<string, { reasoning: string; evidence_quote: string; evidence_timestamp: number }>();
  for (const score of result.criteria_scores || []) {
    const found = leaves.find(
      (leaf) => leaf.id === score.criteria_id || leaf.title.toLowerCase() === String(score.criteria_name || '').toLowerCase()
    );
    if (!found) continue;
    scoreMap.set(found.id, Number(score.score || 0));
    aiMeta.set(found.id, {
      reasoning: safeText(score.reasoning),
      evidence_quote: safeText(score.evidence_quote),
      evidence_timestamp: Number(score.evidence_timestamp || 0),
    });
  }
  const computed = computeWeighted(cfg.tree as QACriteriaNode[], scoreMap);
  const now = new Date().toISOString();
  const reviewId = uuidv4();
  await db.execute({
    sql: `
      INSERT INTO qa_reviews (
        id, call_id, review_type, reviewer_id, config_version_id, overall_score_100,
        status, summary_feedback, created_at, updated_at
      ) VALUES (?, ?, 'ai', NULL, ?, ?, 'pending_review', ?, ?, ?)
    `,
    args: [reviewId, callId, cfg.version.id, computed.overall, safeText(result.summary_feedback), now, now],
  });
  for (const leaf of computed.leafBreakdown) {
    const meta = aiMeta.get(leaf.criteria_id);
    await db.execute({
      sql: `
        INSERT INTO qa_review_scores (
          id, review_id, criteria_node_id, raw_score, max_score_at_review, normalized_score_100,
          comment, reasoning, evidence_quote, evidence_timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
      `,
      args: [
        uuidv4(),
        reviewId,
        leaf.criteria_id,
        leaf.raw_score,
        leaf.max_score,
        leaf.normalized_score_100,
        meta?.reasoning || '',
        meta?.evidence_quote || '',
        meta?.evidence_timestamp || 0,
        now,
      ],
    });
  }
  const saved = await db.execute({ sql: `SELECT * FROM qa_reviews WHERE id = ?`, args: [reviewId] });
  return saved.rows[0];
}

async function getReview(callId: string, reviewType: 'ai' | 'human', reviewerId?: string): Promise<any | null> {
  const reviewerClause = reviewType === 'human' && reviewerId ? 'AND reviewer_id = ?' : '';
  const args = reviewType === 'human' && reviewerId ? [callId, reviewType, reviewerId] : [callId, reviewType];
  const header = await db.execute({
    sql: `
      SELECT * FROM qa_reviews
      WHERE call_id = ? AND review_type = ?
      ${reviewerClause}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    args,
  });
  if (header.rows.length === 0) return null;
  const h = header.rows[0];
  const scores = await db.execute({
    sql: `SELECT * FROM qa_review_scores WHERE review_id = ? ORDER BY created_at ASC`,
    args: [String(h.id)],
  });
  const comments = await db.execute({
    sql: `SELECT timestamp_seconds, comment, created_at FROM qa_review_comments WHERE review_id = ? ORDER BY timestamp_seconds ASC`,
    args: [String(h.id)],
  });
  return {
    header: h,
    scores: scores.rows,
    comments: comments.rows,
  };
}

export async function getQAReviewQueueV2(limit: number = 20, offset: number = 0): Promise<any[]> {
  const result = await db.execute({
    sql: `
      SELECT
        qr.call_id,
        s.title as scenario_title,
        u.name as operator_name,
        cs.duration_seconds,
        cs.total_turns,
        qr.overall_score_100 as ai_overall_score,
        qr.created_at
      FROM qa_reviews qr
      JOIN call_sessions cs ON qr.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      JOIN users u ON cs.user_id = u.id
      WHERE qr.review_type = 'ai' AND qr.status = 'pending_review'
      ORDER BY qr.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [limit, offset],
  });
  return result.rows;
}

export async function getReviewedCallsV2(reviewerId?: string, limit: number = 20, offset: number = 0): Promise<any[]> {
  const result = await db.execute({
    sql: `
      SELECT
        h.call_id,
        s.title as scenario_title,
        u.name as operator_name,
        cs.duration_seconds,
        COALESCE(a.overall_score_100, 0) as ai_overall_score,
        h.overall_score_100 as human_overall_score,
        ru.name as reviewer_name,
        h.created_at as reviewed_at
      FROM qa_reviews h
      LEFT JOIN qa_reviews a ON a.call_id = h.call_id AND a.review_type = 'ai'
      JOIN call_sessions cs ON h.call_id = cs.id
      JOIN scenarios s ON cs.scenario_id = s.id
      JOIN users u ON cs.user_id = u.id
      LEFT JOIN users ru ON h.reviewer_id = ru.id
      WHERE h.review_type = 'human' AND h.status = 'submitted'
      ${reviewerId ? 'AND h.reviewer_id = ?' : ''}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: reviewerId ? [reviewerId, limit, offset] : [limit, offset],
  });
  return result.rows;
}

export async function getCompleteQADataV2(callId: string, reviewerId?: string): Promise<any> {
  const ai = await getReview(callId, 'ai');
  const human = reviewerId ? await getReview(callId, 'human', reviewerId) : null;
  const activeVersionId =
    String(human?.header?.config_version_id || ai?.header?.config_version_id || '');
  const cfg = activeVersionId
    ? await getQAConfigVersion(DEFAULT_CONFIG_ID, activeVersionId)
    : await getQAConfigVersion(DEFAULT_CONFIG_ID);

  const nodeById = new Map<string, QACriteriaNode>();
  const tree: QACriteriaNode[] = cfg.tree;
  for (const p of tree) {
    nodeById.set(p.id, p);
    for (const c of p.children || []) nodeById.set(c.id, c);
  }
  const leaves = flattenLeaves(tree);
  const criteria = leaves.map((leaf, index) => ({
    id: leaf.id,
    name: leaf.title,
    description: leaf.detail,
    ai_prompt: leaf.ai_prompt,
    scoring_type: normalizeScoringType(leaf.scoring_type),
    max_score: Number(leaf.max_score || 5),
    weight: Number(leaf.weight || 0),
    is_required: leaf.is_required,
    sort_order: Number(leaf.sort_order || index),
    parent_criteria_id: leaf.parent_id || undefined,
    level: 1,
  }));

  const aiCriteriaScores = (ai?.scores || []).map((s: any) => ({
    id: String(s.id),
    criteria_id: String(s.criteria_node_id),
    criteria_name: nodeById.get(String(s.criteria_node_id))?.title || String(s.criteria_node_id),
    score: Number(s.raw_score),
    max_score: Number(s.max_score_at_review || 5),
    reasoning: safeText(s.reasoning),
    evidence_quote: safeText(s.evidence_quote),
    evidence_timestamp: Number(s.evidence_timestamp || 0),
  }));
  const humanCriteriaScores = (human?.scores || []).map((s: any) => ({
    id: String(s.id),
    criteria_id: String(s.criteria_node_id),
    criteria_name: nodeById.get(String(s.criteria_node_id))?.title || String(s.criteria_node_id),
    score: Number(s.raw_score),
    comment: safeText(s.comment),
  }));

  const aiOverall = Number(ai?.header?.overall_score_100 || 0);
  const humanOverall = Number(human?.header?.overall_score_100 || 0);
  return {
    config: {
      id: String(cfg.config.id),
      code: safeText(cfg.config.code),
      name: safeText(cfg.config.name),
      version: cfg.version,
    },
    criteria_tree: tree,
    criteria,
    ai_qa: ai
      ? {
          id: String(ai.header.id),
          call_id: String(ai.header.call_id),
          overall_score: aiOverall,
          summary_feedback: safeText(ai.header.summary_feedback),
          status: safeText(ai.header.status),
          created_at: String(ai.header.created_at),
          criteria_scores: aiCriteriaScores,
        }
      : null,
    human_qa: human
      ? {
          id: String(human.header.id),
          call_id: String(human.header.call_id),
          overall_score: humanOverall,
          general_feedback: safeText(human.header.summary_feedback),
          status: safeText(human.header.status),
          created_at: String(human.header.created_at),
          criteria_scores: humanCriteriaScores,
          comments: (human.comments || []).map((c: any) => ({
            timestamp_seconds: Number(c.timestamp_seconds || 0),
            comment: safeText(c.comment),
          })),
        }
      : null,
    comparison:
      ai && human
        ? {
            ai_overall: aiOverall,
            human_overall: humanOverall,
            difference: humanOverall - aiOverall,
            variance:
              Math.abs(humanOverall - aiOverall) <= 10
                ? 'aligned'
                : Math.abs(humanOverall - aiOverall) <= 20
                ? 'minor'
                : 'significant',
          }
        : null,
  };
}

export async function getQAWeightsV2(configId: string = DEFAULT_CONFIG_ID): Promise<any[]> {
  const cfg = await getQAConfigVersion(configId);
  const rows: any[] = [];
  for (const parent of cfg.tree as QACriteriaNode[]) {
    rows.push({
      criteria_id: parent.id,
      weight: clampPercent(parent.weight || 100),
      auto_calculate: true,
    });
    for (const child of parent.children || []) {
      rows.push({
        criteria_id: child.id,
        weight: clampPercent(child.weight || 0),
        auto_calculate: false,
      });
    }
  }
  return rows;
}

export async function saveQAWeightV2(configId: string, criteriaId: string, weight: number): Promise<void> {
  const cfg = await getQAConfigVersion(configId);
  const workingVersion =
    cfg.version.status === 'draft'
      ? cfg.version.id
      : (await createQADraftVersion(configId)).version.id;
  await db.execute({
    sql: `
      UPDATE qa_criteria_nodes
      SET weight = ?
      WHERE id = ? AND config_version_id = ?
    `,
    args: [clampPercent(weight), criteriaId, workingVersion],
  });
  await publishQAVersion(configId, workingVersion);
}

export async function autoDistributeWeightsV2(configId: string): Promise<void> {
  const cfg = await getQAConfigVersion(configId);
  const workingVersion =
    cfg.version.status === 'draft'
      ? cfg.version.id
      : (await createQADraftVersion(configId)).version.id;

  const tree = buildTree(await readNodes(workingVersion));
  for (const parent of tree) {
    await db.execute({
      sql: `UPDATE qa_criteria_nodes SET weight = 100 WHERE id = ? AND config_version_id = ?`,
      args: [parent.id, workingVersion],
    });
    const children = parent.children || [];
    if (children.length === 0) continue;
    const each = Math.floor(100 / children.length);
    for (let i = 0; i < children.length; i++) {
      const childWeight = i === children.length - 1 ? 100 - each * (children.length - 1) : each;
      await db.execute({
        sql: `UPDATE qa_criteria_nodes SET weight = ? WHERE id = ? AND config_version_id = ?`,
        args: [childWeight, children[i].id, workingVersion],
      });
    }
  }

  await publishQAVersion(configId, workingVersion);
}

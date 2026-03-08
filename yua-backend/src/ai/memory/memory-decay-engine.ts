// 🔥 YUA Memory Decay Engine — PHASE 2 (Exponential Decay)
// --------------------------------------------------
// ✔ Batch / Cron only
// ✔ NO judgment / NO routing
// ✔ Exponential decay: C_new = max(floor, C_old × e^(-ln2/H × t) × access_boost × source_penalty)
// ✔ Reversible / explainable
// ✔ PostgreSQL native (batch CTE update)
// ✔ Workspace-level protection (freeze check + collapse detection)
// ✔ Archive: confidence < 0.10 → is_active = false
// --------------------------------------------------

import { pgPool } from "../../db/postgres";

export type MemoryDecayResult = {
  scanned: number;
  decayed: number;
  archived: number;
  skippedFrozen: number;
};

/* ===================================================
   Scope-specific half-lives (days)
=================================================== */
const SCOPE_HALF_LIFE: Record<string, number> = {
  user_profile: 120,
  user_preference: 60,
  project_architecture: 90,
  project_decision: 90,
  user_research: 45,
  general_knowledge: 30,
};

/* ===================================================
   Scope-specific confidence floors
=================================================== */
const SCOPE_FLOOR: Record<string, number> = {
  user_profile: 0.20,
  user_preference: 0.15,
  project_architecture: 0.20,
  project_decision: 0.20,
  user_research: 0.10,
  general_knowledge: 0.05,
};

/* ===================================================
   Source penalties
=================================================== */
const SOURCE_PENALTY: Record<string, number> = {
  explicit: 1.0,
  tool_verified: 1.0,
  search_verified: 0.95,
  passive: 0.85,
};

const ARCHIVE_THRESHOLD = 0.10;

export const MemoryDecayEngine = {
  /**
   * 🔥 MAIN ENTRY
   * - 하루 1회 또는 수동 실행
   * - Batch CTE approach: one UPDATE per non-frozen workspace set
   */
  async run(): Promise<MemoryDecayResult> {
    let scanned = 0;
    let decayed = 0;
    let archived = 0;
    let skippedFrozen = 0;

    // 🔒 Step 1: Get frozen workspace IDs to exclude
    const { rows: frozenRows } = await pgPool.query<{ workspace_id: string }>(
      `SELECT workspace_id FROM workspace_memory_state WHERE is_frozen = true`
    );
    const frozenSet = new Set(frozenRows.map((r) => r.workspace_id));

    // 🔒 Step 2: Fetch all active records
    const { rows } = await pgPool.query<{
      id: number;
      workspace_id: string;
      scope: string;
      source: string;
      confidence: number;
      access_count: number;
      last_accessed_at: Date | null;
      created_at: Date;
    }>(
      `
      SELECT
        id, workspace_id, scope, source,
        confidence, access_count,
        last_accessed_at, created_at
      FROM memory_records
      WHERE confidence > 0
        AND is_active = true
      `
    );

    scanned = rows.length;

    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const LN2 = Math.LN2;

    // Batch: collect { id, newConfidence } pairs
    const updates: { id: number; confidence: number }[] = [];
    const archiveIds: number[] = [];

    for (const r of rows) {
      // 🔒 workspace freeze → skip
      if (frozenSet.has(r.workspace_id)) {
        skippedFrozen++;
        continue;
      }

      const halfLife = SCOPE_HALF_LIFE[r.scope];
      const floor = SCOPE_FLOOR[r.scope];

      // Unsupported scope → skip
      if (halfLife === undefined || floor === undefined) {
        continue;
      }

      // Time since last access (days, fractional)
      const lastTs = r.last_accessed_at
        ? new Date(r.last_accessed_at).getTime()
        : new Date(r.created_at).getTime();
      const t = Math.max(0, (now - lastTs) / MS_PER_DAY);

      // Exponential decay factor: e^(-ln2/H × t)
      const decayFactor = Math.exp((-LN2 / halfLife) * t);

      // Access boost: min(1.5, 1 + 0.20 × ln(1 + access_count))
      const accessBoost = Math.min(
        1.5,
        1 + 0.20 * Math.log(1 + (r.access_count ?? 0))
      );

      // Source penalty (default 1.0 for unknown sources)
      const sourcePenalty = SOURCE_PENALTY[r.source] ?? 1.0;

      // New confidence
      const raw = r.confidence * decayFactor * accessBoost * sourcePenalty;
      const newConfidence = Number(Math.max(floor, raw).toFixed(4));

      // Archive if below threshold
      if (newConfidence < ARCHIVE_THRESHOLD) {
        archiveIds.push(r.id);
        continue;
      }

      // Only update if changed
      if (newConfidence !== r.confidence) {
        updates.push({ id: r.id, confidence: newConfidence });
      }
    }

    // 🔒 Step 3: Batch UPDATE via CTE (unnest approach)
    if (updates.length > 0) {
      const ids = updates.map((u) => u.id);
      const confidences = updates.map((u) => u.confidence);

      await pgPool.query(
        `
        UPDATE memory_records m
        SET
          confidence = v.new_confidence,
          updated_at = NOW()
        FROM (
          SELECT
            unnest($1::bigint[]) AS id,
            unnest($2::numeric[]) AS new_confidence
        ) v
        WHERE m.id = v.id
        `,
        [ids, confidences]
      );

      decayed = updates.length;
    }

    // 🔒 Step 4: Archive records below threshold
    if (archiveIds.length > 0) {
      await pgPool.query(
        `
        UPDATE memory_records
        SET is_active = false, updated_at = NOW()
        WHERE id = ANY($1::bigint[])
        `,
        [archiveIds]
      );

      archived = archiveIds.length;
    }

    /* --------------------------------------------------
       🔒 Workspace-level collapse detection
       - 평균 confidence 붕괴 시 자동 FREEZE
    -------------------------------------------------- */
    await pgPool.query(
      `
      UPDATE workspace_memory_state s
      SET
        is_frozen = true,
        frozen_reason = 'confidence_collapse',
        frozen_at = NOW(),
        frozen_by = 'decay',
        auto_unfreeze_at = NOW() + INTERVAL '12 hours',
        updated_at = NOW()
      FROM (
        SELECT workspace_id
        FROM memory_records
        WHERE is_active = true
        GROUP BY workspace_id
        HAVING AVG(confidence) < 0.25
      ) t
      WHERE s.workspace_id = t.workspace_id
        AND s.is_frozen = false
      `
    );

    return { scanned, decayed, archived, skippedFrozen };
  },
};

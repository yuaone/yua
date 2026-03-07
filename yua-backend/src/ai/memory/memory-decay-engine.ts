// 🔥 YUA Memory Decay Engine — PHASE 12-2 (FREEZE AWARE)
// --------------------------------------------------
// ✔ Batch / Cron only
// ✔ NO judgment / NO routing
// ✔ Confidence-weight decay ONLY
// ✔ Reversible / explainable
// ✔ PostgreSQL native
// ✔ Workspace-level protection
// --------------------------------------------------

import { pgPool } from "../../db/postgres";
import { SignalRepo } from "../statistics/signal-repo";

export type MemoryDecayResult = {
  scanned: number;
  decayed: number;
  skipped: number;
};

type DecayPolicy = {
  scope: string;
  baseRate: number;
  idleBoost: number;
  minConfidence: number;
};

/**
 * 🔒 SSOT Decay Policy
 * - scope 단위로만 제어
 */
const DECAY_POLICIES: DecayPolicy[] = [
  {
    scope: "general_knowledge",
    baseRate: 0.015,
    idleBoost: 0.02,
    minConfidence: 0.25,
  },
  {
    scope: "flow",
    baseRate: 0.02,
    idleBoost: 0.03,
    minConfidence: 0.3,
  },
  {
    scope: "rule",
    baseRate: 0.005,
    idleBoost: 0.01,
    minConfidence: 0.5,
  },
];

function daysBetween(a: Date, b: Date): number {
  return Math.floor(
    Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export const MemoryDecayEngine = {
  /**
   * 🔥 MAIN ENTRY
   * - 하루 1회 또는 수동 실행
   */
  async run(): Promise<MemoryDecayResult> {
    let scanned = 0;
    let decayed = 0;
    let skipped = 0;

    const now = new Date();

    const { rows } = await pgPool.query<{
      id: number;
      workspace_id: string;
      scope: string;
      confidence: number;
      access_count: number;
      last_accessed_at: Date | null;
      created_at: Date;
    }>(
      `
      SELECT
        id,
        workspace_id,
        scope,
        confidence,
        access_count,
        last_accessed_at,
        created_at
      FROM memory_records
      WHERE confidence > 0
        AND is_active = true
      `
    );

    scanned = rows.length;

    for (const r of rows) {
            const policy = DECAY_POLICIES.find(
        (p) => p.scope === r.scope
      );

      // 🔒 scope 미지원 → skip
      if (!policy) {
        skipped++;
        continue;
      }

      // 🔒 SIGNAL: Memory Decay Hint (optional)
      const hint = await SignalRepo.getLatest<{
        baseRate?: number;
      }>({
        kind: "MEMORY_DECAY_HINT",
        scope: "GLOBAL",
      });

      const signalBaseRate =
        hint && hint.confidence >= 0.6
          ? Number(hint.value?.baseRate ?? policy.baseRate)
          : policy.baseRate;

      // 🔒 workspace freeze 상태 확인
      const { rows: freezeRows } = await pgPool.query<{
        is_frozen: boolean;
      }>(
        `
        SELECT is_frozen
        FROM workspace_memory_state
        WHERE workspace_id = $1
        `,
        [r.workspace_id]
      );

      if (freezeRows[0]?.is_frozen === true) {
        skipped++;
        continue;
      }

      const last = r.last_accessed_at ?? r.created_at;
      const idleDays = daysBetween(new Date(last), now);

      // 🔒 decay 계산 (explainable)
      let decay =
        signalBaseRate +
        (idleDays >= 7 ? policy.idleBoost : 0);

      // 사용량이 많으면 decay 완화
      if (r.access_count >= 5) {
        decay *= 0.5;
      }

      const nextConfidence = Number(
        Math.max(
          policy.minConfidence,
          r.confidence * (1 - decay)
        ).toFixed(4)
      );

      if (nextConfidence === r.confidence) {
        skipped++;
        continue;
      }

      await pgPool.query(
        `
        UPDATE memory_records
        SET
          confidence = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [nextConfidence, r.id]
      );

      decayed++;
    }

    /* --------------------------------------------------
       🔒 PHASE 12-2: Workspace-level collapse detection
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

    return { scanned, decayed, skipped };
  },
};

// 📂 src/ai/memory/memory-merge.engine.ts
// 🔥 YUA Memory Merge Engine — PHASE 9-9 FINAL (PostgreSQL)
// - deterministic
// - no LLM
// - pgvector native similarity
// - transactional

import { pgPool } from "../../db/postgres";

export interface MergeResult {
  baseId: number;
  mergedIds: number[];
  similarity: number; // 평균 similarity
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export const MemoryMergeEngine = {
  /**
   * Near-duplicate merge
   */
  async mergeNearDuplicates(args: {
    userId: number;
    scope: string;
    threshold?: number;
    limit?: number;
  }): Promise<MergeResult | null> {
    const { userId, scope, threshold = 0.92, limit = 50 } = args;
    if (!Number.isFinite(userId) || userId <= 0) return null;

    // 1️⃣ base + candidates 로드
    const { rows } = await pgPool.query<{
      id: number;
      embedding: number[];
      confidence: number;
      usage_count: number;
    }>(
      `
      SELECT id, embedding, confidence, usage_count
      FROM memory_records
      WHERE user_id = $1
        AND scope = $2
        AND is_active = true
        AND embedding IS NOT NULL
      ORDER BY usage_count DESC,
               confidence DESC,
               id ASC
      LIMIT $3
      `,
      [userId, scope, limit]
    );

    if (rows.length < 2) return null;

    const base = rows[0];
    const mergedIds: number[] = [];
    const sims: number[] = [];

    // 2️⃣ M-05 FIX: Batch similarity query instead of O(n) individual queries
    const candidateIds = rows.slice(1).map((r) => r.id);
    if (candidateIds.length > 0) {
      const simRes = await pgPool.query<{ id: number; sim: number }>(
        `
        SELECT id, 1 - (embedding <=> $1::vector) AS sim
        FROM memory_records
        WHERE id = ANY($2::bigint[])
          AND embedding IS NOT NULL
        `,
        [base.embedding, candidateIds]
      );

      for (const r of simRes.rows) {
        const sim = clamp01(r.sim ?? 0);
        if (sim >= threshold) {
          mergedIds.push(r.id);
          sims.push(sim);
        }
      }
    }

    if (!mergedIds.length) return null;

    const avgSim =
      clamp01(sims.reduce((a, b) => a + b, 0) / sims.length);

    // 3️⃣ 트랜잭션 merge
    await pgPool.query("BEGIN");

    try {
      await pgPool.query(
        `
        UPDATE memory_records
        SET
          is_active = false,
          merged_to = $1,
          updated_at = NOW()
        WHERE id = ANY($2::bigint[])
        `,
        [base.id, mergedIds]
      );

      const bump = Math.min(0.02, mergedIds.length * 0.002);
      const newConfidence = clamp01(
        Math.max(base.confidence, base.confidence + bump)
      );

      await pgPool.query(
        `
        UPDATE memory_records
        SET
          merged_from = COALESCE(merged_from, ARRAY[]::bigint[]) || $1::bigint[],
          confidence = $2,
          updated_at = NOW()
        WHERE id = $3
        `,
        [mergedIds, newConfidence, base.id]
      );

      for (let i = 0; i < mergedIds.length; i++) {
        await pgPool.query(
          `
          INSERT INTO memory_merge_logs
            (base_memory_id, merged_memory_id, similarity)
          VALUES ($1, $2, $3)
          `,
          [base.id, mergedIds[i], sims[i]]
        );
      }

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }

    return {
      baseId: base.id,
      mergedIds,
      similarity: avgSim,
    };
  },
};

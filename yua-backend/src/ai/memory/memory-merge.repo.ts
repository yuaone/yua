// 📂 src/ai/memory/memory-merge.repo.ts
// 🔥 YUA Memory Merge Repository — PHASE 12-1-C (PostgreSQL / workspace SSOT)

import { pgPool } from "../../db/postgres";

export interface MergeResult {
  baseId: number;
  mergedIds: number[];
  similarityAvg: number;
}

export async function mergeSimilarMemories(params: {
  workspaceId: string; // UUID
  scope: string;
  threshold?: number;
  limit?: number;
}): Promise<MergeResult | null> {
  const { workspaceId, scope, threshold = 0.92, limit = 50 } = params;

  if (!workspaceId || workspaceId.trim().length < 10) {
    throw new Error("missing_workspace_id");
  }

  const { rows } = await pgPool.query<{
    id: number;
    embedding: number[];
    confidence: number;
    usage_count: number;
  }>(
    `
    SELECT id, embedding, confidence, usage_count
    FROM memory_records
    WHERE workspace_id = $1
      AND scope = $2
      AND is_active = true
      AND embedding IS NOT NULL
    ORDER BY usage_count DESC, confidence DESC, id ASC
    LIMIT $3
    `,
    [workspaceId, scope, limit]
  );

  if (rows.length < 2) return null;

  const base = rows[0];
  const mergedIds: number[] = [];
  const sims: number[] = [];

  // M-05 FIX: Batch similarity query instead of O(n) individual queries
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
      const sim = r.sim ?? 0;
      if (sim >= threshold) {
        mergedIds.push(r.id);
        sims.push(sim);
      }
    }
  }

  if (!mergedIds.length) return null;

  const avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;

  await pgPool.query("BEGIN");

  try {
    // merged rows deactivate (workspace boundary)
    await pgPool.query(
      `
      UPDATE memory_records
      SET
        is_active = false,
        merged_to = $1,
        updated_at = NOW()
      WHERE workspace_id = $2
        AND id = ANY($3::bigint[])
      `,
      [base.id, workspaceId, mergedIds]
    );

    // base row updated
    await pgPool.query(
      `
      UPDATE memory_records
      SET
        merged_from = COALESCE(merged_from, ARRAY[]::bigint[]) || $1::bigint[],
        confidence = LEAST(1, confidence + 0.01),
        updated_at = NOW()
      WHERE workspace_id = $2
        AND id = $3
      `,
      [mergedIds, workspaceId, base.id]
    );

    // logs
    for (let i = 0; i < mergedIds.length; i++) {
      await pgPool.query(
        `
        INSERT INTO memory_merge_logs
          (workspace_id, base_memory_id, merged_memory_id, similarity)
        VALUES ($1, $2, $3, $4)
        `,
        [workspaceId, base.id, mergedIds[i], sims[i]]
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
    similarityAvg: avgSim,
  };
}

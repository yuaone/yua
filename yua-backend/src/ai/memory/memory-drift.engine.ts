// 🔥 YUA Memory Drift Engine — PHASE 12-2 (AUTO FREEZE)

import { pgPool } from "../../db/postgres";
import { embed } from "../vector/embedder";
import { classifyDrift } from "./runtime/memory-rule-guard";

export type DriftStatus = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface DriftReport {
  memoryId: number;
  similarity: number;
  driftScore: number;
  status: DriftStatus;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export const MemoryDriftEngine = {
  async checkOne(args: {
    workspaceId: string;
    memoryId: number;
    referenceText: string;
    apiKey?: string;
  }): Promise<DriftReport | null> {
    const { workspaceId, memoryId, referenceText, apiKey } = args;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }
    if (!Number.isFinite(memoryId) || memoryId <= 0) return null;
    if (!referenceText?.trim()) return null;

    const ref = await embed(referenceText, apiKey);
    const refVec = ref.vector;

    const { rows } = await pgPool.query<{
      id: number;
      similarity: number;
    }>(
      `
      SELECT
        id,
        1 - (embedding <=> $1::vector) AS similarity
      FROM memory_records
      WHERE workspace_id = $2
        AND id = $3
        AND is_active = true
        AND embedding IS NOT NULL
      LIMIT 1
      `,
      [refVec, workspaceId, memoryId]
    );

    if (!rows.length) return null;

    const similarity = clamp01(rows[0].similarity);
    const driftScore = clamp01(1 - similarity);

    // 🔑 FIX: async + workspaceId 전달
    const status = await classifyDrift(workspaceId, driftScore);

    await pgPool.query(
      `
      UPDATE memory_records
      SET
        drift_score = $1,
        drift_status = $2,
        drift_checked_at = NOW(),
        updated_at = NOW()
      WHERE workspace_id = $3
        AND id = $4
      `,
      [driftScore, status, workspaceId, memoryId]
    );

    await pgPool.query(
      `
      INSERT INTO memory_drift_logs
        (workspace_id, memory_id, similarity, drift_score, drift_status)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [workspaceId, memoryId, similarity, driftScore, status]
    );

    if (status === "HIGH") {
      await pgPool.query(
        `
        UPDATE workspace_memory_state
        SET
          is_frozen = true,
          frozen_reason = 'high_drift',
          frozen_at = NOW(),
          frozen_by = 'drift',
          auto_unfreeze_at = NOW() + INTERVAL '6 hours',
          updated_at = NOW()
        WHERE workspace_id = $1
          AND is_frozen = false
        `,
        [workspaceId]
      );
    }

    return { memoryId, similarity, driftScore, status };
  },

  async checkRecentForWorkspace(args: {
    workspaceId: string;
    referenceText: string;
    limit?: number;
    apiKey?: string;
  }): Promise<DriftReport[]> {
    const { workspaceId, referenceText, limit = 25, apiKey } = args;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }
    if (!referenceText?.trim()) return [];

    const { rows } = await pgPool.query<{ id: number }>(
      `
      SELECT id
      FROM memory_records
      WHERE workspace_id = $1
        AND is_active = true
        AND embedding IS NOT NULL
      ORDER BY last_used_at DESC NULLS LAST,
               usage_count DESC,
               id DESC
      LIMIT $2
      `,
      [workspaceId, limit]
    );

    // M-05 FIX: Embed referenceText once, batch pgvector distance queries
    const ref = await embed(referenceText, apiKey);
    const refVec = ref.vector;
    const memoryIds = rows.map((r) => r.id);

    const simResult = await pgPool.query<{
      id: number;
      similarity: number;
    }>(
      `
      SELECT
        id,
        1 - (embedding <=> $1::vector) AS similarity
      FROM memory_records
      WHERE workspace_id = $2
        AND id = ANY($3::bigint[])
        AND is_active = true
        AND embedding IS NOT NULL
      `,
      [refVec, workspaceId, memoryIds]
    );

    const reports: DriftReport[] = [];

    for (const row of simResult.rows) {
      const similarity = clamp01(row.similarity);
      const driftScore = clamp01(1 - similarity);
      const status = await classifyDrift(workspaceId, driftScore);

      await pgPool.query(
        `
        UPDATE memory_records
        SET
          drift_score = $1,
          drift_status = $2,
          drift_checked_at = NOW(),
          updated_at = NOW()
        WHERE workspace_id = $3
          AND id = $4
        `,
        [driftScore, status, workspaceId, row.id]
      );

      await pgPool.query(
        `
        INSERT INTO memory_drift_logs
          (workspace_id, memory_id, similarity, drift_score, drift_status)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [workspaceId, row.id, similarity, driftScore, status]
      );

      if (status === "HIGH") {
        await pgPool.query(
          `
          UPDATE workspace_memory_state
          SET
            is_frozen = true,
            frozen_reason = 'high_drift',
            frozen_at = NOW(),
            frozen_by = 'drift',
            auto_unfreeze_at = NOW() + INTERVAL '6 hours',
            updated_at = NOW()
          WHERE workspace_id = $1
            AND is_frozen = false
          `,
          [workspaceId]
        );
      }

      reports.push({ memoryId: row.id, similarity, driftScore, status });
    }

    return reports;
  },
};

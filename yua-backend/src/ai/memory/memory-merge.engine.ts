// src/ai/memory/memory-merge.engine.ts
// YUA Memory Merge Engine — Two-Tier (DEDUP + MERGE)
// --------------------------------------------------
// sim >= 0.90       → DEDUP  (deactivate lower record, keep base)
// 0.85 <= sim < 0.90 → MERGE  (combine content, merge confidence formula)
// sim < 0.85        → NO ACTION
// --------------------------------------------------
// - Workspace-based queries
// - Transactional (BEGIN/COMMIT/ROLLBACK)
// - pgvector native similarity
// - Deterministic, no LLM
// --------------------------------------------------

import { pgPool } from "../../db/postgres.js";

export interface MergeResult {
  baseId: number;
  mergedIds: number[];
  similarity: number;
  mergeType: "DEDUP" | "MERGE";
}

const DEDUP_THRESHOLD = 0.90;
const MERGE_THRESHOLD = 0.85;
const MAX_MERGED_CONTENT_LENGTH = 200;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Extract unique parts from `other` that are not already in `base`.
 * Simple word-level diff — no LLM.
 */
function extractUniqueParts(base: string, other: string): string {
  const baseWords = new Set(base.toLowerCase().split(/\s+/));
  const otherWords = other.split(/\s+/);
  const unique = otherWords.filter((w) => !baseWords.has(w.toLowerCase()));
  return unique.join(" ");
}

export const MemoryMergeEngine = {
  /**
   * Two-Tier near-duplicate merge for a workspace + scope.
   * Processes ALL qualifying pairs in one call.
   */
  async mergeNearDuplicates(args: {
    workspaceId: string;
    scope: string;
    threshold?: number; // kept for API compat but ignored in favor of two-tier
    limit?: number;
  }): Promise<MergeResult[]> {
    const { workspaceId, scope, limit = 50 } = args;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    // ── Freeze check ──────────────────────────────────
    const { rows: freezeRows } = await pgPool.query<{ is_frozen: boolean }>(
      `SELECT is_frozen FROM workspace_memory_state WHERE workspace_id = $1`,
      [workspaceId]
    );
    if (freezeRows.length > 0 && freezeRows[0].is_frozen) {
      return [];
    }

    // ── Load candidates ───────────────────────────────
    const { rows } = await pgPool.query<{
      id: number;
      content: string;
      embedding: number[];
      confidence: number;
      usage_count: number;
    }>(
      `
      SELECT id, content, embedding, confidence, usage_count
      FROM memory_records
      WHERE workspace_id = $1
        AND scope = $2
        AND is_active = true
        AND embedding IS NOT NULL
      ORDER BY confidence DESC, id ASC
      LIMIT $3
      `,
      [workspaceId, scope, limit]
    );

    if (rows.length < 2) return [];

    // ── Compute all pairwise similarities via batch query ──
    // For each record, compare against all others with higher confidence (or lower id).
    // We treat the first record in a matched pair (by confidence DESC, id ASC) as "base".
    const consumed = new Set<number>();
    const results: MergeResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const base = rows[i];
      if (consumed.has(base.id)) continue;

      const candidateIds = rows
        .slice(i + 1)
        .filter((r) => !consumed.has(r.id))
        .map((r) => r.id);

      if (candidateIds.length === 0) continue;

      const simRes = await pgPool.query<{ id: number; sim: number }>(
        `
        SELECT id, 1 - (embedding <=> $1::vector) AS sim
        FROM memory_records
        WHERE id = ANY($2::bigint[])
          AND embedding IS NOT NULL
        `,
        [base.embedding, candidateIds]
      );

      const dedupIds: number[] = [];
      const dedupSims: number[] = [];
      const mergeIds: number[] = [];
      const mergeSims: number[] = [];

      for (const r of simRes.rows) {
        const sim = clamp01(r.sim ?? 0);
        if (sim >= DEDUP_THRESHOLD) {
          dedupIds.push(r.id);
          dedupSims.push(sim);
          consumed.add(r.id);
        } else if (sim >= MERGE_THRESHOLD) {
          mergeIds.push(r.id);
          mergeSims.push(sim);
          consumed.add(r.id);
        }
      }

      // ── DEDUP tier ────────────────────────────────
      if (dedupIds.length > 0) {
        const avgSim = clamp01(
          dedupSims.reduce((a, b) => a + b, 0) / dedupSims.length
        );

        await pgPool.query("BEGIN");
        try {
          // Deactivate merged records
          await pgPool.query(
            `
            UPDATE memory_records
            SET is_active = false,
                merged_to = $1,
                updated_at = NOW()
            WHERE workspace_id = $2
              AND id = ANY($3::bigint[])
            `,
            [base.id, workspaceId, dedupIds]
          );

          // Small confidence bump on base
          const bump = Math.min(0.02, dedupIds.length * 0.002);
          const newConfidence = clamp01(base.confidence + bump);

          await pgPool.query(
            `
            UPDATE memory_records
            SET merged_from = COALESCE(merged_from, ARRAY[]::bigint[]) || $1::bigint[],
                confidence = $2,
                updated_at = NOW()
            WHERE workspace_id = $3
              AND id = $4
            `,
            [dedupIds, newConfidence, workspaceId, base.id]
          );

          // Log
          for (let j = 0; j < dedupIds.length; j++) {
            await pgPool.query(
              `
              INSERT INTO memory_merge_logs
                (workspace_id, base_memory_id, merged_memory_id, similarity, merge_type)
              VALUES ($1, $2, $3, $4, 'DEDUP')
              `,
              [workspaceId, base.id, dedupIds[j], dedupSims[j]]
            );
          }

          await pgPool.query("COMMIT");
        } catch (e) {
          await pgPool.query("ROLLBACK");
          throw e;
        }

        results.push({
          baseId: base.id,
          mergedIds: dedupIds,
          similarity: avgSim,
          mergeType: "DEDUP",
        });
      }

      // ── MERGE tier ────────────────────────────────
      if (mergeIds.length > 0) {
        const avgSim = clamp01(
          mergeSims.reduce((a, b) => a + b, 0) / mergeSims.length
        );

        // Build candidate rows map for content merge
        const candidateMap = new Map(rows.map((r) => [r.id, r]));

        await pgPool.query("BEGIN");
        try {
          // For each merge candidate: combine content, compute merged confidence
          for (let j = 0; j < mergeIds.length; j++) {
            const other = candidateMap.get(mergeIds[j]);
            if (!other) continue;

            const sim = mergeSims[j];

            // Merge confidence formula: C_merged = min(1.0, C_base + 0.3 * C_other * (1 - similarity))
            const mergedConfidence = clamp01(
              base.confidence + 0.3 * other.confidence * (1 - sim)
            );

            // Content merge strategy
            let mergedContent: string;
            const uniqueParts = extractUniqueParts(base.content, other.content);
            const combined = uniqueParts
              ? `${base.content} | ${uniqueParts}`
              : base.content;

            if (combined.length <= MAX_MERGED_CONTENT_LENGTH) {
              mergedContent = combined;
            } else {
              mergedContent = base.content.slice(0, MAX_MERGED_CONTENT_LENGTH);
            }

            // Update base with merged content + confidence
            await pgPool.query(
              `
              UPDATE memory_records
              SET content = $1,
                  confidence = $2,
                  merged_from = COALESCE(merged_from, ARRAY[]::bigint[]) || ARRAY[$3::bigint],
                  updated_at = NOW()
              WHERE workspace_id = $4
                AND id = $5
              `,
              [mergedContent, mergedConfidence, mergeIds[j], workspaceId, base.id]
            );

            // Update the running base content/confidence for subsequent merges in this batch
            base.content = mergedContent;
            base.confidence = mergedConfidence;
          }

          // Deactivate all merge candidates
          await pgPool.query(
            `
            UPDATE memory_records
            SET is_active = false,
                merged_to = $1,
                updated_at = NOW()
            WHERE workspace_id = $2
              AND id = ANY($3::bigint[])
            `,
            [base.id, workspaceId, mergeIds]
          );

          // Log
          for (let j = 0; j < mergeIds.length; j++) {
            await pgPool.query(
              `
              INSERT INTO memory_merge_logs
                (workspace_id, base_memory_id, merged_memory_id, similarity, merge_type)
              VALUES ($1, $2, $3, $4, 'MERGE')
              `,
              [workspaceId, base.id, mergeIds[j], mergeSims[j]]
            );
          }

          await pgPool.query("COMMIT");
        } catch (e) {
          await pgPool.query("ROLLBACK");
          throw e;
        }

        results.push({
          baseId: base.id,
          mergedIds: mergeIds,
          similarity: avgSim,
          mergeType: "MERGE",
        });
      }
    }

    return results;
  },
};

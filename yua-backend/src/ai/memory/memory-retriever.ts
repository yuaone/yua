// 📂 src/ai/memory/memory-retriever.ts
// 🔥 YUA Memory Retriever — PHASE 12-1-C FINAL (SSOT / workspace boundary)

import { pgPool } from "../../db/postgres";
import type { MemoryScope } from "yua-shared/memory/types";

export type RetrievedMemory = {
  id: number;
  content: string;
  confidence: number;
};

export const MemoryRetriever = {
  async retrieve(params: {
    workspaceId: string; // UUID
    scope?: MemoryScope;
    minConfidence?: number;
    limit?: number;
  }): Promise<RetrievedMemory[]> {
    const { workspaceId, scope, minConfidence = 0.35, limit = 12 } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    // If scope is specified, filter by it; otherwise return all active memories
    const sql = scope
      ? `
        SELECT id, content, confidence
        FROM memory_records
        WHERE workspace_id = $1
          AND scope = $2
          AND is_active = true
          AND confidence >= $3
        ORDER BY confidence DESC, updated_at DESC
        LIMIT $4
      `
      : `
        SELECT id, content, confidence
        FROM memory_records
        WHERE workspace_id = $1
          AND is_active = true
          AND confidence >= $2
        ORDER BY confidence DESC, updated_at DESC
        LIMIT $3
      `;

    const sqlParams = scope
      ? [workspaceId, scope, minConfidence, limit]
      : [workspaceId, minConfidence, limit];

    const { rows } = await pgPool.query(sql, sqlParams);

    return rows.map((r: any) => ({
      id: Number(r.id),
      content: String(r.content),
      confidence: Number(r.confidence),
    }));
  },
};

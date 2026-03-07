// 📂 src/ai/memory/cross/cross-memory.repo.ts
// 🔒 Cross-Thread Memory Repository (READ ONLY)

import { pgPool } from "../../../db/postgres";
import type { CrossMemoryType } from "./types";

export type CrossMemoryRow = {
  id: string;
  type: CrossMemoryType;
  summary: string;
};

export const CrossMemoryRepo = {
  async list(params: {
    workspaceId: string;
    userId: number;
    types: CrossMemoryType[];
    limit?: number;
  }): Promise<CrossMemoryRow[]> {
    const {
      workspaceId,
      userId,
      types,
      limit = 6,
    } = params;

    const { rows } = await pgPool.query<CrossMemoryRow>(
      `
      SELECT
        id,
        type,
        summary
      FROM cross_thread_memory
      WHERE workspace_id = $1
        AND user_id = $2
        AND type = ANY($3)
        AND is_archived = false
      ORDER BY created_at DESC
      LIMIT $4
      `,
      [workspaceId, userId, types, limit]
    );

    return rows;
  },
};

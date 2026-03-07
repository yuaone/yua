// 📂 src/ai/memory/repo/memory-records.repo.ts
// 🔒 READ-ONLY for Dry-Run / Analysis

import { pgPool } from "../../../db/postgres";

export interface MemoryRecordRow {
  id: number;
  workspace_id: string;
  scope: string;
  confidence: number;
  is_active: boolean;
  usage_count: number;
  updated_at: Date;
}

export const MemoryRecordsRepo = {
  async findByWorkspace(
    workspaceId: string
  ): Promise<MemoryRecordRow[]> {
    const { rows } = await pgPool.query<MemoryRecordRow>(
      `
      SELECT
        id,
        workspace_id,
        scope,
        confidence,
        is_active,
        usage_count,
        updated_at
      FROM memory_records
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    return rows;
  },
};

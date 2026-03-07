// 📂 src/ai/memory/repo/memory-snapshot-records.repo.ts
// 🔒 YUA Memory Snapshot Records Repo — PHASE 12 SSOT

import { pgPool } from "../../../db/postgres";

export interface SnapshotMemoryRecord {
  snapshot_id: number;
  memory_id: number;
  content: string;
  confidence: number;
  scope: string;
  is_active: boolean;
  merged_to: number | null;
  merged_from: number[] | null;
}

export const MemorySnapshotRecordsRepo = {
  async getBySnapshot(
    snapshotId: number
  ): Promise<SnapshotMemoryRecord[]> {
    const { rows } = await pgPool.query<SnapshotMemoryRecord>(
      `
      SELECT
        snapshot_id,
        memory_id,
        content,
        confidence,
        scope,
        is_active,
        merged_to,
        merged_from
      FROM memory_snapshot_records
      WHERE snapshot_id = $1
      ORDER BY memory_id ASC
      `,
      [snapshotId]
    );

    return rows;
  },
};

import { pgPool } from "../../db/postgres";

export type MemoryDiffItem = {
  memoryId: number;
  beforeConfidence: number;
  afterConfidence: number;
  delta: number;
  scope: string;
};

export async function diffMemorySnapshot(params: {
  workspaceId: string;
  baseSnapshotId: number;
  compareSnapshotId: number;
}): Promise<MemoryDiffItem[]> {
  const { workspaceId, baseSnapshotId, compareSnapshotId } = params;

  const { rows } = await pgPool.query<{
    memory_id: number;
    scope: string;
    before_confidence: number;
    after_confidence: number;
  }>(
    `
    SELECT
      b.memory_id,
      b.scope,
      b.confidence AS before_confidence,
      a.confidence AS after_confidence
    FROM memory_snapshot_records b
    JOIN memory_snapshot_records a
      ON a.memory_id = b.memory_id
    WHERE
      b.snapshot_id = $1
      AND a.snapshot_id = $2
      AND b.workspace_id = $3
    `,
    [baseSnapshotId, compareSnapshotId, workspaceId]
  );

  return rows.map((r) => ({
    memoryId: r.memory_id,
    scope: r.scope,
    beforeConfidence: r.before_confidence,
    afterConfidence: r.after_confidence,
    delta: Number((r.after_confidence - r.before_confidence).toFixed(4)),
  }));
}

import { pgPool } from "../../../db/postgres";

/**
 * 🔥 Snapshot 기반 메모리 롤백
 * - Rule 영향 ❌
 * - Workspace boundary 강제
 */
export async function restoreMemorySnapshot(params: {
  workspaceId: string;
  snapshotId: number;
  restoredBy: string;
}): Promise<void> {
  const { workspaceId, snapshotId } = params;

  await pgPool.query("BEGIN");

  try {
    /* 1️⃣ 기존 메모리 비활성화 */
    await pgPool.query(
      `
      UPDATE memory_records
      SET
        is_active = false,
        updated_at = NOW()
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    /* 2️⃣ snapshot 내용으로 복구 */
    await pgPool.query(
      `
      INSERT INTO memory_records (
        workspace_id,
        content,
        confidence,
        scope,
        is_active,
        merged_to,
        merged_from,
        restored_from_snapshot,
        created_at
      )
      SELECT
        $1,
        content,
        confidence,
        scope,
        is_active,
        merged_to,
        merged_from,
        $2,
        NOW()
      FROM memory_snapshot_records
      WHERE snapshot_id = $2
      `,
      [workspaceId, snapshotId]
    );

    await pgPool.query("COMMIT");
  } catch (e) {
    await pgPool.query("ROLLBACK");
    throw e;
  }
}

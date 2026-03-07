// 📂 src/ai/memory/memory-versioned-update.ts
// 🔁 YUA Memory Versioned Update — PHASE 12 SSOT

import { pgPool } from "../../db/postgres";
import { assertWorkspaceId } from "./memory-versioning.guard";

export async function versionedMemoryUpdate(params: {
  workspaceId: string;
  memoryId: number;
  logTable: string;
  logPayload: Record<string, any>;
  recordUpdate: Partial<{
    confidence: number;
    drift_score: number;
    drift_status: string;
    is_active: boolean;
    merged_to: number | null;
    merged_from: number[] | null;
  }>;
}): Promise<void> {
  const {
    workspaceId,
    memoryId,
    logTable,
    logPayload,
    recordUpdate,
  } = params;

  assertWorkspaceId(workspaceId);

  await pgPool.query("BEGIN");

  try {
    await pgPool.query(
      `
      INSERT INTO ${logTable}
        (workspace_id, memory_id, payload, created_at)
      VALUES ($1, $2, $3, NOW())
      `,
      [workspaceId, memoryId, logPayload]
    );

    const fields = Object.keys(recordUpdate);
    if (fields.length > 0) {
      const sets = fields
        .map((k, i) => `${k} = $${i + 3}`)
        .join(", ");

      await pgPool.query(
        `
        UPDATE memory_records
        SET ${sets}, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
        `,
        [memoryId, workspaceId, ...Object.values(recordUpdate)]
      );
    }

    await pgPool.query("COMMIT");
  } catch (e) {
    await pgPool.query("ROLLBACK");
    throw e;
  }
}

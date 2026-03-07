// 📂 src/ai/workspace/workspace-context.ts
// 🔒 WorkspaceContext — SSOT FINAL
// --------------------------------------------------
// ✔ Personal Workspace 자동 보장
// ✔ Memory Freeze 상태 포함
// ✔ PostgreSQL SSOT
// ✔ Controller 전용
// --------------------------------------------------

import { pgPool } from "../../db/postgres";

/* ===================================================
   Types
================================================== */

export type WorkspaceType = "personal" | "org" | "project" | "saas";

export interface WorkspaceContextResult {
  workspaceId: string;
  type: WorkspaceType;
  role: "owner" | "admin" | "member" | "viewer";
  isMemoryFrozen: boolean;
}

interface WorkspaceRow {
  id: string;
  type: WorkspaceType;
  role: WorkspaceContextResult["role"];
  is_frozen: boolean | null;
}

/* ===================================================
   Internal Helpers
================================================== */

async function findPersonalWorkspace(
  userId: number
): Promise<WorkspaceContextResult | null> {
  const { rows } = await pgPool.query<WorkspaceRow>(
    `
    SELECT
      w.id,
      w.type,
      wu.role,
      s.is_frozen
    FROM workspaces w
    JOIN workspace_users wu
      ON wu.workspace_id = w.id
    LEFT JOIN workspace_memory_state s
      ON s.workspace_id = w.id
    WHERE
      w.owner_user_id = $1
      AND w.type = 'personal'
      AND w.is_active = true
    LIMIT 1
    `,
    [userId]
  );

  if (!rows.length) return null;

  const row = rows[0];

  return {
    workspaceId: row.id,
    type: row.type,
    role: row.role,
    isMemoryFrozen: row.is_frozen ?? false,
  };
}

async function createPersonalWorkspace(
  userId: number
): Promise<WorkspaceContextResult> {
  await pgPool.query("BEGIN");

  try {
    const { rows } = await pgPool.query<{ id: string }>(
      `
      INSERT INTO workspaces (owner_user_id, type)
      VALUES ($1, 'personal')
      RETURNING id
      `,
      [userId]
    );

    const workspaceId = rows[0].id;

    await pgPool.query(
      `
      INSERT INTO workspace_users (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
      `,
      [workspaceId, userId]
    );

    await pgPool.query(
      `
      INSERT INTO workspace_memory_state (workspace_id)
      VALUES ($1)
      ON CONFLICT DO NOTHING
      `,
      [workspaceId]
    );

    await pgPool.query("COMMIT");

    return {
      workspaceId,
      type: "personal",
      role: "owner",
      isMemoryFrozen: false,
    };
  } catch (error) {
    await pgPool.query("ROLLBACK");
    throw error;
  }
}

/* ===================================================
   WorkspaceContext (SSOT)
================================================== */

export const WorkspaceContext = {
  async resolve(args: { userId: number }): Promise<WorkspaceContextResult> {
    const { userId } = args;

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new Error("invalid_user_id_for_workspace");
    }

    const existing = await findPersonalWorkspace(userId);
    if (existing) return existing;

    return createPersonalWorkspace(userId);
  },
};

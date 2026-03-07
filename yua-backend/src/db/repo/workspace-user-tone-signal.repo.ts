// 📂 src/db/repo/workspace-user-tone-signal.repo.ts

import { pgPool } from "../postgres";

export type WorkspaceUserToneSignal = {
  workspaceId: string;
  userId: number;
  name: string | null;
  toneCapability: "named" | "anonymous";
};

export async function getWorkspaceUserToneSignal(
  workspaceId: string,
  userId: number
): Promise<WorkspaceUserToneSignal | null> {

  // 🔒 SSOT: invalid workspaceId guard
  if (!workspaceId || typeof workspaceId !== "string") {
    return null;
  }

  const r = await pgPool.query<{
    name: string | null;
    tone_capability: "named" | "anonymous";
  }>(
    `
    SELECT name, tone_capability
    FROM workspace_user_tone_signal
    WHERE workspace_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [workspaceId, userId]
  );

  if (!r.rows.length) return null;

  return {
    workspaceId,
    userId,
    name: r.rows[0].name,
    toneCapability: r.rows[0].tone_capability,
  };
}

export async function upsertWorkspaceUserToneSignal(
  workspaceId: string,
  userId: number,
  input: {
    name: string | null;
    toneCapability: "named" | "anonymous";
  }
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO workspace_user_tone_signal
      (workspace_id, user_id, name, tone_capability)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      tone_capability = EXCLUDED.tone_capability,
      updated_at = NOW()
    `,
    [workspaceId, userId, input.name, input.toneCapability]
  );
}

import { pgPool } from "../postgres";

export type WorkspaceUserPersonaFlags = {
  workspaceId: string;
  userId: number;
  allowNameCall: boolean;
  allowPersonalTone: boolean;
};

export async function getWorkspaceUserPersonaFlags(
  workspaceId: string,
  userId: number
): Promise<WorkspaceUserPersonaFlags | null> {
  const r = await pgPool.query<{
    allow_name_call: boolean;
    allow_personal_tone: boolean;
  }>(
    `
    SELECT allow_name_call, allow_personal_tone
    FROM workspace_user_persona_flags
    WHERE workspace_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [workspaceId, userId]
  );

  if (!r.rows.length) return null;

  return {
    workspaceId,
    userId,
    allowNameCall: r.rows[0].allow_name_call,
    allowPersonalTone: r.rows[0].allow_personal_tone,
  };
}

export async function upsertWorkspaceUserPersonaFlags(
  workspaceId: string,
  userId: number,
  flags: {
    allowNameCall: boolean;
    allowPersonalTone: boolean;
  }
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO workspace_user_persona_flags
      (workspace_id, user_id, allow_name_call, allow_personal_tone)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET
      allow_name_call = EXCLUDED.allow_name_call,
      allow_personal_tone = EXCLUDED.allow_personal_tone,
      updated_at = NOW()
    `,
    [
      workspaceId,
      userId,
      flags.allowNameCall,
      flags.allowPersonalTone,
    ]
  );
}

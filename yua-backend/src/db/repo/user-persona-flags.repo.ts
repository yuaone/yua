import { pgPool } from "../postgres";

export type UserPersonaFlags = {
  userId: number;
  allowNameCall: boolean;
  allowPersonalTone: boolean;
};

export async function getUserPersonaFlags(
  userId: number
): Promise<UserPersonaFlags | null> {
  const r = await pgPool.query<{
    allow_name_call: boolean;
    allow_personal_tone: boolean;
  }>(
    `
    SELECT allow_name_call, allow_personal_tone
    FROM user_persona_flags
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (r.rows.length === 0) return null;

  return {
    userId,
    allowNameCall: r.rows[0].allow_name_call,
    allowPersonalTone: r.rows[0].allow_personal_tone,
  };
}

export async function upsertUserPersonaFlags(
  userId: number,
  flags: {
    allowNameCall: boolean;
    allowPersonalTone: boolean;
  }
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO user_persona_flags
      (user_id, allow_name_call, allow_personal_tone)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id)
    DO UPDATE SET
      allow_name_call = EXCLUDED.allow_name_call,
      allow_personal_tone = EXCLUDED.allow_personal_tone,
      updated_at = NOW()
    `,
    [
      userId,
      flags.allowNameCall,
      flags.allowPersonalTone,
    ]
  );
}

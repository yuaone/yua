import { pgPool } from "../../db/postgres";

export async function getPersonalization(userId: number) {
  const { rows } = await pgPool.query<{
    allow_name_call: boolean;
    allow_personal_tone: boolean;
  }>(
    `
    SELECT
      allow_name_call,
      allow_personal_tone
    FROM user_persona_flags
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  return {
    allowNameCall: rows[0]?.allow_name_call ?? false,
    allowPersonalTone: rows[0]?.allow_personal_tone ?? false,
  };
}

export async function updatePersonalization(
  userId: number,
  flags: {
    allowNameCall: boolean;
    allowPersonalTone: boolean;
  }
) {
  await pgPool.query(
    `
    INSERT INTO user_persona_flags (
      user_id,
      allow_name_call,
      allow_personal_tone
    )
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

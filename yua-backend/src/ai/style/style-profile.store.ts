import { pgPool } from "../../db/postgres";
import { StyleProfile } from "./style-aggregator";

export async function loadThreadStyleProfile(
  threadId: number
): Promise<StyleProfile | null> {
  const { rows } = await pgPool.query(
    `
    SELECT
      casual,
      expressive,
      fragmented,
      formal,
      samples,
      frozen,
      confidence
    FROM thread_style_profiles
    WHERE thread_id = $1
    LIMIT 1
    `,
    [threadId]
  );

  if (rows.length === 0) return null;

  return {
    casual: Number(rows[0].casual),
    expressive: Number(rows[0].expressive),
    fragmented: Number(rows[0].fragmented),
    formal: Number(rows[0].formal),
    samples: Number(rows[0].samples),
    frozen: rows[0].frozen,
    confidence: Number(rows[0].confidence),
  };
}

export async function saveThreadStyleProfile(
  threadId: number,
  profile: StyleProfile,
  language: string
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO thread_style_profiles (
      thread_id,
      language,
      casual,
      expressive,
      fragmented,
      formal,
      samples,
      frozen,
      confidence,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
    )
    ON CONFLICT (thread_id)
    DO UPDATE SET
      language = EXCLUDED.language,
      casual = EXCLUDED.casual,
      expressive = EXCLUDED.expressive,
      fragmented = EXCLUDED.fragmented,
      formal = EXCLUDED.formal,
      samples = EXCLUDED.samples,
      frozen = EXCLUDED.frozen,
      confidence = EXCLUDED.confidence,
      updated_at = NOW()
    `,
    [
      threadId,
      language,
      profile.casual,
      profile.expressive,
      profile.fragmented,
      profile.formal,
      profile.samples,
      profile.frozen,
      profile.confidence,
    ]
  );
}

// 📂 src/ai/judgment/persist/judgment-rule-writer.ts

import { pgPool } from "../../../db/postgres";
import { JudgmentRule } from "../judgment-rule";

/**
 * 🔒 Judgment Rule DB 영속화
 * - 최초 생성 시 INSERT
 * - 이미 존재하면 무시 (idempotent)
 */
export async function persistJudgmentRule(
  rule: JudgmentRule
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO judgment_rules (
      id,
      trigger_hint,
      type,
      confidence,
      decay,
      source,
      status,
      created_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
    ON CONFLICT (id) DO NOTHING
    `,
    [
      rule.id,
      rule.triggerHint,
      rule.type,
      rule.confidence,
      rule.decay,
      rule.source,
      rule.status,
    ]
  );
}

/**
 * 🔁 Rule 상태 변경 시 UPDATE 전용
 * (Governor에서 사용)
 */
export async function updateJudgmentRule(
  rule: JudgmentRule
): Promise<void> {
  await pgPool.query(
    `
    UPDATE judgment_rules
    SET
      confidence = $2,
      status = $3,
      updated_at = NOW()
    WHERE id = $1
    `,
    [rule.id, rule.confidence, rule.status]
  );
}

import { pgPool } from "../../db/postgres";
import type { JudgmentRule } from "./judgment-rule";

export type RuleMutationType =
  | "PROMOTE"
  | "DEMOTE_SOFT"
  | "DEMOTE_HARD"
  | "DISABLE";

export interface RuleMutationLog {
  ruleId: string;
  type: RuleMutationType;
  reason: string;
  prevConfidence: number;
  nextConfidence: number;
  timestamp: number;
}

/**
 * 🔒 PHASE 8-3 Rule Mutation Logger (SSOT)
 *
 * - READ/WRITE (mutation 기록 전용)
 * - 판단 로직 ❌
 * - rollback 근거 제공
 */
export class RuleMutationLogger {
  static async log(
    rule: JudgmentRule,
    mutation: {
      type: RuleMutationType;
      reason: string;
      prevConfidence: number;
    }
  ): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO judgment_rule_deltas (
        rule_id,
        mutation_type,
        reason,
        prev_confidence,
        next_confidence,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5, NOW())
      `,
      [
        rule.id,
        mutation.type,
        mutation.reason,
        mutation.prevConfidence,
        rule.confidence,
      ]
    );
  }
}

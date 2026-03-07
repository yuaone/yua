import { JudgmentRule, JudgmentRuleType } from "./judgment-rule";
import type { JudgmentInput } from "./judgment-input";

export type RuleStatus =
  | "active"
  | "weak"
  | "deprecated"
  | "disabled";

/**
 * 🔒 Failure 기반 Rule 생성
 */
export function createRuleFromFailure(params: {
  triggerHint: string;
  source?: JudgmentRule["source"];
  type?: JudgmentRuleType;
}): JudgmentRule {
  return {
    id: `rule_${Math.random().toString(36).slice(2)}`,
    type: params.type ?? "block",
    confidence: 0.55,
    decay: 0.03,
    source: params.source ?? "failure-log",
    triggerHint: params.triggerHint,
    match: (input: string | JudgmentInput) => {
      const raw =
        typeof input === "string"
          ? input
          : input.rawInput;

      return raw.includes(params.triggerHint);
    },
    createdAt: Date.now(),
    status: "active",
    stats: {
      hits: 0,
      softFailures: 0,
      hardFailures: 0,
    },
  };
}

/**
 * 🔁 Rule 적용 시 decay + hit 반영
 */
export function applyRuleDecay(rule: JudgmentRule): JudgmentRule {
  const stats = rule.stats ?? {
    hits: 0,
    softFailures: 0,
    hardFailures: 0,
  };

  const failureWeight =
    stats.hardFailures * 0.05 +
    stats.softFailures * 0.02;

  const nextConfidence = Math.max(
    0,
    rule.confidence - rule.decay - failureWeight
  );

  return {
    ...rule,
    confidence: nextConfidence,
    lastAppliedAt: Date.now(),
    status: resolveRuleStatus(nextConfidence),
    stats: {
      ...stats,
      hits: stats.hits + 1,
    },
  };
}

/**
 * 🔼 Rule 성공 보상
 */
export function reinforceRule(
  rule: JudgmentRule,
  amount = 0.05
): JudgmentRule {
  const nextConfidence = Math.min(
    1,
    rule.confidence + amount
  );

  return {
    ...rule,
    confidence: nextConfidence,
    status: resolveRuleStatus(nextConfidence),
  };
}

/**
 * 🔽 Rule 실패 패널티
 */
export function penalizeRule(
  rule: JudgmentRule,
  type: "soft" | "hard"
): JudgmentRule {
  const stats = rule.stats ?? {
    hits: 0,
    softFailures: 0,
    hardFailures: 0,
  };

  const penalty = type === "hard" ? 0.2 : 0.08;
  const nextConfidence = Math.max(
    0,
    rule.confidence - penalty
  );

  return {
    ...rule,
    confidence: nextConfidence,
    status: resolveRuleStatus(nextConfidence),
    stats: {
      ...stats,
      softFailures:
        stats.softFailures + (type === "soft" ? 1 : 0),
      hardFailures:
        stats.hardFailures + (type === "hard" ? 1 : 0),
      lastFailureAt: Date.now(),
    },
  };
}

export function isRuleActive(rule: JudgmentRule): boolean {
  return rule.status !== "disabled";
}

function resolveRuleStatus(
  confidence: number
): RuleStatus {
  if (confidence <= 0) return "disabled";
  if (confidence < 0.25) return "deprecated";
  if (confidence < 0.45) return "weak";
  return "active";
}

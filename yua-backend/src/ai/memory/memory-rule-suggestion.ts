import type { EvolutionReport } from "./memory-evolution-analyzer";

export type RuleSuggestionType =
  | "increase_min_confidence"
  | "reduce_decay_rate"
  | "increase_decay_rate"
  | "no_change";

export interface RuleSuggestion {
  scope: string;
  suggestion: RuleSuggestionType;
  reason: string;
  confidence: number; // 🔒 suggestion 신뢰도 (0~1)
}

export function suggestRuleAdjustments(
  reports: EvolutionReport[]
): RuleSuggestion[] {
  return reports.map((r) => {
    switch (r.signal) {
      case "CONFIDENCE_COLLAPSE":
        return {
          scope: r.scope,
          suggestion: "increase_min_confidence",
          reason: "confidence collapse detected across snapshot diff",
          confidence: 0.85,
        };

      case "OVER_DECAY":
        return {
          scope: r.scope,
          suggestion: "reduce_decay_rate",
          reason: "confidence decayed too aggressively",
          confidence: 0.7,
        };

      case "OVER_PRESERVE":
        return {
          scope: r.scope,
          suggestion: "increase_decay_rate",
          reason: "confidence preserved too strongly",
          confidence: 0.65,
        };

      default:
        return {
          scope: r.scope,
          suggestion: "no_change",
          reason: "memory confidence stable",
          confidence: 0.3,
        };
    }
  });
}

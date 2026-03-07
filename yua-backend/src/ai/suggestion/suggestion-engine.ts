// 📂 src/ai/suggestion/suggestion-engine.ts
import type { JudgmentInput } from "../judgment/judgment-input";
import type { DecisionResult } from "../../types/decision";

/**
 * 🔒 Judgment-based Suggestion (HOLD 전용)
 * - Reasoning / Flow 와 분리
 */
export type Suggestion = {
  id: string;
  label: string;
  action:
    | "REQUEST_INFO"
    | "REFINE_INPUT"
    | "CHOOSE_PATH";
  priority: "HIGH" | "NORMAL" | "LOW";

  // 🔥 확장 힌트 (UI / 분석용)
  meta?: {
    reason?: "code" | "math" | "fallback";
  };
};

export const SuggestionEngine = {
  /**
   * 🔒 Judgment HOLD 상태 전용
   * - APPROVE / BLOCK → 빈 배열
   */
  suggest(args: {
    input: JudgmentInput;
    decision: DecisionResult;
  }): Suggestion[] {
    const { input, decision } = args;

    if (decision.verdict !== "HOLD") return [];

    const suggestions: Suggestion[] = [];

    // strict + code
    if (input.code) {
      suggestions.push({
        id: "refine.code.scope",
        label:
          "분석할 코드 범위를 조금만 줄여볼까?",
        action: "REFINE_INPUT",
        priority: "HIGH",
        meta: { reason: "code" },
      });
    }

    // strict + math
    if (input.math?.isProofLike) {
      suggestions.push({
        id: "request.math.target",
        label:
          "증명하려는 정리나 조건을 명확히 알려줘.",
        action: "REQUEST_INFO",
        priority: "HIGH",
        meta: { reason: "math" },
      });
    }

    // fallback
    if (suggestions.length === 0) {
      suggestions.push({
        id: "choose.simpler.path",
        label:
          "단순한 예제부터 단계적으로 접근해보자",
        action: "CHOOSE_PATH",
        priority: "NORMAL",
        meta: { reason: "fallback" },
      });
    }

    return suggestions;
  },
};

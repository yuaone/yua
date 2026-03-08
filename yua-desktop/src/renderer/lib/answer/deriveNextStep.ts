// src/renderer/lib/answer/deriveNextStep.ts
// Ported from yua-web/src/lib/answer/deriveNextStep.ts

import type { EvaluationReport } from "./evaluateAnswerState";

export type NextStep =
  | { mode: "REPAIR"; message: string }
  | { mode: "REFINE"; message: string }
  | { mode: "EXPAND"; message: string };

export function deriveNextStep(
  report: EvaluationReport
): NextStep {
  switch (report.state) {
    case "INCOMPLETE":
      return {
        mode: "REPAIR",
        message:
          "판단의 기준이나 이유를 한 단계 더 분명히 적어보면 좋아.",
      };

    case "PARTIAL":
      return {
        mode: "REFINE",
        message:
          "구조는 좋아요. 핵심 기준을 한 문장으로 정리해보자.",
      };

    case "COMPLETE":
      return {
        mode: "EXPAND",
        message:
          "이 기준을 다른 상황에도 적용해보면 더 깊어질 수 있어.",
      };
  }
}

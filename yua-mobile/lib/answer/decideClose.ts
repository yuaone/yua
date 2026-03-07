import type { AnswerAnalysis } from "./analyzeAnswer";
import type { CloseSignal } from "./closeTypes";

export function decideClose(analysis: AnswerAnalysis): CloseSignal {
  if (!analysis.isExpandable) {
    return {
      intent: "STOP",
      confidence: "HIGH",
      show: false,
      priority: "LOW",
    };
  }

  if (
    analysis.isShortAnswer &&
    analysis.paragraphCount === 1 &&
    analysis.sentenceCount >= 2
  ) {
    return {
      intent: "STOP",
      confidence: "MID",
      show: false,
      priority: "LOW",
    };
  }

  if (analysis.isShortAnswer) {
    return {
      intent: "VERIFY",
      confidence: "LOW",
      show: true,
      priority: "HIGH",
    };
  }

  if (analysis.isExplanationLike) {
    return {
      intent: "CONTINUE",
      confidence: "MID",
      show: true,
      priority: "NORMAL",
    };
  }

  return {
    intent: "APPLY",
    confidence: "MID",
    show: true,
    priority: "NORMAL",
  };
}

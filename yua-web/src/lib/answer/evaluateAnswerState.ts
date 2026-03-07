import type { AnswerAnalysis } from "./analyzeAnswer";
import { detectAnswerSignals, AnswerSignal } from "./detectAnswerSignals";

export type AnswerState =
  | "INCOMPLETE"
  | "PARTIAL"
  | "COMPLETE";

export type EvaluationReport = {
  state: AnswerState;
  signals: AnswerSignal[];
  summary: string;
};

export function evaluateAnswerState(
  content: string,
  analysis: AnswerAnalysis
): EvaluationReport {
  const signals = detectAnswerSignals(content, analysis);

  const hasCore =
    signals.includes("HAS_GOAL") &&
    signals.includes("HAS_REASONING");

  const isComplete =
    hasCore && signals.includes("HAS_CONCLUSION");

  let state: AnswerState = "PARTIAL";
  if (!hasCore) state = "INCOMPLETE";
  else if (isComplete) state = "COMPLETE";

  return {
    state,
    signals,
    summary:
      state === "COMPLETE"
        ? "핵심 판단과 결론이 명확히 제시됨"
        : state === "PARTIAL"
        ? "구조는 있으나 보완 여지 있음"
        : "판단 근거가 충분히 드러나지 않음",
  };
}

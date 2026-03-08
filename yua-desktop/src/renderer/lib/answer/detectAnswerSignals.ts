// src/renderer/lib/answer/detectAnswerSignals.ts
// Ported from yua-web/src/lib/answer/detectAnswerSignals.ts

import type { AnswerAnalysis } from "./analyzeAnswer";

export type AnswerSignal =
  | "HAS_GOAL"
  | "HAS_REASONING"
  | "HAS_STRUCTURE"
  | "HAS_EXAMPLE"
  | "HAS_CONCLUSION"
  | "IS_FRAGMENTED"
  | "IS_LONG_FORM";

export function detectAnswerSignals(
  content: string,
  analysis: AnswerAnalysis
): AnswerSignal[] {
  const signals: AnswerSignal[] = [];

  if (analysis.sentenceCount > 0) signals.push("HAS_GOAL");
  if (analysis.isExplanationLike) signals.push("HAS_REASONING");
  if (analysis.hasList || analysis.hasHeader)
    signals.push("HAS_STRUCTURE");
  if (/예를 들면|example|예시/i.test(content))
    signals.push("HAS_EXAMPLE");
  if (/결론|요약|따라서/i.test(content))
    signals.push("HAS_CONCLUSION");

  if (analysis.paragraphCount === 1 && analysis.sentenceCount < 3)
    signals.push("IS_FRAGMENTED");

  if (analysis.paragraphCount >= 3)
    signals.push("IS_LONG_FORM");

  return signals;
}

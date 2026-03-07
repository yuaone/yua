// 📂 src/ai/suggestion/answer-state.ts
// 🔥 YUA AnswerState — SSOT FINAL (2025.12)
// --------------------------------------------
// ✔ LLM 응답 "결과 상태" 요약 전용
// ✔ 판단 ❌ / 추론 ❌ / 학습 ❌
// ✔ SuggestionEngine 전용 입력
// ✔ Server-side only (stream/UI/DB 노출 ❌)
// --------------------------------------------

/**
 * Answer completeness
 * - FULL: 답변이 하나의 응답으로 충분히 닫힘
 * - PARTIAL: 다음 단계/보완/후속 질문이 자연스럽게 열려 있음
 */
 export type AnswerCompleteness =
  | "FULL"
  | "PARTIAL"
  | "UNKNOWN";

/**
 * Open ends inferred from answer content
 * - 판단 ❌
 * - 휴리스틱 신호
 */
export type AnswerOpenEnd =
  | "COMPARE"
  | "NEXT_STEP"
  | "IMPLEMENT"
  | "VERIFY"
  | "SUMMARIZE";

/**
 * User-facing confidence impression
 * - 실제 confidence score 아님
 * - "답변이 얼마나 단정적으로 들리는지"
 */
export type AnswerConfidenceImpression =
  | "HIGH"
  | "MID"
  | "LOW";

/**
 * Primary tone of the answer
 * - 문체/서술 방식 기반
 */
export type AnswerTone =
  | "EXPLANATION"
  | "GUIDANCE"
  | "DIRECT";

/**
 * 🔒 AnswerState (SSOT)
 * - Suggestion 품질을 결정하는 핵심 신호
 */
export type AnswerState = {
  completeness: AnswerCompleteness;
  openEnds: AnswerOpenEnd[];
  confidenceImpression: AnswerConfidenceImpression;
  tone: AnswerTone;
};

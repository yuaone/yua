// 🔥 Topic Shift Detector — SSOT SIGNAL ONLY
// - 절대 행동 결정 ❌
// - DecisionOrchestrator에서만 사용
// - Prompt / Context / Memory는 이 신호를 참고만 함

export type TopicShift =
  | "CASUAL"
  | "MATH"
  | "PAPER"
  | "CODE";

const MATH_PATTERN =
  /(적분|미분|정리|증명|함수|수식|고정점|∫|∂|W\(|f\()/i;

const PAPER_PATTERN =
  /(논문|abstract|theorem|lemma|corollary|proof|section\s+\d+)/i;

const CODE_PATTERN =
  /(코드|에러|버그|컴파일|타입|ts\d+|stack trace|import |function\s*\(|=>)/i;

export function detectTopicShift(message: string): TopicShift {
  if (CODE_PATTERN.test(message)) return "CODE";
  if (PAPER_PATTERN.test(message)) return "PAPER";
  if (MATH_PATTERN.test(message)) return "MATH";
  return "CASUAL";
}

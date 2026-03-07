// 🔥 YUA ResponseModeSelector — SSOT FINAL (DELTA MINIMIZED)
// --------------------------------------------------
// 책임:
// - 이 턴에서 "구조 제어가 필요한가"만 판단
// - 말의 길이/톤/설명 여부 ❌
// - PromptRuntime / PromptBuilder에게 위임
// --------------------------------------------------

export type OutputTransformHint =
  | "DELTA_ONLY"
  | "ROTATE"
  | "SUMMARIZE"
  | "CONCLUDE"
  | "CLARIFY";

export interface ResponseModeInput {
  turnIntent?: "QUESTION" | "CONTINUATION" | "SHIFT";
  depthHint?: "shallow" | "normal" | "deep";
  anchorConfidence?: number;
  continuityAllowed?: boolean;
  userMessageLength?: number;
}

const ANCHOR_DELTA_THRESHOLD = 0.85; // 🔥 상향
const ANCHOR_MIN_THRESHOLD = 0.4;

export function selectOutputTransformHint(
  input: ResponseModeInput
): OutputTransformHint | null {
  const {
    turnIntent,
    depthHint,
    anchorConfidence = 0,
    continuityAllowed = false,
    userMessageLength = 0,
  } = input;
  const designMode = depthHint === "deep";

  /* 0️⃣ SHIFT → 리셋 */
  if (turnIntent === "SHIFT") {
    return null;
  }

  /* 1️⃣ QUESTION → 항상 자연 응답 */
  if (turnIntent === "QUESTION") {
    return null;
  }

  /* 2️⃣ CONTINUATION */
  if (turnIntent === "CONTINUATION") {
    if (designMode) {
      return null;
    }
    // 맥락 불안정 → 확인
    if (!continuityAllowed || anchorConfidence < ANCHOR_MIN_THRESHOLD) {
      return "CLARIFY";
    }

    // 🔥 진짜 '보강 명령'만 DELTA
    if (
      depthHint === "shallow" &&
      anchorConfidence >= ANCHOR_DELTA_THRESHOLD &&
      userMessageLength <= 8
    ) {
      return "DELTA_ONLY";
    }

    // 관점 전환
    if (userMessageLength <= 20) {
      return "ROTATE";
    }

    // 짧은 정리
    if (userMessageLength <= 15) {
      return "SUMMARIZE";
    }

    // ✅ 기본은 자유 확장
    return null;
  }

  return null;
}

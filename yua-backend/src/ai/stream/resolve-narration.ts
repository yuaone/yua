import type { YuaStreamStage } from "../../types/stream";

/**
 * 🔒 SSOT: narration은 "UX 상태 설명"만 담당
 * - 사고 내용 / chain-of-thought ❌
 * - 의미적 진행 상태만 ⭕
 */
export function resolveNarration({
  stage,
}: {
  stage: YuaStreamStage;
}): string | undefined {
  // narration은 thinking 계열 stage에서만 허용
  if (
    stage !== "analyzing_input" &&
    stage !== "analyzing_image" &&
    stage !== "thinking"
  ) {
    return undefined;
  }

  // stage 기반 fallback
  if (stage === "analyzing_input") return "입력을 분석 중…";
  if (stage === "analyzing_image") return "이미지를 분석 중…";
  if (stage === "thinking") return "생각 중…";

  return undefined;
}

import type { ThoughtStage } from "@/lib/thoughtStage";

/**
 * Conversation Rhythm (SSOT)
 * - 문서 구조 ❌
 * - 텍스트 패턴 ❌
 * - 순수 UI 대화 리듬 상태
 */
export type ConversationRhythm =
  | "intro"   // 첫 리드
  | "flow"    // 설명 흐름
  | "turn"    // 관점 / 구조 전환
  | "wrap";   // 정리 / 다음 제안

export function decideRhythm(args: {
  index: number;
  isFirst: boolean;
  finalized: boolean;
  thoughtStage?: ThoughtStage;
  hasSuggestion?: boolean;
}): ConversationRhythm {
  const {
    isFirst,
    finalized,
    thoughtStage,
    hasSuggestion,
  } = args;

  if (isFirst) return "intro";

  if (finalized && hasSuggestion) {
    return "wrap";
  }

  if (
    thoughtStage === "structure" ||
    thoughtStage === "map" ||
    thoughtStage === "compare"
  ) {
    return "turn";
  }

  return "flow";
}

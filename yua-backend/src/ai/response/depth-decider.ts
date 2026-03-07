// 🔒 YUA Response Depth Decider — SSOT v1.1 FINAL
// ---------------------------------------------
// 책임:
// - 응답 깊이 자동 결정
// - Always Respond 보장
// - Core 판단 변경 ❌

import type { ResponseDepth } from "./response-types";

export interface DepthDecisionContext {
  confidence: number;
  isWhyLoop: boolean;
  isDesignDiscussion: boolean;
  isCasual: boolean;
}

export function decideResponseDepth(
  ctx: DepthDecisionContext
): ResponseDepth {
  const {
    confidence,
    isWhyLoop,
    isDesignDiscussion,
    isCasual,
  } = ctx;

  if (isCasual) return 0;

  if (isDesignDiscussion) return 3;

  if (isWhyLoop) return 2;

  if (confidence < 0.4) return 1;

  return 1;
}

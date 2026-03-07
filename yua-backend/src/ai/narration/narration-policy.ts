// 📂 src/ai/narration/narration-policy.ts

import type { YuaStreamStage } from "../../types/stream";


export function buildNarration(args: {
  stage: YuaStreamStage;
  elapsedMs?: number;
}): string | null {
  const { stage, elapsedMs } = args;

  switch (stage) {
    case "thinking":
            if (!elapsedMs || elapsedMs < 300) return null;
      if (elapsedMs > 1500) {
        return "조금 더 정리하고 있어요…";
      }
      return "생각 중이에요…";

    case "analyzing_input":
      return "질문의 핵심을 정리하고 있어요";

    case "analyzing_image":
      return "이미지를 살펴보고 있어요";

    default:
      return null;
  }
}

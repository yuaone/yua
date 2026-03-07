// 📂 src/ai/suggestion/continuation-suggestion-engine.ts
// 🔥 YUA ContinuationSuggestionEngine — LIGHT SSOT
// --------------------------------------------------
// ✔ Deterministic
// ✔ Reasoning.nextAnchors 기반
// ✔ AnswerState로 개수/호환성만 조절
// ✔ Signal 직접 접근 ❌ (Hint만 수신)
// ✔ 판단 / 학습 / 페르소나 / bias ❌
// --------------------------------------------------

import type {
  ReasoningResult,
  FlowAnchor,
} from "../reasoning/reasoning-engine";
import type { AnswerState } from "./answer-state";
import type { YuaSuggestion } from "../../types/stream";
import type { SignalHints } from "../statistics/signal-hints";

/* --------------------------------------------------
 * Anchor ↔ AnswerState compatibility
 * -------------------------------------------------- */

function isCompatible(
  anchor: FlowAnchor,
  answer: AnswerState
): boolean {
  if (answer.openEnds.includes("COMPARE")) {
    return anchor === "COMPARE_APPROACH";
  }

  if (answer.openEnds.includes("IMPLEMENT")) {
    return anchor === "IMPLEMENT";
  }

  if (answer.openEnds.includes("VERIFY")) {
    return anchor === "VERIFY_LOGIC";
  }

  // 🔒 SSOT: 종료된 답변에서는 refine 금지
  if (answer.completeness === "FULL") {
    return (
      anchor === "NEXT_STEP" ||
      anchor === "SUMMARIZE"
    );
  }

  if (answer.completeness === "PARTIAL") {
    return (
      anchor === "REFINE_INPUT" ||
      anchor === "VERIFY_LOGIC"
    );
  }

  return true;
}

/* --------------------------------------------------
 * Anchor → Neutral Suggestion Token
 * -------------------------------------------------- */

function anchorToSuggestion(
  anchor: FlowAnchor
): YuaSuggestion {
  return {
    id: `flow.${anchor.toLowerCase()}`,
    label: anchor,
    action:
      anchor === "REFINE_INPUT" || anchor === "SUMMARIZE"
        ? "REQUEST_INFO"
        : "CHOOSE_PATH",
    priority: "NORMAL",
  };
}

/* --------------------------------------------------
 * Public API
 * -------------------------------------------------- */

export const ContinuationSuggestionEngine = {
  generate(
    reasoning: ReasoningResult,
    answerState?: AnswerState,
    signalHints?: SignalHints
  ): YuaSuggestion[] {
    const anchors = reasoning.nextAnchors ?? [];

    const conservative =
      signalHints?.conservativeSuggestions === true;

    const answer: AnswerState = answerState ?? {
      completeness: "FULL",
      openEnds: [],
      confidenceImpression: "MID",
      tone: "EXPLANATION",
    };

    // 1️⃣ 호환 anchor 필터
    const compatible = anchors.filter((a) => {
      if (!isCompatible(a, answer)) return false;

      // 🔒 보수 모드: 실행/분기 앵커 제거
      if (conservative) {
        return a !== "IMPLEMENT" && a !== "BRANCH_MORE";
      }

      return true;
    });

    // 2️⃣ anchor → suggestion
    let suggestions = compatible.map(anchorToSuggestion);

    // 3️⃣ AnswerState 기반 개수 제한
    const max =
      answer.confidenceImpression === "LOW"
        ? 1
        : answer.confidenceImpression === "MID"
        ? 2
        : 2;

    suggestions = suggestions.slice(0, max);

    // 🔒 SSOT: 최소 1개 보장
if (suggestions.length === 0 && anchors.length > 0) {
  return [
    {
      id: `flow.${anchors[0].toLowerCase()}`,
      label: anchors[0],
      action: "CHOOSE_PATH",
      priority: "NORMAL",
    },
  ];
}

    return suggestions;
  },
};

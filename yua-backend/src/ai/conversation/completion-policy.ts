// 🔥 YUA CompletionPolicy — SSOT FINAL (2026.01)

import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { AnswerState } from "../suggestion/answer-state";
import type { ResponseAffordance } from "../suggestion/response-affordance";
import type { FailureSurface } from "../selfcheck/failure-surface-engine";

export type CompletionDecision =
  | {
    
      status: "INCOMPLETE";
      reason:
        | "NEED_INFO"
        | "OPEN_BRANCH"
        | "LOW_CONFIDENCE";
    };

type Input = {
  turnIndex?: number;
  reasoning: ReasoningResult;
  answerState?: AnswerState; // ✅ optional
  affordance?: ResponseAffordance;
  failureSurface?: FailureSurface;
};

export const CompletionPolicy = {
  decide(input: Input): CompletionDecision {
   const {
     reasoning,
     answerState,
     affordance,
     failureSurface,
     turnIndex = 0, // ✅ SSOT: default = 첫 턴
   } = input;
    // 🔒 SSOT: CLARIFY는 첫 턴에서만 허용
 if (turnIndex > 0) {
   return {
     status: "INCOMPLETE",
     reason: "OPEN_BRANCH",
   };
 }


    /* ----------------------------------
     * 0️⃣ FailureSurface HARD OVERRIDE
     * ---------------------------------- */
    if (failureSurface?.risk === "HIGH") {
      return {
        status: "INCOMPLETE",
        reason: "LOW_CONFIDENCE",
      };
    }

    /* ----------------------------------
     * 1️⃣ AnswerState 없으면 절대 단정 ❌
     * ---------------------------------- */
    if (!answerState) {
    // 🔒 SSOT: AnswerState 미생성 상태
    // - Reasoning이 다음 흐름을 보장하면 침묵 금지
    if (
      reasoning.nextAnchors &&
      reasoning.nextAnchors.length > 0 &&
      reasoning.confidence >= 0.55
    ) {
      return {
        status: "INCOMPLETE",
        reason: "OPEN_BRANCH",
      };
    }

    return {
      status: "INCOMPLETE",
      reason: "NEED_INFO",
    };
    }

    /* ----------------------------------
     * 2️⃣ Explicit Affordance
     * ---------------------------------- */

    if (affordance && affordance.branch >= 0.6) {
      return {
        status: "INCOMPLETE",
        reason: "OPEN_BRANCH",
      };
    }

    /* ----------------------------------
     * 3️⃣ AnswerState 기반
     * ---------------------------------- */
    if (answerState.completeness === "PARTIAL") {
      return {
        status: "INCOMPLETE",
        reason:
          answerState.confidenceImpression === "LOW"
            ? "LOW_CONFIDENCE"
            : "OPEN_BRANCH",
      };
    }

    /* ----------------------------------
     * 4️⃣ Reasoning Confidence
     * ---------------------------------- */
    if (reasoning.confidence < 0.55) {
      return {
        status: "INCOMPLETE",
        reason: "LOW_CONFIDENCE",
      };
    }

      /* ----------------------------------
   * 4.5️⃣ Anchor-driven continuation
   * - 다음 흐름이 명시된 경우 침묵 금지
   * ---------------------------------- */
    // 🔧 FIX: 답변이 FULL이면 anchor 있어도 continuation 금지
    if (
      answerState?.completeness !== "FULL" &&
      reasoning.nextAnchors &&
      reasoning.nextAnchors.length > 0 &&
      reasoning.confidence >= 0.55 &&
      reasoning.confidence < 0.75
    ) {
    return {
      status: "INCOMPLETE",
      reason: "OPEN_BRANCH",
    };
  }

    /* ----------------------------------
     * 5️⃣ Soft Continue
     * ---------------------------------- */
    if (
      reasoning.confidence < 0.75 &&
      answerState.tone !== "DIRECT"
    ) {
      return {
        status: "INCOMPLETE",
        reason: "OPEN_BRANCH",
      };
    }

    /* ----------------------------------
     * 6️⃣ DEFAULT
     * ---------------------------------- */
    return {
      status: "INCOMPLETE",
      reason: "OPEN_BRANCH",
    };
  },
};

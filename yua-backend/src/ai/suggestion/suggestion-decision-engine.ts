import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { ResponseAffordance } from "./response-affordance";
import type { CloseSignal } from "../suggestion/closeTypes";
import type { ConversationalOutcome } from "../decision/conversational-outcome";
export type SuggestionMode =
  | { kind: "NONE" }
  | { kind: "IMPLICIT_CONTINUE" }
  | { kind: "EXPLICIT"; max: number };

export type SuggestionSignalHints = {
  maxSuggestionCap?: number;
};

export const SuggestionDecisionEngine = {
  decide(args: {
    reasoning: ReasoningResult;
    conversationalOutcome?: ConversationalOutcome;
    verdict?: "APPROVE" | "HOLD" | "BLOCK" | "DEFER";
    affordance?: ResponseAffordance;
    close?: CloseSignal;
    signalHints?: SuggestionSignalHints;
    mode?: "FAST" | "NORMAL" | "DEEP" | "SEARCH";
  }): SuggestionMode {
    const {
      reasoning,
      conversationalOutcome,
      verdict,
      affordance,
      close,
      signalHints,
      mode = "NORMAL", // 🔥 기본값 명시
    } = args;

       // 🔒 SSOT: FAST mode never produces suggestions
    if (mode === "FAST") {
      return { kind: "NONE" };
    }

    if (conversationalOutcome === "CLOSE") {
      return { kind: "NONE" };
      }

    if (close?.show === false) {
      return { kind: "NONE" };
    }

    const cap = signalHints?.maxSuggestionCap;

    /* --------------------------------------------------
     * 0️⃣ Affordance 우선 (SSOT)
     * -------------------------------------------------- */

 if (!affordance) return { kind: "NONE" };

 if (affordance.clarify >= 0.6) {
   return { kind: "EXPLICIT", max: 1 };
 }

 if (affordance.branch >= 0.6) {
   return { kind: "EXPLICIT", max: 2 };
 }

 // 🔥 SSOT: YUA는 항상 다음 선택지를 보여준다
 // (FAST 제외)
 {
   return {
     kind: "EXPLICIT",
        max:
          conversationalOutcome === "CONTINUE_HARD"
            ? Math.min(signalHints?.maxSuggestionCap ?? 3, 3)
            : 1,
   };
 }
  },
};

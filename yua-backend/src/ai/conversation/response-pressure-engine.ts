// 🔥 YUA ResponsePressureEngine — SSOT EXTENDED (2026.01)

import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { FailureSurface } from "../selfcheck/failure-surface-engine";
import type { CompletionDecision } from "./completion-policy";
import type { LeadHint } from "../chat/types/lead-hint";
import type { ResponseAffordanceVector } from "../decision/response-affordance";
export type ResponsePressure =
  | "GENTLE"
  | "NEUTRAL"
  | "ASSERTIVE";

  export type PressureDecision = {
  pressure: ResponsePressure;
  leadHint: LeadHint;
  conversationalMomentum: "LOW" | "MEDIUM" | "HIGH";
};

export type ResponsePressureInput = {
  affordance: ResponseAffordanceVector;
  failureSurface?: FailureSurface;
  implementationMode?: boolean;
  depthHint?: "shallow" | "normal" | "deep";
  explanationRequested?: boolean;
};

export const ResponsePressureEngine = {
  decide(input: ResponsePressureInput): PressureDecision {
    const { affordance, failureSurface } = input;
    if (input.implementationMode === true) {
      return { pressure: "ASSERTIVE", leadHint: "HARD", conversationalMomentum: "HIGH" };
    }

 // 🔥 SSOT FIX: design 흐름이라도 "리드 차단"은 금지
 // - 조기 return 제거
 // - momentum 계산 이후 판단으로 위임

       /* ----------------------------------
     * 🔥 Conversational Momentum (SSOT)
     * - pressure와 분리된 "대화 지속 가능성"
     * ---------------------------------- */

    const momentumScore =
      affordance.expand * 0.6 +
      affordance.branch * 0.25 +
      (1 - affordance.conclude) * 0.15;

    /**
     * 🔥 SSOT: 설명 / 비교 / 정리 질문은
     * - 결론을 밀어붙이지 않는다
     * - 최소한 SOFT 톤은 항상 허용한다
     */
    const EXPLICIT_CLARIFY_THRESHOLD = 0.35;
    const isExplanatory =
      affordance.describe >= 0.4 &&
      affordance.clarify < 0.45 &&
      (
        input.explanationRequested === true ||
        input.depthHint === "deep" ||
        affordance.clarify >= EXPLICIT_CLARIFY_THRESHOLD
      );
    // conversational momentum은 그대로 계산

    let conversationalMomentum: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (momentumScore >= 0.55) conversationalMomentum = "HIGH";
    else if (momentumScore >= 0.35) conversationalMomentum = "MEDIUM";

           /* ----------------------------------
      * 🔓 IDEA OPENING BOOST (SSOT SAFE)
      * - design / exploration 흐름에서만
      * - 판단 / 리스크와 무관
      * - 말투 압력만 개방
      * ---------------------------------- */
      if (
        failureSurface?.risk !== "HIGH" &&
        affordance.expand >= 0.6 &&
        affordance.branch >= 0.4 &&
      conversationalMomentum === "HIGH" &&
      affordance.conclude < 0.25
      ) {
        return {
          pressure: "GENTLE", // 🔒 안정화: ASSERTIVE → GENTLE
          leadHint: "SOFT", // HARD 금지 (개방감 유지)
          conversationalMomentum: "HIGH",
        };
      }


    /* ----------------------------------
     * 0️⃣ Hard Safety
     * ---------------------------------- */
    if (failureSurface?.risk === "HIGH") {
            return {
        pressure: "GENTLE",
        leadHint: "NONE",
        conversationalMomentum,
      };
    }

  

    /* ----------------------------------
     * 2️⃣ MEDIUM Risk → 압력 완화
     * ---------------------------------- */
    if (failureSurface?.risk === "MEDIUM") {
          return {
        pressure: "NEUTRAL",
        leadHint: "NONE",
        conversationalMomentum,
      };
    }

        /**
     * 🔥 SSOT: 설명형 요청은 기본 톤을 완화
     * - NEUTRAL + NONE으로 떨어지는 것을 방지
     * - PromptBuilder의 opening / soft ending 활성화
     */
    if (isExplanatory) {
      return {
        pressure: "GENTLE",
        leadHint: "SOFT",
        conversationalMomentum,
      };
    }


    /* ----------------------------------
     * 1️⃣ Force 계산 (SSOT)
    * ---------------------------------- */

    const continueForce =
      affordance.expand * 0.55 +
      affordance.branch * 0.35;

    const stopForce =
      affordance.conclude * 0.7 +
       affordance.clarify * 0.15;

    const delta = continueForce - stopForce;

    /* ----------------------------------
     * 2️⃣ Pressure 결정
     * ---------------------------------- */

    // 🔥 강하게 이어가도 됨
 if (
   delta >= 0.18 &&
   affordance.expand >= 0.45 &&
   conversationalMomentum !== "LOW"
 ) {
      return { pressure: "ASSERTIVE", leadHint: "HARD",conversationalMomentum, };
    }

    // 🙂 부드럽게 이어감
    if (delta >= 0.1) {
           return {
        pressure: "GENTLE",
        leadHint: "SOFT",
        conversationalMomentum,
      };
    }

    // ✋ 멈춤 / 정리도 톤은 딱딱하게 만들지 않는다
    if (delta <= -0.2) {
        return {
        pressure: "GENTLE",
        leadHint: "SOFT",
        conversationalMomentum,
      };
    }

 return {
   pressure: "GENTLE",
   leadHint:
     conversationalMomentum === "HIGH" ? "HARD" : "SOFT",
   conversationalMomentum,
 };
    },
};

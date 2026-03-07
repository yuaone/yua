// 📂 src/ai/conversation/conversation-strategy-engine.ts
// 🔥 YUA ConversationStrategyEngine — SSOT FINAL (2026.01)
// -------------------------------------------------------
// 책임:
// - "이번 턴 이후" 사용자 흐름 전략 결정
// - Suggestion 표시 여부 / 강도 / 개수만 결정
//
// ❌ 절대 금지:
// - 문장 생성
// - LLM 호출
// - 추론 / 판단 수정
// - Stream / UI 직접 접근
//
// ✅ 입력은 '결과 요약 신호'만
// ✅ 출력은 '전략 신호'만
// -------------------------------------------------------

import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { AnswerState } from "../suggestion/answer-state";
import type { ResponseAffordanceVector } from "../decision/response-affordance";

/* ======================================================
 * Types
 * ==================================================== */

export type ConversationStrategy = {
  showSuggestions: boolean;

  /**
   * NONE     : 완전 숨김
   * SOFT     : GPT 스타일 암시 (1개 위주)
   * EXPLICIT : 분기/선택지 느낌
   */
  suggestionMode: "NONE" | "SOFT" | "EXPLICIT";

  /**
   * UI 상한
   */
  maxSuggestions: 0 | 1 | 2 | 3;
};

export type StrategyInput = {
  reasoning: ReasoningResult;
  answerState: AnswerState;
  affordance?: ResponseAffordanceVector;
  prevAffordance?: ResponseAffordanceVector;
  turnIntent: "QUESTION" | "CONTINUATION" | "SHIFT";
  isStreaming?: boolean;
};

/* ======================================================
 * Safety Guards (SSOT)
 * ==================================================== */

/**
 * 🔒 Stream 중에는 절대 전략 개입 금지
 */
function blockDuringStream(
  isStreaming?: boolean
): ConversationStrategy | null {
  if (isStreaming === true) {
    return {
      showSuggestions: false,
      suggestionMode: "NONE",
      maxSuggestions: 0,
    };
  }
  return null;
}

/* ======================================================
 * Engine
 * ==================================================== */

export const ConversationStrategyEngine = {
  decide(input: StrategyInput): ConversationStrategy {
    const {
      reasoning,
      answerState,
      affordance,
      turnIntent,
      isStreaming,
    } = input;

    /* ----------------------------------
     * 0️⃣ HARD SAFETY
     * ---------------------------------- */
    const streamBlock = blockDuringStream(isStreaming);
    if (streamBlock) return streamBlock;

    /* ----------------------------------
     * 1️⃣ Explicit Affordance (최우선)
     * ---------------------------------- */
 if (affordance) {
   if (affordance.clarify >= 0.6) {
     return {
       showSuggestions: true,
       suggestionMode: "EXPLICIT",
       maxSuggestions: 1,
     };
   }

   if (affordance.branch >= 0.6) {
     return {
       showSuggestions: true,
       suggestionMode: "EXPLICIT",
       maxSuggestions: 2,
     };
   }

   if (affordance.expand >= 0.4) {
     return {
       showSuggestions: true,
       suggestionMode: "SOFT",
       maxSuggestions:
         answerState.confidenceImpression === "LOW" ? 1 : 2,
     };
   }
 }

    /* ----------------------------------
     * 2️⃣ TurnIntent 기반 제어
     * ---------------------------------- */

    // 🔒 CONTINUATION: GPT처럼 "거의 안 건드림"
    if (turnIntent === "CONTINUATION") {
      if (answerState.completeness === "PARTIAL") {
        return {
          showSuggestions: true,
          suggestionMode: "SOFT",
          maxSuggestions: 1,
        };
      }

      return {
        showSuggestions: false,
        suggestionMode: "NONE",
        maxSuggestions: 0,
      };
    }

    // 🔒 SHIFT: 새 질문 → 제안 없음
    if (turnIntent === "SHIFT") {
      return {
        showSuggestions: false,
        suggestionMode: "NONE",
        maxSuggestions: 0,
      };
    }

    /* ----------------------------------
     * 3️⃣ AnswerState 중심 (GPT 핵심)
     * ---------------------------------- */

    // ✅ 답이 명확히 닫혔고 확신 높음 → 끝
    if (
      answerState.completeness === "FULL" &&
      answerState.confidenceImpression === "HIGH" &&
      reasoning.confidence >= 0.7
    ) {
      return {
        showSuggestions: false,
        suggestionMode: "NONE",
        maxSuggestions: 0,
      };
    }

    // 🟡 답은 끝났지만 애매한 여운
    if (
      answerState.completeness === "FULL" &&
      answerState.confidenceImpression !== "HIGH"
    ) {
      return {
        showSuggestions: true,
        suggestionMode: "SOFT",
        maxSuggestions: 1,
      };
    }

    // 🔓 PARTIAL 응답
    if (answerState.completeness === "PARTIAL") {
      if (reasoning.userStage === "confused") {
        return {
          showSuggestions: true,
          suggestionMode: "EXPLICIT",
          maxSuggestions: 1,
        };
      }

      return {
        showSuggestions: true,
        suggestionMode: "EXPLICIT",
        maxSuggestions:
          answerState.confidenceImpression === "LOW"
            ? 1
            : 2,
      };
    }

    /* ----------------------------------
     * 4️⃣ Reasoning fallback (soft)
     * ---------------------------------- */

    if (
      reasoning.confidence >= 0.75 &&
      reasoning.cognitiveLoad !== "high"
    ) {
      return {
        showSuggestions: true,
        suggestionMode: "SOFT",
        maxSuggestions: 1,
      };
    }

    /* ----------------------------------
     * 5️⃣ Default (완전 안전)
     * ---------------------------------- */
    return {
      showSuggestions: false,
      suggestionMode: "NONE",
      maxSuggestions: 0,
    };
  },
};

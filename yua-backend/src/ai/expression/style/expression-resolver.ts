// 🎭 Expression Resolver — PHASE 1 (PRODUCTION SAFE)
// 목적:
// - PersonaContext → 표현 힌트 변환
// - Prompt / LLM과 완전히 분리
// - 이후 style 확장 대비 구조 고정

import type { PersonaContext } from "../../persona/persona-context.types";

export type ExpressionHint = {
  tone: "neutral" | "friendly";
  greeting: boolean;
  emoji: boolean;
};

export function resolveExpression(
  personaContext?: PersonaContext
): ExpressionHint {
  if (!personaContext) {
    return {
      tone: "neutral",
      greeting: false,
      emoji: false,
    };
  }

  const { permission, behavior } = personaContext;

  if (!permission.allowPersonalTone) {
    return {
      tone: "neutral",
      greeting: false,
      emoji: false,
    };
  }

  if (behavior && behavior.confidence >= 0.6) {
    return {
      tone: "friendly",
      greeting: true,
      emoji: false, // 운영 안전 기본값
    };
  }

  return {
    tone: "neutral",
    greeting: false,
    emoji: false,
  };
}

// 📂 src/ai/memory/memory-language-decision-candidate.ts
// 🔥 YUA Language-based Decision Memory Candidate Engine (STABLE)
// -----------------------------------------------------
// ✔ ExecutionPlan 없이 작동
// ✔ LLM ❌ / 번역 ❌
// ✔ 다국어 선언 패턴 기반
// ✔ SSOT / deterministic
// ✔ ChatEngine 전용 fallback
// ✔ scope 결정은 ChatEngine 책임

import type { MemoryCandidate } from "./memory-candidate.type";

/* --------------------------------------------------
 * Input
 * -------------------------------------------------- */
export interface GenerateLanguageDecisionCandidateInput {
  answer: string;
  reasoning: {
    intent: "ask" | "design" | "debug" | "decide" | "execute";
    confidence: number;
  };
  confidence?: number;
  source?: "language";
}

/* --------------------------------------------------
 * Declarative Pattern (Language-Agnostic)
 * -------------------------------------------------- */
/**
 * 원칙:
 * - 미래/고정 시제
 * - 강한 단정
 * - 여지 제거
 *
 * 번역 ❌
 * 의미 분류 ❌
 * 패턴 일치 ONLY
 */
const DECLARATIVE_PATTERNS: RegExp[] = [
  // 🇰🇷 Korean
  /(기본(으로)?\s+.*(한다|유지한다|채택한다)[\.\)]?)/,
  /(앞으로\s+.*(한다|적용한다|유지한다)[\.\)]?)/,
  /(앞으로\s+.*(해도\s*돼|써도\s*돼|사용해도\s*돼))/,
  /(이제\s+.*(해도\s*돼|써도\s*돼))/,
  /(본\s+.*(정책|기준|원칙).*(으로\s+한다|로\s+정한다))/,

    // Architecture / Structural (Korean)
  /(전체\s*(구조|아키텍처)|SSOT|단일\s*진실\s*원본)/,
  /(모든\s*(경로|시스템|엔진).*기준)/,

  // 🇺🇸 English
  /\b(will|shall)\b.*\b(be|apply|adopt|remain)\b/i,
  /\b(this|the)\b.*\b(policy|rule|standard)\b.*\b(is|will be)\b/i,
  /\b(architecture|system design|ssot)\b/i,

  // 🧪 Technical / Symbolic
  /\b(default\s+(is|=))\b/i,
  /\b(SSOT|single source of truth)\b/i,
];

/* --------------------------------------------------
 * Soft Block Patterns (Reject)
 * -------------------------------------------------- */
const SOFT_BLOCK_PATTERNS: RegExp[] = [
  // 🇰🇷 Korean
  /(가능|여지|검토|상황에 따라|권장|제안)/,
  // 🇺🇸 English
  /(could|might|may|depending on|recommended|suggested)/i,
];

/* --------------------------------------------------
 * Engine
 * -------------------------------------------------- */
export function generateLanguageDecisionCandidate(
  input: GenerateLanguageDecisionCandidateInput
): MemoryCandidate | null {
  const { answer, reasoning } = input;

  // 0️⃣ Basic guards
  if (!answer) return null;

 // 🔥 짧은 선언형 REMEMBER 허용
 const isShortDeclarative =
   answer.length >= 8 &&
   reasoning.intent !== "ask";

 if (answer.length < 30 && !isShortDeclarative) {
   return null;
 }

  if (
   reasoning.intent !== "design" &&
   reasoning.intent !== "decide" &&
   reasoning.intent !== "execute"
 ) {
    return null;
  }

  // 1️⃣ Soft / non-binding language → reject
  if (SOFT_BLOCK_PATTERNS.some((r) => r.test(answer))) {
    return null;
  }

  // 2️⃣ Declarative pattern match
  const isDeclarative = DECLARATIVE_PATTERNS.some((r) =>
    r.test(answer)
  );
  if (!isDeclarative) return null;

  // 3️⃣ Confidence stabilization
  const base =
    typeof input.confidence === "number"
      ? input.confidence
      : reasoning.confidence;

  // language 선언은 reasoning을 존중하되 최소 가중치만 부여
  const confidence = Math.min(
    1,
    Math.max(base * 0.9 + 0.1, 0.6)
  );
  

  const isArchitectureLevel =
  /(아키텍처|구조|SSOT|architecture|system design)/i.test(answer);

  // 4️⃣ Candidate 생성
  return {
    content: answer.trim(),
    scope: "project_decision", // 🔒 최종 scope 결정은 ChatEngine (meta.decisionHint로 분기)
    confidence,
    reason: "language_declarative_decision",
    source: "explicit",

    // 🔑 힌트 메타 (ChatEngine 전용)
    meta: {
    decisionHint: isArchitectureLevel
      ? "ARCHITECTURE"
      : "DECISION",
    origin: "language",
  },
  };
}

// 📂 src/ai/memory/memory-candidate-rule.ts
// 🔥 YUA Memory Candidate Rules — SSOT PHASE 9-3

export interface MemoryCandidateRuleInput {
  userMessage: string;
  assistantMessage: string;
}

export interface MemoryCandidateRuleResult {
  ok: boolean;
  reason?: string;
}

const MIN_LENGTH = 20;

export const MemoryCandidateRule = {
  evaluate(
    input: MemoryCandidateRuleInput
  ): MemoryCandidateRuleResult {
    const { userMessage, assistantMessage } = input;

    // 🔒 출력 템플릿 문장 차단 (SSOT)
    if (
      /(전체 맥락을 고려하면|이렇게 해석할 수 있습니다|설명할 수 있습니다)/.test(
        assistantMessage
      )
    ) {
      return { ok: false };
    }

    // 1️⃣ 너무 짧은 응답은 제외
    if (!assistantMessage || assistantMessage.length < MIN_LENGTH) {
      return { ok: false };
    }

    // 2️⃣ 잡담 / 감탄사 필터
    if (
      /^(아|오케이|응|그래|ㅋㅋ|ㅎㅎ|음)/.test(assistantMessage.trim())
    ) {
      return { ok: false };
    }

    // 3️⃣ 선언적 문장 (기억 가치 ↑)
    if (
      /(항상|앞으로|기본적으로|원칙은|중요한 점은|ssot)/.test(
        assistantMessage
      )
    ) {
      return {
        ok: true,
        reason: "declarative_statement",
      };
    }

    // 4️⃣ 구조적 설명
    if (
      /(구조|설계|아키텍처|단계|흐름)/.test(
        assistantMessage
      )
    ) {
      return {
        ok: true,
        reason: "structural_explanation",
      };
    }

    return { ok: false };
  },
};

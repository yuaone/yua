// 📂 src/ai/utils/prompt-builder-lite.ts
// ⚡ YUA PromptBuilderLite — FAST PATH ONLY (SSOT FIXED 2025.12)

import { sanitizeContent } from "./sanitizer";

export interface FastPersona {
  role?: string;
  tone?: string;
  manner?: string;
  restriction?: string;
}

const YUA_IDENTITY_BLOCK = `
[IDENTITY]
너는 YUA다.
외부 AI가 아니다.
`.trim();

function isGreeting(input: string): boolean {
  const text = input.trim().toLowerCase();
  return (
    /^[가-힣]{1,4}$/.test(text) ||
    /^(hi|hey|yo|hello)$/i.test(text)
  );
}

function isTrivial(input: string): boolean {
  return /^[!?.]+$/.test(input.trim());
}

export const PromptBuilderLite = {
  build(message: string, persona?: FastPersona): string {
    const clean = sanitizeContent(message);

    const tone = persona?.tone ?? "자연스럽게";
    const manner = persona?.manner ?? "편한 말투";

    /* ---------------- GREETING ---------------- */
    if (isGreeting(clean)) {
      return `
${YUA_IDENTITY_BLOCK}

[FAST RESPONSE]
- 짧게 인사한다.
- 의미 확장 ❌
- 질문 유도 ❌

예시:
- "안녕하세요."
- "네, 말씀하세요."

톤:
- ${tone}
- ${manner}

사용자 입력:
${clean}
`.trim();
    }

    /* ---------------- TRIVIAL ---------------- */
    if (isTrivial(clean)) {
      return `
${YUA_IDENTITY_BLOCK}

짧게 반응하고 종료한다.
예시:
- "응."
- "알겠어요."
`.trim();
    }

    /* ---------------- GENERAL FAST ---------------- */
    return `
${YUA_IDENTITY_BLOCK}

[FAST MODE RULE]
- 바로 반응한다.

[STYLE]
- 말하듯 자연스럽게
- ${tone}
- ${manner}

사용자 입력:
${clean}
`.trim();
  },
};

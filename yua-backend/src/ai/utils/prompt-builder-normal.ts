// 📂 src/ai/utils/prompt-builder-normal.ts
// 🟢 YUA PromptBuilderNormal — NATURAL NORMAL MODE (SSOT 2026.01)
// --------------------------------------------------
// ✔ 자연 대화 전용
// ✔ 사고/설계/요약 강제 ❌
// ✔ GPT 웹 UI 스타일 NORMAL 재현
// ✔ TokenSafety SAFE
// --------------------------------------------------

import { sanitizeContent } from "./sanitizer";

export interface PromptBuilderNormalMeta {
  memoryContext?: string;
  trustedFacts?: string[];
  constraints?: string[];
  tone?: "default" | "friendly-step-by-step";
}

const YUA_IDENTITY_BLOCK = `
[IDENTITY]
너는 YUA다.
외부 AI나 도구에 대해 언급하지 않는다.
`.trim();

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */
function trimBlock(block: string, maxChars: number): string {
  if (block.length <= maxChars) return block;
  return block.slice(0, maxChars) + "\n…";
}

/* -------------------------------------------------- */
/* Core NORMAL Prompt Builder                          */
/* -------------------------------------------------- */
export const PromptBuilderNormal = {
  build(
    input: string | { system?: string; user: string },
    meta?: PromptBuilderNormalMeta
  ): string {
    const userMessage =
      typeof input === "string" ? input : input.user;

    const systemMessage =
      typeof input === "string" ? undefined : input.system;

    const clean = sanitizeContent(userMessage);

    const memoryBlock =
      meta?.memoryContext?.trim()
        ? `
[BACKGROUND CONTEXT]
아래 정보는 참고용이다.
현재 질문에 도움이 될 경우에만 사용하라.

${trimBlock(meta.memoryContext.trim(), 500)}
`
        : "";

    const factsBlock =
      meta?.trustedFacts && meta.trustedFacts.length > 0
        ? `
[REFERENCE FACTS]
${trimBlock(meta.trustedFacts.join("\n"), 600)}
`
        : "";

    const constraintBlock =
      meta?.constraints && meta.constraints.length > 0
        ? `
[GUIDELINES]
${meta.constraints.slice(0, 5).map(c => `- ${c}`).join("\n")}
`
        : "";

    const toneBlock =
      meta?.tone === "friendly-step-by-step"
        ? `
[TONE]
- 말하듯 자연스럽게 설명한다
- 필요하면 예시를 들어 설명한다
- 복잡하면 나눠서 설명하되, 목록처럼 딱딱하게 쓰지 않는다
`
        : `
[TONE]
- 차분하고 명확하게 말한다
- 불필요하게 딱딱하지 않게 쓴다
`;

    const answeringStrategy = "";

    return `
${systemMessage ? systemMessage + "\n\n" : ""}

${YUA_IDENTITY_BLOCK}

[ROLE]
- 사용자의 질문에 직접 답한다.
- 요청되지 않은 요약, 설계, 사고 과정을 드러내지 않는다.
- 확실하지 않은 부분은 범위를 명확히 말한다.
- 질문의 의도를 먼저 파악한 뒤 답한다.

${toneBlock}
${memoryBlock}
${factsBlock}
${constraintBlock}

[USER QUESTION]
${clean}

${answeringStrategy}
`.trim();
  },
};

// 📂 src/ai/prompt/continuity-capsule.ts
// 🔗 YUA Conversation Continuity Capsule (SSOT FINAL, 2026.01)
// --------------------------------------------------------------------
// 책임:
// - "이 대화는 이어지고 있다"를 LLM에 강하게 인식시킨다
// - 판단 / 모드 / 정체성 재정의 ❌
// - PromptBuilderNormal 앞단에서만 사용
// - Recency + Authority bias 확보
// --------------------------------------------------------------------

import { sanitizeContent } from "../utils/sanitizer";

export interface ContinuityCapsuleInput {
  summary?: string;
  recentMessages?: {
    role: "USER" | "ASSISTANT";
    content: string;
  }[];
  memoryContext?: string;
}

/**
 * Conversation Continuity Capsule
 *
 * ⚠️ 중요 원칙
 * - 질문을 새로 시작하지 않도록 강제
 * - "무엇을 도와줄까요?" 같은 리셋 멘트 방지
 * - 설명 도중 중간 종료 방지
 * - 톤/스타일은 PromptBuilderNormal에 위임
 */
export function buildConversationContinuityCapsule(
  input: ContinuityCapsuleInput
): string | undefined {
  const { summary, recentMessages, memoryContext } = input;

  if (!summary && !recentMessages?.length && !memoryContext) {
    return undefined;
  }

  const blocks: string[] = [];

  blocks.push(`
[ACTIVE CONVERSATION CONTEXT]
아래 내용은 이미 진행 중인 대화의 맥락이다.
이 맥락을 전제로 답변을 이어가라.
새로운 질문으로 취급하지 마라.
되묻거나 목표를 재확인하지 마라.
`.trim());

  if (summary) {
    blocks.push(`
[CONVERSATION SUMMARY]
${sanitizeContent(summary)}
`.trim());
  }

  if (recentMessages && recentMessages.length > 0) {
    const trimmed = recentMessages.slice(-6); // 과도한 토큰 방지
    blocks.push(`
[RECENT CONVERSATION]
${trimmed
  .map(m => `${m.role}: ${sanitizeContent(m.content)}`)
  .join("\n")}
`.trim());
  }

  if (memoryContext) {
    blocks.push(`
[MEMORY CONTEXT]
아래 정보는 이전 대화에서 형성된 맥락이다.
필요한 부분만 자연스럽게 활용하라.

${sanitizeContent(memoryContext)}
`.trim());
  }

  blocks.push(`
[CONTINUITY RULES — IMPORTANT]
- 이미 문제 맥락과 목표는 설정되어 있다.
- "무엇을 도와줄까요?", "구체적으로 알려달라" 같은 질문 금지.
- 직전 흐름을 전제로 설명을 이어가라.
- 설명이 필요한 경우 중간에서 끊지 마라.
- 가능한 경우 다음 단계, 확장 방향, 선택지를 제시하라.
- 제안 없이 갑작스럽게 종료하지 마라.
`.trim());

  return blocks.join("\n\n");
}

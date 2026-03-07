// 📂 src/ai/chat/runtime/deep-reformulation.ts
// 🔥 YUA Deep Reformulation Engine — SSOT FINAL (2026.01)
// ------------------------------------------------------
// ✔ DEEP mode ONLY
// ✔ deterministic (LLM ❌)
// ✔ no new entity introduction
// ✔ no summarization / no interpretation
// ✔ intent-flow restatement ONLY
// ✔ safe to prepend into PromptBuilderDeep
// ------------------------------------------------------

/**
 * Reformulation의 목적:
 * - "무엇을 해결 중인지"를 LLM에게 좌표로 제공
 * - 결론 / 판단 / 해석 / 요약 ❌
 * - 기존 대화에서 **이미 드러난 흐름만 재진술**
 */

export type DeepReformulationInput = {
  /**
   * ContextRuntime에서 올라온 userContext
   * - semantic filter 이후의 RAW text
   * - bullet 형식일 수 있음
   */
  conversationContext?: string;

  /**
   * 현재 user turn (sanitize 이후)
   */
  userMessage: string;
};

export type DeepReformulationOutput = {
  block: string;
};

const MAX_LINES = 3;

/* -------------------------------------------------- */
/* Public API                                         */
/* -------------------------------------------------- */
export function buildDeepReformulation(
  input: DeepReformulationInput
): DeepReformulationOutput | undefined {
  const { conversationContext, userMessage } = input;

  const ctxLines = extractContextLines(conversationContext);
  const userIntentLine = inferUserIntentLine(userMessage);

  const lines: string[] = [];

  // 1️⃣ Conversation flow (existing only)
  for (const l of ctxLines) {
    const restated = restateLine(l);
    if (restated) lines.push(restated);
    if (lines.length >= MAX_LINES - 1) break;
  }

  // 2️⃣ Current intent (always last)
  if (userIntentLine) {
    lines.push(userIntentLine);
  }

  if (lines.length === 0) return undefined;

  return {
    block: formatBlock(lines.slice(0, MAX_LINES)),
  };
}

/* -------------------------------------------------- */
/* Core Logic                                         */
/* -------------------------------------------------- */

function extractContextLines(
  conversationContext?: string
): string[] {
  if (!conversationContext) return [];

  return conversationContext
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

/**
 * 🔒 SSOT:
 * - 의미를 바꾸지 않는다
 * - 도메인 명사 추가 ❌
 * - 비교/판단 구조 생성 ❌
 */
function restateLine(line: string): string | undefined {
  if (!line) return undefined;

  // 질문 → 탐색 상태
  if (looksLikeQuestion(line)) {
    return "사용자는 관련된 선택지나 가능성을 탐색하고 있다.";
  }

  // 조건 / 전제 → 고려 중
  if (looksLikeConstraint(line)) {
    return "사용자는 특정 조건이나 기준을 염두에 두고 있다.";
  }

  // 그 외 user 발화 → 문제 맥락 유지
  return "사용자는 현재 주제에 대한 결정을 진행 중이다.";
}

/**
 * 현재 질문의 위치만 명시
 */
function inferUserIntentLine(message: string): string | undefined {
  const m = message.trim();
  if (!m) return undefined;

  if (looksLikeQuestion(m)) {
    return "현재 질문은 다음 선택이나 판단으로 이어지기 위한 것이다.";
  }

  return "현재 발화는 기존 흐름을 이어가기 위한 것이다.";
}

/* -------------------------------------------------- */
/* Heuristics (deterministic & conservative)          */
/* -------------------------------------------------- */

function looksLikeQuestion(text: string): boolean {
  if (/[?？]$/.test(text)) return true;

  return (
    /(어때|어떤|무엇|뭐|왜|가능|될까|추천|비교|알려|해줘|고를)/i.test(
      text
    ) ||
    /^[가-힣]{1,6}(은|는)\s*$/.test(text)
  );
}

function looksLikeConstraint(text: string): boolean {
  return (
    /(조건|전제|제약|예산|가격|기간|선호|피하|제외|필수)/i.test(
      text
    )
  );
}

/* -------------------------------------------------- */
/* Output Formatter                                   */
/* -------------------------------------------------- */

function formatBlock(lines: string[]): string {
  return [
    "[PROBLEM REFORMULATION]",
    ...lines.map((l) => `- ${l}`),
  ].join("\n");
}

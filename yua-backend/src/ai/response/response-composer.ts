/* ============================================================================
 * ResponseComposer — CHAT ONLY (OpenAI-style)
 * ----------------------------------------------------------------------------
 * 역할:
 * - RAW assistant text를 그대로 전달
 * - 문서 구조 / section / step / divider ❌
 * - 의미 해석 / 요약 / 재작성 ❌
 *
 * SSOT:
 * - Chat UI에서는 "말풍선 하나 = markdown 하나"
 * - DOM 구조는 streaming / final에서 절대 변하지 않는다
 * ============================================================================
 */

/* =========================
   UI Output Types
========================= */

export type UIBlock =
  | { type: "markdown"; content: string };

export type ComposedResponse = {
  blocks: UIBlock[];
};

type ComposeOptions = {
  isPartial?: boolean;
  suggestions?: string[];
  variant?: "CHAT" | "DOCUMENT";
};

/* =========================
   Main Composer (CHAT ONLY)
========================= */

export function composeResponse(
  rawAssistantText: string,
  _options: ComposeOptions = {}
): ComposedResponse {
  // 🔒 SSOT:
  // - Chat에서는 assistant 응답을 절대 분해하지 않는다
  // - Streaming / Final 모두 동일한 구조 유지
  // - ReactMarkdown이 DOM 전체를 교체하지 않도록 보장

  if (!rawAssistantText || !rawAssistantText.trim()) {
    return { blocks: [] };
  }

  return {
    blocks: [
      {
        type: "markdown",
        content: rawAssistantText,
      },
    ],
  };
}

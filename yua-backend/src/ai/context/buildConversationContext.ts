import {
  fetchConversationSummary,
  fetchRecentChatMessages,
} from "../../db/pg-readonly";

/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */
export type ConversationRole = "user" | "assistant";
export type ConversationMessage = {
  role: ConversationRole;
  content: string;
};

export type ConversationContext = {
  summary?: string;
  recentMessages: ConversationMessage[];
  conversationState?: string;
};

/* --------------------------------------------------
 * Utils (SSOT SAFE)
 * -------------------------------------------------- */

// 🔒 의미 없는 메시지 필터
function isMeaningfulUserMessage(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length < 6) return false;
  if (/^(안녕|안녕하세요|hi|hello)$/i.test(trimmed)) return false;
  if (/^[ㅋㅎ]+$/.test(trimmed)) return false;

  return true;
}

/* --------------------------------------------------
 * Builder
 * -------------------------------------------------- */

export async function buildConversationContext(
  threadId: number,
  recentLimit = 20
): Promise<ConversationContext> {
  // 1️⃣ 요약 (SSOT: summary는 그대로 사용)
  const summaryRow = await fetchConversationSummary(threadId);
  const summary = summaryRow?.content?.trim();

  // 2️⃣ 최근 메시지
  const rows = await fetchRecentChatMessages(threadId, recentLimit);

  // 🔒 SSOT RULE:
  const recentMessages: ConversationMessage[] = rows
    .slice()
    .reverse()
  // 🔒 SSOT FIX:
  // assistant 내용은 carry 대상은 아니지만
  // continuity anchor 계산을 위해 반드시 포함해야 한
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      role: r.role,
      content: r.content?.trim() ?? "",
    }))
    // 🔒 NOTE / 빈 발화 제거
    .filter(
      (r) =>
        r.content.length > 0 &&
        !/^(\[NOTE|\[META|\[STAGE)/i.test(r.content)
    )
    // 🔒 의미 없는 짧은 노이즈 제거 (user만)
    .filter((r) =>
      r.role === "assistant" ? true : isMeaningfulUserMessage(r.content)
    )
    // 🔒 SSOT: recentLimit 파라미터 기반 히스토리 유지
    .slice(-recentLimit);

  // 3️⃣ conversationState (요약 기반, 설명용)
  const conversationState = summary
    ? [
        "[STATE]",
        summary
          .split("\n")
          .slice(0, 8)
          .map((s) => `• ${s.trim()}`)
          .join("\n"),
      ].join("\n")
    : undefined;

  return {
    summary,
    recentMessages,
    conversationState,
  };
}

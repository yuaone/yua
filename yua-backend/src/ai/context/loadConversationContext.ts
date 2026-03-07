import { fetchRecentChatMessages } from "../../db/pg-readonly";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * SSOT v2
 * - pending context 분석용
 */
export async function loadRecentConversation(
  threadId: number,
  limit = 20
): Promise<ConversationMessage[]> {
  const rows = await fetchRecentChatMessages(threadId, limit);
  if (!rows.length) return [];

  return rows
    .reverse()
    .map((r) => ({
      role: r.role,
      content: r.content.trim(),
    }))
    .filter((m) => m.content.length > 0);
}

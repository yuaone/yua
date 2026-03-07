// 📂 src/db/pg-readonly.ts
// 🔒 PostgreSQL Read-Only Wrapper — SSOT STEP 1 (FINAL, 2025.12)

import { pgPool } from "./postgres";

/* -------------------------------------------------- */
/* Types (DB Schema 1:1 대응) */
/* -------------------------------------------------- */

export type ChatMessageRow = {
  id: number;
  thread_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ConversationSummaryRow = {
  id: number;
  thread_id: number;
  content: string;
  updated_at: string;
};

/* -------------------------------------------------- */
/* Read-Only Queries (NO WRITE, NO SIDE EFFECT) */
/* -------------------------------------------------- */

/**
 * ✅ 최근 메시지 조회
 * - thread_id 기준
 * - 최신 → 과거 (DESC)
 * - 정렬 보정은 호출부 책임 (SSOT)
 */
export async function fetchRecentChatMessages(
  threadId: number,
  limit = 20
): Promise<ChatMessageRow[]> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20;

  const res = await pgPool.query<ChatMessageRow>(
    `
    SELECT
      id,
      thread_id,
      role,
      content,
      created_at
    FROM public.chat_messages
    WHERE thread_id = $1
      AND role IN ('user', 'assistant')
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [threadId, safeLimit]
  );

  return Array.isArray(res.rows) ? res.rows : [];
}

/**
 * ✅ 최신 요약 조회
 * - thread_id 기준 단일 row
 */
export async function fetchConversationSummary(
  threadId: number
): Promise<ConversationSummaryRow | null> {
  const res = await pgPool.query<ConversationSummaryRow>(
    `
    SELECT
      id,
      thread_id,
      content,
      updated_at
    FROM public.conversation_summaries
    WHERE thread_id = $1
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [threadId]
  );

  return res.rows.length > 0 ? res.rows[0] : null;
}

/* -------------------------------------------------- */
/* Health Check (Optional, Read-Only) */
/* -------------------------------------------------- */

export async function pgReadonlyHealthCheck(): Promise<{
  ok: true;
  now: string | undefined;
}> {
  const r = await pgPool.query<{ now: string }>(
    "SELECT NOW() AS now"
  );

  return {
    ok: true,
    now: r.rows[0]?.now,
  };
}

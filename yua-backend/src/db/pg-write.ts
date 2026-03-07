// 🔒 PostgreSQL Write Wrapper — SSOT STEP 1 (DEBUG MODE)

import { pgPool } from "./postgres";

/* -------------------------------------------------- */
/* Types */
/* -------------------------------------------------- */

export type InsertChatMessageParams = {
  threadId: number;
  role: "user" | "assistant";
  content: string;
};

/* -------------------------------------------------- */
/* INTERNAL: CONNECTION CHECK */
/* -------------------------------------------------- */

async function logPgConnectionContext() {
  try {
    const r = await pgPool.query<{
      current_database: string;
      current_user: string;
      inet_server_addr: string | null;
      inet_server_port: number | null;
    }>(`
      SELECT
        current_database(),
        current_user,
        inet_server_addr(),
        inet_server_port()
    `);

    console.log("[PG-CONTEXT]", r.rows[0]);
  } catch (e) {
    console.error("[PG-CONTEXT ERROR]", e);
  }
}

/* -------------------------------------------------- */
/* Write Operations */
/* -------------------------------------------------- */

export async function insertChatMessage({
  threadId,
  role,
  content,
}: InsertChatMessageParams): Promise<void> {
  if (!content || !content.trim()) {
    console.warn("[PG-WRITE] skip empty content", { threadId, role });
    return;
  }

  console.log("[PG-WRITE] insertChatMessage CALLED", {
    threadId,
    role,
    preview: content.slice(0, 30),
  });

  // 🔥 여기서 DB 연결 컨텍스트 로그
  await logPgConnectionContext();

  try {
    const result = await pgPool.query(
      `
      INSERT INTO public.chat_messages
        (thread_id, role, content, created_at)
      VALUES
        ($1, $2, $3, NOW())
      RETURNING id
      `,
      [threadId, role, content]
    );

    console.log("[PG-WRITE] INSERT OK", {
      insertedId: result.rows[0]?.id,
    });
  } catch (err) {
    console.error("[PG-WRITE ERROR]", err);
    throw err;
  }
}

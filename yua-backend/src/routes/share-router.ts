// src/routes/share-router.ts
// 메시지 공유 링크 API (SSOT)

import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";
import { requireFirebaseAuth } from "../auth/auth.express";
import { resignFileUrl } from "../utils/signed-url";

const router = Router();

/* ==================================================
   POST /api/chat/share — 공유 링크 생성 (인증 필요)
   Body: { messageId: number }
   Response: { ok, token, url }
================================================== */
router.post(
  "/chat/share",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.body;
      const userId = (req as any).user?.userId;

      if (!messageId || !userId) {
        return res.status(400).json({ ok: false, error: "messageId required" });
      }

      // 이미 공유된 메시지인지 확인
      const existing = await pgPool.query(
        `SELECT token FROM shared_messages WHERE message_id = $1 AND shared_by_user_id = $2 LIMIT 1`,
        [messageId, userId]
      );

      if (existing.rows.length > 0) {
        const token = existing.rows[0].token;
        return res.json({ ok: true, token, url: `/share/${token}` });
      }

      // 원본 메시지 조회
      const msgResult = await pgPool.query(
        `SELECT id, thread_id, role, content, model, meta, thinking_profile
         FROM chat_messages WHERE id = $1`,
        [messageId]
      );

      if (msgResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "message not found" });
      }

      const msg = msgResult.rows[0];

      // shared_messages에 스냅샷 저장
      const insertResult = await pgPool.query(
        `INSERT INTO shared_messages
           (message_id, thread_id, shared_by_user_id, content, role, model, meta, thinking_profile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING token`,
        [
          msg.id,
          msg.thread_id,
          userId,
          msg.content,
          msg.role,
          msg.model,
          msg.meta,
          msg.thinking_profile,
        ]
      );

      const token = insertResult.rows[0].token;
      return res.json({ ok: true, token, url: `/share/${token}` });
    } catch (err: any) {
      console.error("[SHARE] create error:", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  }
);

/* ==================================================
   POST /api/chat/fork — 가지치기 (인증 필요)
   Body: { messageId: number }
   - 해당 assistant 메시지 content를 system context로 새 스레드 생성
   - 이전 대화는 보이지 않음 (새 스레드)
   Response: { ok, threadId }
================================================== */
router.post(
  "/chat/fork",
  requireFirebaseAuth,
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.body;
      const userId = (req as any).user?.userId;

      if (!messageId || !userId) {
        return res.status(400).json({ ok: false, error: "messageId required" });
      }

      // 원본 메시지 조회
      const msgResult = await pgPool.query(
        `SELECT id, thread_id, role, content, model, meta
         FROM chat_messages WHERE id = $1`,
        [messageId]
      );

      if (msgResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "message not found" });
      }

      const msg = msgResult.rows[0];

      // 원본 스레드 제목 가져오기
      const threadResult = await pgPool.query(
        `SELECT title, workspace_id FROM conversation_threads WHERE id = $1`,
        [msg.thread_id]
      );
      const origTitle = threadResult.rows[0]?.title ?? "New Chat";
      const workspaceId = threadResult.rows[0]?.workspace_id;

      if (!workspaceId) {
        return res.status(400).json({ ok: false, error: "workspace not found" });
      }

      // 새 스레드 생성 (forked_from_message_id 기록)
      const newThread = await pgPool.query<{ id: number }>(
        `INSERT INTO conversation_threads
           (workspace_id, user_id, title, auto_titled, visibility, pinned, forked_from_message_id)
         VALUES ($1, $2, $3, false, 'private', false, $4)
         RETURNING id`,
        [workspaceId, userId, `${origTitle} (이어서)`, messageId]
      );

      const newThreadId = newThread.rows[0]?.id;
      if (!newThreadId) {
        return res.status(500).json({ ok: false, error: "thread creation failed" });
      }

      // 원본 대화 히스토리 복사 (해당 메시지까지의 모든 user/assistant 메시지)
      const historyResult = await pgPool.query(
        `SELECT role, content, model, meta
         FROM chat_messages
         WHERE thread_id = $1 AND id <= $2 AND role IN ('user', 'assistant')
         ORDER BY id ASC`,
        [msg.thread_id, messageId]
      );

      if (historyResult.rows.length > 0) {
        const values: string[] = [];
        const params: any[] = [newThreadId];
        let paramIdx = 2;

        for (const row of historyResult.rows) {
          values.push(`($1, $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
          params.push(
            row.role,
            row.content,
            row.model,
            JSON.stringify({ ...(row.meta ?? {}), forkedFrom: messageId })
          );
          paramIdx += 4;
        }

        await pgPool.query(
          `INSERT INTO chat_messages (thread_id, role, content, model, meta)
           VALUES ${values.join(", ")}`,
          params
        );
      }

      return res.json({ ok: true, threadId: newThreadId });
    } catch (err: any) {
      console.error("[FORK] error:", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  }
);

/* ==================================================
   GET /api/share/:token — 공유 메시지 조회 (PUBLIC, 인증 불필요)
   Response: { ok, message: { content, model, meta, thinkingProfile, createdAt } }
================================================== */
router.get("/share/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 30) {
      return res.status(400).json({ ok: false, error: "invalid token" });
    }

    const result = await pgPool.query(
      `UPDATE shared_messages
       SET view_count = view_count + 1
       WHERE token = $1
         AND (expires_at IS NULL OR expires_at > now())
       RETURNING content, role, model, meta, thinking_profile, created_at, view_count, thread_id, message_id`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "not found or expired" });
    }

    const row = result.rows[0];

    // C-02: Fetch and re-sign attached files
    let files: any[] = [];
    if (row.message_id) {
      const filesResult = await pgPool.query(
        `SELECT id, file_name AS "fileName", mime_type AS "mimeType",
                file_kind AS "fileKind", file_url AS "fileUrl", size_bytes AS "sizeBytes"
         FROM chat_files WHERE message_id = $1`,
        [row.message_id]
      );
      files = filesResult.rows.map((f: any) => ({
        ...f,
        fileUrl: f.fileUrl ? resignFileUrl(f.fileUrl, 86_400) : null,
      }));
    }

    return res.json({
      ok: true,
      message: {
        content: row.content,
        role: row.role,
        model: row.model,
        meta: row.meta,
        thinkingProfile: row.thinking_profile,
        createdAt: row.created_at,
        viewCount: row.view_count,
        threadId: row.thread_id,
        messageId: row.message_id,
        files,
      },
    });
  } catch (err: any) {
    console.error("[SHARE] get error:", err);
    return res.status(500).json({ ok: false, error: "internal" });
  }
});

export default router;

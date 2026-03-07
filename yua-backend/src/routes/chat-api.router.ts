// 📂 src/routes/chat-api.router.ts
// 🔥 FINAL TYPE-SAFE VERSION (2025.12)
// 🔐 역할: Chat 조회 + Load (AI API 전단계)
// ❌ Thread / Message 생성 절대 없음

import { Router, Request, Response } from "express";
import { db } from "../db/mysql";
import { getUserFromExpressRequest } from "../auth/auth.express";

const router = Router();

/* ======================================================
   GET /api/chat/list
   - 사용자 Thread 목록 조회
   - Firebase Auth만
====================================================== */
router.get("/list", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromExpressRequest(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const userId = user.userId;

    const [rows] = await db.query(
      `
      SELECT id, title, pinned, created_at
      FROM chat_threads
      WHERE user_id = ?
      ORDER BY pinned DESC, created_at DESC
      `,
      [userId]
    );

    return res.json({ ok: true, threads: rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/* ======================================================
   GET /api/chat/load
   - Thread + Message 전체 로딩
   - Firebase Auth만
====================================================== */
router.get("/load", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromExpressRequest(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const userId = user.userId;
    const threadId = Number(req.query.thread_id);

    if (!threadId) {
      return res.status(400).json({ ok: false, error: "thread_id required" });
    }

    const [[thread]]: any = await db.query(
      `SELECT id, title FROM chat_threads WHERE id=? AND user_id=?`,
      [threadId, userId]
    );

    if (!thread) {
      return res.status(404).json({ ok: false, error: "Thread not found" });
    }

    const [messages] = await db.query(
      `
      SELECT id, role, content, model, files, created_at
      FROM chat_messages
      WHERE thread_id = ?
      ORDER BY created_at ASC
      `,
      [threadId]
    );

    return res.json({
      ok: true,
      thread,
      messages,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;

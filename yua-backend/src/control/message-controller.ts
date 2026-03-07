// 🔥 Message Controller — Firebase Auth Required (TS SAFE)

import { Request, Response } from "express";
import { MessageEngine } from "../ai/engines/message-engine";
import { getUserFromExpressRequest } from "../auth/auth.express";
import { db } from "../db/mysql";

export const messageController = {
  /* --------------------------------------------------
     List Messages
  -------------------------------------------------- */
  async list(req: Request, res: Response) {
    try {
      const user = await getUserFromExpressRequest(req);

      // ✅ TS 가드 (핵심)
      if (!user) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const userId = user.userId;

      const threadId = Number(req.query.threadId);
      if (!threadId) {
        return res.status(400).json({ ok: false, error: "threadId required" });
      }

      const [[t]]: any = await db.query(
        `SELECT id FROM chat_threads WHERE id=? AND user_id=?`,
        [threadId, userId]
      );

      if (!t) {
        return res.status(403).json({ ok: false, error: "forbidden" });
      }

      const messages = await MessageEngine.listMessages(threadId);

      return res.json({ ok: true, messages });
    } catch (e: any) {
      return res.status(401).json({ ok: false, error: e.message });
    }
  },

  /* --------------------------------------------------
     Add Message
  -------------------------------------------------- */
  async create(req: Request, res: Response) {
    try {
      const user = await getUserFromExpressRequest(req);

      // ✅ TS 가드 (핵심)
      if (!user) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const userId = user.userId;

      const { threadId, role, content, model, files } = req.body;

      if (!threadId || !role || !content) {
        return res.status(400).json({ ok: false, error: "invalid payload" });
      }

      const [[t]]: any = await db.query(
        `SELECT id FROM chat_threads WHERE id=? AND user_id=?`,
        [threadId, userId]
      );

      if (!t) {
        return res.status(403).json({ ok: false, error: "forbidden" });
      }

      const messageId = await MessageEngine.addMessage({
        threadId,
        userId,
        role,
        content,
        model,
        files,
      });

      return res.json({ ok: true, messageId });
    } catch (e: any) {
      return res.status(401).json({ ok: false, error: e.message });
    }
  },
};

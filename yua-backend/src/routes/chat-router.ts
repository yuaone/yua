// 📂 src/routes/chat-router.ts
// 🔥 FINAL FULL VERSION — Chat + Thread API BOUND (AUTH OR APIKEY)

import { Router, Request, Response } from "express";

// 🔥 Chat Controller (핵심)
import { chatController } from "../control/chat-controller";

// 🔥 Firebase OR ApiKey 인증
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { withWorkspace } from "../middleware/with-workspace";

const router = Router();

/* ------------------------------------------------------------
 * 🔹 CHAT (single message → AI)
 * POST /api/chat
 * ---------------------------------------------------------- */
router.post(
  "/",
  requireAuthOrApiKey,
  withWorkspace, // 🔥🔥🔥 이 줄이 빠져 있어서 전부 죽어 있었음
  ...chatController.handleChat
);

/* ------------------------------------------------------------
 * 🛑 STOP STREAM
 * POST /api/chat/stop
 * ---------------------------------------------------------- */
router.post(
  "/stop",
  requireAuthOrApiKey,
  async (req: Request, res: Response) => {
    try {
      const { threadId } = req.body || {};

      if (!threadId) {
        return res.status(400).json({
          ok: false,
          error: "threadId required",
        });
      }

      const { StreamController } = await import(
        "../ai/stream/stream-controller.js"
      );

      await StreamController.abort(Number(threadId), "user-stop");

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[CHAT STOP ERROR]", e);
      return res.status(500).json({
        ok: false,
        error: e?.message ?? "stop failed",
      });
    }
  }
);


export default router;

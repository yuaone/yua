import { Router, Request, Response } from "express";
import { StreamEngine } from "../ai/engines/stream-engine";
import { StreamStage } from "yua-shared/stream/stream-stage";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";

const router = Router();

/**
 * POST /api/stream/abort
 * body: { threadId: number }
 */
router.post(
  "/abort",
  requireAuthOrApiKey,
  async (req: Request, res: Response) => {
    const threadId = Number(req.body?.threadId);

    if (!Number.isFinite(threadId)) {
      res.status(400).json({
        ok: false,
        error: "threadId_required",
      });
      return;
    }

    try {
      const aborted = StreamEngine.abort(threadId);

      res.status(200).json({
        ok: true,
        aborted: Boolean(aborted),
        threadId,
      });
      return;
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "abort_failed",
      });
      return;
    }
  }
);

/**
 * POST /api/chat/stream/unlock
 * body: { threadId: number, traceId?: string }
 */
router.post(
  "/unlock",
  requireAuthOrApiKey,
  async (req: Request, res: Response) => {
    const threadId = Number(req.body?.threadId);
    if (!Number.isFinite(threadId)) {
      res.status(400).json({ ok: false, error: "threadId_required" });
      return;
    }

    const traceId =
      typeof req.body?.traceId === "string"
        ? req.body.traceId
        : StreamEngine.getSession(threadId)?.traceId;

    if (!traceId) {
      res.status(400).json({ ok: false, error: "traceId_required" });
      return;
    }

    try {
      await StreamEngine.publish(threadId, {
        event: "stage",
        stage: StreamStage.ANSWER_UNLOCKED,
        traceId,
      });
      res.status(200).json({ ok: true, threadId, traceId });
      return;
    } catch (err) {
      res.status(500).json({ ok: false, error: "unlock_failed" });
      return;
    }
  }
);

export default router;

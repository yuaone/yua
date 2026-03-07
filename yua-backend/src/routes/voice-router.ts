import { Router, Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import multer from "multer";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { withWorkspace } from "../middleware/with-workspace";
import { signVoiceWsToken } from "../ai/voice/voice-ws-token";
import { STTService } from "../ai/voice/stt";
import type { VoiceSessionRecord } from "../ai/voice/voice.types";
import { VoiceSessionRepo } from "../ai/voice/voice-session.repo";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const stt = new STTService();

/**
 * POST /api/voice/transcribe
 * multipart/form-data: audio
 */
router.post(
  "/transcribe",
  requireAuthOrApiKey,
  withWorkspace,
  upload.single("audio"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ ok: false, error: "no_audio_file" });
      }

      const ext = path.extname(file.originalname || "audio.webm").replace(".", "") || "webm";
      const language = (req.body?.language as string) || "ko";

      const result = await stt.transcribeBuffer({
        buffer: file.buffer,
        filename: file.originalname || `audio.${ext}`,
        ext,
        model: "gpt-4o-mini-transcribe",
        language,
      });

      return res.json({
        ok: true,
        text: result.text,
        language: result.language,
        durationSeconds: result.durationSeconds,
      });
    } catch (e: any) {
      console.error("[VOICE_TRANSCRIBE_ERROR]", e);
      return res.status(500).json({ ok: false, error: "transcription_failed" });
    }
  }
);

router.post(
  "/sessions",
  requireAuthOrApiKey,
  withWorkspace,
  async (req: Request, res: Response) => {
    const threadId = Number(req.body?.threadId);
    if (!Number.isFinite(threadId)) {
      return res.status(400).json({ ok: false, error: "threadId_required" });
    }

    const userId = Number((req as any).user?.id ?? (req as any).user?.userId);
    const workspaceId = (req as any).workspace?.id;

    if (!workspaceId || !Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const sessionId = crypto.randomUUID();
    const traceId = crypto.randomUUID();

    const record: VoiceSessionRecord = {
      sessionId,
      traceId,
      threadId,
      workspaceId,
      userId,
      createdAt: Date.now(),
      status: "ACTIVE",
    };

    await VoiceSessionRepo.put(record);

    const token = signVoiceWsToken(
      { sessionId, threadId, workspaceId, userId, traceId },
      10 * 60 * 1000
    );

    return res.json({
      ok: true,
      sessionId,
      traceId,
      wsUrl: `/ws/voice?token=${encodeURIComponent(token)}`,
    });
  }
);

export default router;
// src/routes/chat-upload.router.ts

import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { withWorkspace } from "../middleware/with-workspace";
import { ChatUploadService } from "../ai/upload/chat-upload.service";
import { signAssetUrl } from "../utils/signed-url";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.use(requireAuthOrApiKey);
router.use(withWorkspace);

/**
 * POST /api/chat/upload
 * multipart/form-data
 * field: file
 */
router.post("/upload", upload.single("file"), async (req: any, res) => {
  console.log("UPLOAD ENTRY");
  console.log("USER:", req.user);
  console.log("WORKSPACE:", req.workspace);
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "NO_FILE" });
    }

    const workspaceId = (req as any).workspace?.id as string | undefined;
    const saved = await ChatUploadService.saveAttachment(file, {
      userId,
      workspaceId,
    });

    // Sign the asset URL with 24-hour TTL (relative path for Next.js rewrite)
    const signedPath = signAssetUrl(saved.url, 86_400);

    const kind =
      file.mimetype?.startsWith("image/")
        ? "image"
        : "file";

    // SSOT: DB write (chatController only)
    return res.json({
      ok: true,
      attachment: {
        id: crypto.randomUUID(),
        kind,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        url: signedPath,
      },
    });
  } catch (e: any) {
    console.error("[CHAT_UPLOAD_ERROR]", e);
    return res.status(500).json({
      ok: false,
      error: e?.message ?? "UPLOAD_FAILED",
    });
  }
});

export default router;

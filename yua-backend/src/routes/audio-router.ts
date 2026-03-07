// 📂 src/routes/audio-router.ts
// 🔥 Audio Router — FINAL STABLE VERSION (2025.11)

import { Router } from "express";
import multer from "multer";
import { AudioEngine } from "../ai/audio/audio-engine";

const router = Router();

// 업로드 저장 방식 (메모리)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 🎤 음성 분석 API
 * POST /api/audio/analyze
 * Form-data: file
 */
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const result = await AudioEngine.analyze({
      file,
      base64: undefined,
      url: undefined,
    });

    return res.json(result);
  } catch (err: any) {
    return res.json({ ok: false, error: err.message || String(err) });
  }
});

export default router;

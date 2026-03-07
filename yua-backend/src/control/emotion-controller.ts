// 📂 src/controllers/emotion-controller.ts
// 🔥 Emotion Controller — 감정 분석 API (2025.11 FINAL)

import { Request, Response } from "express";
import { EmotionEngine } from "../ai/emotion/emotion-engine";

export const EmotionController = {
  async analyze(req: Request, res: Response) {
    try {
      const message = (req.body?.message || "").trim();
      if (!message)
        return res.status(400).json({ ok: false, error: "message가 필요합니다." });

      const result = await EmotionEngine.deepDetect(message);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e.message || "감정 분석 실패"
      });
    }
  }
};

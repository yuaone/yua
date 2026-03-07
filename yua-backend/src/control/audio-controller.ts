// 📂 src/controllers/audio-controller.ts
// 🎤 AudioController — STT + 감정 + 위험도 분석

import { Request, Response } from "express";
import { AudioEngine } from "../ai/audio/audio-engine";

export const audioController = {
  analyze: async (req: Request, res: Response) => {
    try {
      const result = await AudioEngine.analyze({
        file: req.file,
        base64: req.body?.base64,
        url: req.body?.url
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: String(err)
      });
    }
  }
};

// 📂 src/controllers/video-controller.ts

import { Request, Response } from "express";
import { VideoEngine } from "../ai/video/video-engine";

export const videoController = {
  async analyze(req: Request, res: Response) {
    try {
      const { image, cameraId } = req.body;

      if (!image) {
        return res.status(400).json({ ok: false, error: "image 필수" });
      }

      const result = await VideoEngine.analyze({ image, cameraId });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  },
};

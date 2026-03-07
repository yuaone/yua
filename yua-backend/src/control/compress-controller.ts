// 📂 src/controllers/compress-controller.ts
import { Request, Response } from "express";
import { CompressEngine } from "../ai/compress/compress-engine";

export const compressController = {
  async run(req: Request, res: Response) {
    try {
      const { text, mode } = req.body;

      const result = await CompressEngine.compress({
        text,
        mode,
      });

      return res.json({ ok: true, result });
    } catch (e: any) {
      return res.json({ ok: false, error: e.message });
    }
  },
};

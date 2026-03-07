// 📂 src/controllers/security-controller.ts
// 🔥 Security Controller — FINAL

import { Request, Response } from "express";
import { SecurityEngine } from "../ai/security/security-engine";

export const securityController = {
  async analyze(req: Request, res: Response) {
    try {
      const { input, type } = req.body ?? {};

      if (!input || typeof input !== "string") {
        return res.status(400).json({
          ok: false,
          engine: "security-error",
          error: "input 필드가 필요합니다.",
        });
      }

      const result = await SecurityEngine.analyze({ input, type });

      return res.status(200).json({
        ok: true,
        engine: "security",
        result,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        engine: "security-error",
        error: String(e),
      });
    }
  },
};

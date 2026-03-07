// 📂 src/controllers/doc-controller.ts
// 🔥 DocController — FINAL 2025.11

import { Request, Response } from "express";
import { DocEngine } from "../ai/doc/doc-engine";

export const docController = {
  async generate(req: Request, res: Response) {
    try {
      const { type, title, content, items } = req.body ?? {};

      if (!type || !["api", "tech", "plan"].includes(type)) {
        return res.status(400).json({
          ok: false,
          engine: "doc-error",
          error: "type은 api | tech | plan 중 하나여야 합니다.",
        });
      }

      const out = await DocEngine.generate({
        type,
        title,
        content,
        items,
      });

      return res.status(200).json({
        ok: true,
        engine: "doc",
        result: out,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        engine: "doc-error",
        error: String(e),
      });
    }
  },
};

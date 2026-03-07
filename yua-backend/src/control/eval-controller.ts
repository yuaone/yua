// 📂 src/control/eval-controller.ts
// 🔥 Eval Controller — FINAL VERSION

import { Request, Response } from "express";
import { EvalEngine } from "../ai/code/eval-engine";

export const evalController = {
  async analyzeCode(req: Request, res: Response) {
    try {
      const { code, language, deep } = req.body;

      const result = await EvalEngine.analyze({
        code,
        language,
        deep,
      });

      res.json({ ok: true, result });
    } catch (err: any) {
      res.json({ ok: false, error: err.message });
    }
  },
};

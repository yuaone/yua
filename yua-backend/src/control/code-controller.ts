// 📂 src/controllers/code-controller.ts
// 🔥 CodeController — FINAL VERSION

import { Request, Response } from "express";
import { CodeEngine } from "../ai/code/code-engine";
import { CodeUtils } from "../ai/code/code-utils";

export const CodeController = {
  async run(req: Request, res: Response) {
    try {
      const { code, task, language } = req.body;

      const lang = language || CodeUtils.detectLanguage(code);

      const result = await CodeEngine.run({
        code: CodeUtils.sanitize(code),
        task,
        language: lang,
      });

      res.json({ ok: true, result });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  },
};

// 📂 src/controllers/reasoning-controller.ts

import { Request, Response } from "express";
import { ReasoningEngine } from "../ai/reasoning/reasoning-engine";

export const ReasoningController = {
  analyze(req: Request, res: Response) {
    try {
      const { question } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({
          ok: false,
          error: "question은 필수 문자열입니다.",
        });
      }

      const result = ReasoningEngine.reason({
        input: question,
      });

      return res.json({ ok: true, result });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e?.message ?? "서버 오류",
      });
    }
  },
};

// 📂 src/controllers/decision-controller.ts
// 🔥 DecisionController — 고급 의사결정 API (2025.11 FINAL)

import { Request, Response } from "express";
import { DecisionEngine } from "../ai/decision/decision-engine";

export const decisionController = {
  async judge(req: Request, res: Response): Promise<Response> {
    try {
      const { topic, tone, detail } = req.body ?? {};

      if (!topic) {
        return res.status(400).json({
          ok: false,
          engine: "decision-error",
          error: "topic 필드가 필요합니다.",
        });
      }

      const output = await DecisionEngine.judge({
        topic,
        tone,
        detail,
      });

      return res.status(200).json({
        ok: true,
        engine: "decision",
        topic,
        output,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        engine: "decision-error",
        error: String(e),
      });
    }
  },
};

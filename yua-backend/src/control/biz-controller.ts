// 📂 src/controllers/biz-controller.ts
// 🔥 BizController — 기업 경영/재무 분석 API

import { Request, Response } from "express";
import { BizEngine } from "../ai/engines/biz-engine";

export const bizController = {
  analyze: async (req: Request, res: Response) => {
    try {
      const result = await BizEngine.analyze(req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }
};

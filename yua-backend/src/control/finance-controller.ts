// 📂 src/controllers/finance-controller.ts
// 🔥 FinanceController — YUA ONE 금융 분석 API

import { Request, Response } from "express";
import { FinanceEngine } from "../ai/engines/finance-engine";

export const financeController = {
  analyze: async (req: Request, res: Response) => {
    try {
      const result = await FinanceEngine.analyze(req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }
};

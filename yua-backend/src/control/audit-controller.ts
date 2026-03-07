// 📂 src/controllers/audit-controller.ts
// 🔥 AuditController — FINAL

import { Request, Response } from "express";
import { AuditEngine } from "../ai/audit/audit-engine";

export const auditController = {
  async search(req: Request, res: Response) {
    try {
      const { query } = req.body ?? {};

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          ok: false,
          engine: "audit-error",
          error: "query 필드가 누락되었습니다.",
        });
      }

      const result = await AuditEngine.search(query);

      return res.status(200).json({
        ok: true,
        engine: "audit",
        result,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        engine: "audit-error",
        error: String(e),
      });
    }
  },
};

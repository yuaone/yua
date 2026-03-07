// 📂 src/control/hpe7.controller.ts
// ------------------------------------------------------
// HPE 7.0 — API Controller (FINAL CLEAN VERSION)
// ------------------------------------------------------

import { Request, Response } from "express";
import { runHPE7 } from "../ai/hpe/hpe7/hpe7-engine";
import { HPE7Input } from "../ai/hpe/hpe7/hpe7-protocol";

export class HPE7Controller {
  static async run(req: Request, res: Response) {
    try {
      const body = req.body ?? {};

      // HPE7Input은 "text" 1개만 필수
      const input: HPE7Input = {
        text: String(body.text ?? ""),
        sessionId: body.sessionId ?? "default"
      };

      const result = await runHPE7(input);

      return res.json({
        ok: true,
        engine: "HPE-7.0",
        result
      });

    } catch (err: any) {
      console.error("[HPE7 ERROR]", err);
      return res.status(500).json({
        ok: false,
        engine: "HPE-7.0",
        error: err?.message ?? "unknown-error"
      });
    }
  }
}

// 📂 src/routes/hpe7-router.ts
// ------------------------------------------------------
// HPE 7.0 — Router (FINAL CLEAN VERSION)
// ------------------------------------------------------

import { Router } from "express";
import { runHPE7 } from "../ai/hpe/hpe7/hpe7-engine";

export const hpe7Router = Router();

hpe7Router.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};

    const input = {
      text: String(body.text ?? ""),
      sessionId: body.sessionId ?? "default"
    };

    const result = await runHPE7(input);

    return res.json({
      ok: true,
      engine: "HPE-7.0",
      result
    });
  } catch (e: any) {
    return res.json({
      ok: false,
      engine: "HPE-7.0",
      error: e.message
    });
  }
});

import { Router } from "express";
import { runHPE7 } from "../ai/hpe/hpe7/hpe7-engine";

export const hpeRouter = Router();

// HPE 7.0 manual
hpeRouter.post("/hpe7", async (req, res) => {
  try {
    const text = String(req.body.text ?? "");

    const result = await runHPE7({
      text,
      sessionId: "hpe7-manual"
    });

    return res.json({
      ok: true,
      engine: "HPE-7.0",
      result
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      engine: "HPE-7.0",
      error: e.message
    });
  }
});

// HPE 7.0 auto
hpeRouter.post("/hpe7/auto", async (req, res) => {
  try {
    const message = String(req.body.message ?? "");

    const result = await runHPE7({
      text: message,
      sessionId: "hpe7-auto"
    });

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

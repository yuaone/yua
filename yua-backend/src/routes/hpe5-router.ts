import { Router } from "express";
import { runHPE5 } from "../ai/hpe/5/hpe5-engine";

export const hpe5Router = Router();

hpe5Router.post("/", async (req, res) => {
  try {
    const input = req.body.input ?? "";
    const result = await runHPE5(input);

    return res.json({
      ok: true,
      engine: "HPE-5.0",
      result
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

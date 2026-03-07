import { Router } from "express";
import { runHPE4 } from "../ai/hpe/4/hpe4-engine";

export const hpe4Router = Router();

hpe4Router.post("/", async (req, res) => {
  try {
    const input = req.body.input ?? "";
    const result = await runHPE4(input);

    return res.json({
      ok: true,
      engine: "HPE-4.0",
      result,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

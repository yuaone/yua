import { Router } from "express";
import { runHPE6 } from "../ai/hpe/hpe6/hpe6-engine";   // ✔ 경로 수정됨

export const hpe6Router = Router();

hpe6Router.post("/", async (req, res) => {
  try {
    const file = req.body.code ?? "";
    const fileName = req.body.file ?? "unknown";

    const output = await runHPE6(file, fileName);

    return res.json({
      ok: true,
      engine: "HPE-6.0",
      result: output
    });
  } catch (e: any) {
    return res.json({
      ok: false,
      error: e.message
    });
  }
});

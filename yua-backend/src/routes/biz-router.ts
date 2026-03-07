import { Router } from "express";
import { BizEngine } from "../ai/engines/biz-engine";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await BizEngine.analyze(req.body);
    return res.json({ ok: true, result });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Biz Error",
    });
  }
});

export default router;

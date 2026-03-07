import { Router } from "express";
import { FinanceEngine } from "../ai/engines/finance-engine";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await FinanceEngine.analyze(req.body);
    return res.json({ ok: true, result });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Finance Error",
    });
  }
});

export default router;

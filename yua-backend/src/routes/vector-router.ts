import { Router } from "express";
import { VectorEngine } from "../ai/vector/vector-engine";

const router = Router();
const engine = new VectorEngine();

router.post("/insert", async (req, res) => {
  try {
    const { id, text, meta } = req.body;
    const result = await engine.store(id, text, meta);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/search", async (req, res) => {
  try {
    const { query, limit } = req.body;
    const result = await engine.search(query, limit || 5);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;

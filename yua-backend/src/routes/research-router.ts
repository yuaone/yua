// 📂 src/routes/research-router.ts
// 🔥 Research Router — FINAL

import { Router } from "express";
import { researchController } from "../control/research-controller";

const router = Router();

// POST /api/research/analyze
router.post("/analyze", researchController.analyze);

export default router;

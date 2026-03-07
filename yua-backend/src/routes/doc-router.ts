// 📂 src/routes/doc-router.ts
// 🔥 Doc Router — FINAL

import { Router } from "express";
import { docController } from "../control/doc-controller";

const router = Router();

// POST /api/doc/generate
router.post("/generate", docController.generate);

export default router;

// 📂 src/routes/eval-router.ts
// 🔥 Eval Router — FINAL ENTERPRISE VERSION (2025.11)
// ✔ POST /api/eval/code
// ✔ evalController.analyzeCode 연결

import { Router } from "express";
import { evalController } from "../control/eval-controller";

const router = Router();

/**
 * 🧩 /api/eval/code
 */
router.post("/code", evalController.analyzeCode);

export default router;

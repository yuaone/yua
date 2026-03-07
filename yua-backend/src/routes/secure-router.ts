// 📂 src/routes/secure-router.ts
// 🔥 Secure Router — FINAL ENTERPRISE VERSION (2025.11)
// ✔ POST /api/secure/analyze
// ✔ secureController.analyze 연결

import { Router } from "express";
import { secureController } from "../control/secure-controller";

const router = Router();

/**
 * 🔐 /api/secure/analyze
 */
router.post("/analyze", secureController.analyze);

export default router;

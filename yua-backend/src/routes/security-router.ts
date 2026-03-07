// 📂 src/routes/security-router.ts
// 🔥 Security Router — FINAL

import { Router } from "express";
import { securityController } from "../control/security-controller";

const router = Router();

// POST /api/security/analyze
router.post("/analyze", securityController.analyze);

export default router;

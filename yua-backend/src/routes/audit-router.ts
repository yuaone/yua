// 📂 src/routes/audit-router.ts
// 🔥 Audit Router — FINAL

import { Router } from "express";
import { auditController } from "../control/audit-controller";

const router = Router();

// POST /api/audit/search
router.post("/search", auditController.search);

export default router;

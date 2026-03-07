// 📂 src/api/routes/document-router.ts
// 🔒 Document Router — REWRITE ONLY (SSOT)

import { Router } from "express";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { documentController } from "../control/document-controller";

const router = Router();

// 🔒 인증만 필요 (usage / limiter ❌)
router.use(requireAuthOrApiKey);

/* --------------------------------------------------
 * POST /api/document/rewrite
 * -------------------------------------------------- */
router.post("/rewrite", documentController.rewrite);

export default router;

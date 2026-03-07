// 📂 src/routes/identity-router.ts
// 🔥 Identity Router — FINAL

import { Router } from "express";
import { identityController } from "../control/identity-controller";

const router = Router();

// JWT 발급
router.post("/jwt", identityController.issueJWT);

// API Key 생성
router.post("/apikey", identityController.createApiKey);

export default router;

// 📂 src/routes/decision-router.ts
// 🔥 Decision Router — 전문가 판단 API

import { Router } from "express";
import { decisionController } from "../control/decision-controller";

const router = Router();

router.post("/judge", decisionController.judge);

export default router;

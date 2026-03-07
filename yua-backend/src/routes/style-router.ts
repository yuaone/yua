// 📂 src/routes/style-router.ts
// 🔥 Style Router — 말투 분석 엔드포인트 (2025.11 FINAL)

import { Router } from "express";
import { StyleController } from "../control/style-controller";

const router = Router();

router.post("/analyze", StyleController.analyze);

export default router;

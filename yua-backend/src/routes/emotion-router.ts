// 📂 src/routes/emotion-router.ts
// 🔥 Emotion Router — 감정 분석 엔드포인트 (2025.11 FINAL)

import { Router } from "express";
import { EmotionController } from "../control/emotion-controller";

const router = Router();

router.post("/analyze", EmotionController.analyze);

export default router;

import { Router } from "express";
import { imageController } from "../control/image-controller";

const router = Router();

/**
 * 🖼 일반 이미지 분석
 * POST /api/image/analyze
 */
router.post("/analyze", imageController.analyze);

/**
 * 🧾 사업자등록증 이미지 분석 (OCR)
 * POST /api/image/business
 */
router.post("/business", imageController.analyzeBusiness);

export default router;

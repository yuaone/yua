// 📂 src/routes/business-router.ts
// 🔥 YUA-AI Business Router (2025.11 FINAL)

import { Router } from "express";
import { BusinessOCREngine } from "../ai/business/business-ocr";
import { BusinessEngine } from "../ai/business/business-engine";

const router = Router();

/**
 * 🧾 사업자등록증 OCR
 * POST /api/business/ocr
 * { rawText: "OCR 결과 텍스트", userId: "123" }
 */
router.post("/ocr", async (req, res) => {
  try {
    const { rawText, userId } = req.body ?? {};

    if (!rawText || !userId) {
      return res.status(400).json({
        ok: false,
        error: "rawText 또는 userId 누락",
      });
    }

    const parsed = BusinessOCREngine.parse(rawText);

    return res.json({
      ok: true,
      result: parsed,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e),
    });
  }
});

/**
 * 🚀 사업자 모드 활성화
 * POST /api/business/activate
 */
router.post("/activate", async (req, res) => {
  try {
    const { userId, profile } = req.body ?? {};

    if (!userId || !profile) {
      return res.status(400).json({
        ok: false,
        error: "userId 또는 profile 누락",
      });
    }

    await BusinessEngine.saveProfile(userId, profile);

    return res.json({
      ok: true,
      message: "사업자 모드 활성화 완료",
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e),
    });
  }
});

/**
 * 📌 사업자 모드 상태 조회
 * GET /api/business/status/:userId
 */
router.get("/status/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const profile = await BusinessEngine.getStatus(userId);

    return res.json({
      ok: true,
      profile,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e),
    });
  }
});

export default router;

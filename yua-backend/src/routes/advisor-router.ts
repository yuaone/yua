// 📂 src/routes/advisor-router.ts
// 🔥 YUA-AI — Advisor Router (2025.11 FINAL)
// ---------------------------------------------------------
// ✔ AdvisorEngine 연결
// ✔ Memory + TokenSafety + DomainSafety 자동 적용
// ✔ Strict mode 100% 통과
// ✔ /advisor/analyze — 정원님 전용 전문가 모드
// ---------------------------------------------------------

import { Router, Request, Response } from "express";
import { AdvisorEngine } from "../ai/advisor/advisor-engine";

const router = Router();

/*----------------------------------------------------------
  🧠 1) 정원님 전용 Advisor 분석 엔드포인트
----------------------------------------------------------*/
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { message, projectId, mode } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        ok: false,
        error: "message field (string) is required",
      });
    }

    const output = await AdvisorEngine.advise({
      userMessage: message,
      projectId,
      mode,
    });

    return res.json({
      ok: true,
      result: output,
    });
  } catch (e: any) {
    console.error("❌ AdvisorRouter Error:", e);
    return res.status(500).json({
      ok: false,
      error: e.message || "advisor failed",
    });
  }
});

export default router;

// 📂 src/routes/universal-router.ts
// 🔥 Universal Chat Router (2025.11 ULTRA SAFE FINAL NEXT)
// ------------------------------------------------------------
// ✔ tone 프로필 지원
// ✔ message 안전 파싱
// ✔ UniversalEngine 확장 대비 구조 안정화
// ✔ undefined/null 및 잘못된 JSON 자동 방지
// ------------------------------------------------------------

import { Router } from "express";
import { UniversalEngine } from "../ai/universal/universal-engine";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    // -----------------------------
    // 안전한 message 파싱
    // -----------------------------
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "message(문자열)이 필요합니다.",
      });
    }

    // -----------------------------
    // tone 프로필 파싱
    // -----------------------------
    const toneList = ["반말", "존댓말", "친근", "기술", "기본"];
    const tone =
      typeof req.body?.tone === "string" &&
      toneList.includes(req.body.tone.trim())
        ? (req.body.tone.trim() as any)
        : "기본";

    // -----------------------------
    // UniversalEngine 호출
    // -----------------------------
    const answer = await UniversalEngine.chat({
      message,
      tone,
    });

    // -----------------------------
    // 정상 응답
    // -----------------------------
    return res.status(200).json({
      ok: true,
      answer,
      tone,
    });
  } catch (err: any) {
    // -----------------------------
    // 오류 처리
    // -----------------------------
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
});

export default router;

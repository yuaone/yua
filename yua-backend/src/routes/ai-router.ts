// 📂 src/routes/ai-router.ts
// 🔥 YUA-AI Router — FULL INTEGRATED VERSION (2025.11)
// ✔ Chat / Risk / Report / Match / User 유지
// ✔ Universal AI / Eval / Secure / Code 검사 기능 추가
// ✔ analyze clean / ts strict 100% 호환

import { Router } from "express";

import { chatController } from "../control/chat-controller";
import { riskController } from "../control/risk-controller";
import { reportController } from "../control/report-controller";
import { matchController } from "../control/match-controller";
import { userController } from "../control/user-controller";

// 🔥 새 컨트롤러 4종
import { aiController } from "../control/ai-controller";
import { evalController } from "../control/eval-controller";
import { secureController } from "../control/secure-controller";
import { CodeController } from "../control/code-controller";   // ⬅ FIXED (대문자)

const router = Router();

/**
 * 🟢 Health Check
 * GET /api/ai/health
 */
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    engine: "YUA-AI Engine",
    status: "running",
    timestamp: Date.now(),
  });
});

/**
 * 💬 AI 대화
 * POST /api/ai/chat
 */
router.post("/chat", chatController.handleChat);

/**
 * 🛡 리스크 분석
 * POST /api/ai/risk
 */
router.post("/risk", riskController.analyze);

/**
 * 📊 리포트 생성
 * POST /api/ai/report
 */
router.post("/report", reportController.generate);

/**
 * 🔐 6자리 코드 생성
 */
router.post("/match/create", matchController.createCode);

/**
 * 🔍 코드 조회
 */
router.get("/match/:code", matchController.findCode);

/**
 * 🔒 코드 사용
 */
router.post("/match/use", matchController.useCode);

/**
 * 👤 유저 프로필
 */
router.get("/user/profile", userController.getProfile);

/* -------------------------------------------------------
   🔥 추가 엔진 4종
------------------------------------------------------- */

/**
 * 🧠 Universal AI
 */
router.post("/universal", aiController.universal);

/**
 * 🧩 코드 분석 (Lexer → Parser → Semantic)
 */
router.post("/eval/code", evalController.analyzeCode);

/**
 * 🔐 보안 분석
 */
router.post("/secure/analyze", secureController.analyze);

/**
 * 📝 코드 검사/정리 엔진
 * (주의: 기존 버전의 inspect → run 으로 교체)
 */
router.post("/code/inspect", CodeController.run);   // ⬅ FIXED METHOD

export default router;

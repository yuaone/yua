// 📂 src/routes/risk-router.ts
// 🔥 YUA-AI Risk Router — FINAL VERSION
// ✔ RiskEngine + TradeEngine 통합 분석 라우팅
// ✔ POST /api/risk
// ✔ analyze clean / ts strict 완전 호환

import { Router } from "express";
import { riskController } from "../control/risk-controller";

const router = Router();

/**
 * 🛡 리스크 분석
 * POST /api/risk
 * - RiskEngine: 텍스트 기반 리스크 점수
 * - TradeEngine: 내부거래 탐지
 * - warnings: AI/룰 기반 위험 알림
 */
router.post("/", riskController.analyze);

/**
 * 📌 (향후 확장 포인트)
 * GET /api/risk/history
 * GET /api/risk/user/:userId
 *
 * router.get("/history", riskController.history);
 * router.get("/user/:userId", riskController.userRiskSummary);
 */

export default router;

// 📂 src/routes/match-router.ts
// 🔥 YUA-AI Match Router — FINAL VERSION
// ✔ 6자리 코드 생성
// ✔ 코드 조회
// ✔ 코드 사용 처리
// ✔ analyze clean / ts strict 호환

import { Router } from "express";
import { matchController } from "../control/match-controller";

const router = Router();

/**
 * 🔐 코드 생성 (유저 → 전문가 연결)
 * POST /api/match
 */
router.post("/", matchController.createCode);

/**
 * 🔒 코드 사용 처리
 * POST /api/match/use
 */
router.post("/use", matchController.useCode);

/**
 * 🔍 코드 조회 (전문가 포털)
 * GET /api/match/:code
 */
router.get("/:code", matchController.findCode);

export default router;

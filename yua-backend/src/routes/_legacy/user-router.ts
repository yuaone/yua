// 📂 src/routes/user-router.ts
// 🔥 YUA-AI User Router — FINAL VERSION
// ✔ GET /api/user/profile
// ✔ Query/Body 기반 userId 처리
// ✔ analyze clean / ts strict 완전 호환

import { Router } from "express";
import { userController } from "../control/user-controller";

const router = Router();

/**
 * 👤 사용자 프로필 조회
 * GET /api/user/profile?userId=123
 */
router.get("/profile", userController.getProfile);

/**
 * 📌 (향후 확장 포인트)
 *
 * router.get("/:userId/history", userController.getHistory);
 * router.put("/:userId/update", userController.updateProfile);
 */

export default router;

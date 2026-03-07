// 📂 src/routes/control-router.ts
// 🔒 YUA Control Router — SSOT FINAL (ADMIN + TELEMETRY)

import { Router } from "express";
import { adminAuth } from "../middleware/admin-auth";
import { ControlController } from "../control/control-controller";
import { suggestionFeedbackController } from "../control/suggestion-feedback.controller";

const router = Router();
console.log("[ROUTER] control-router loaded");
/* ==================================================
 * 🔐 ADMIN CONTROL (STRICT)
 * - 운영 / 보안 / 긴급 제어
 * - adminAuth 필수
================================================== */

router.get(
  "/snapshot",
  adminAuth,
  ControlController.getSnapshot
);

router.post(
  "/ban-ip",
  adminAuth,
  ControlController.banIP
);

router.post(
  "/kill-token",
  adminAuth,
  ControlController.killToken
);

router.post(
  "/lockdown",
  adminAuth,
  ControlController.lockdown
);

/* ==================================================
 * 📊 SUGGESTION FEEDBACK (TELEMETRY ONLY)
 * - 👍 / 👎 / dismiss
 * - 판단 ❌ / 제어 ❌ / 학습 직접 ❌
 * - FlowAggregationService 입력 전용
 * - adminAuth ❌ (일반 사용자 이벤트)
================================================== */

router.post(
  "/suggestion/feedback",
  suggestionFeedbackController.submit
);

router.get(
  "/suggestion/feedback",
  suggestionFeedbackController.list
);

export default router;

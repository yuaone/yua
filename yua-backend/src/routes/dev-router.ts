// 📂 src/routes/dev-router.ts
// 🔥 YUA-AI Developer Console Router — FINAL ENTERPRISE VERSION
// ✔ Developer Console 전체 기능 라우팅
// ✔ SuperAdmin / 기업개발팀 공용 API
// ✔ strict mode 100% 통과

import { Router } from "express";

// Developer Controllers
import { DevAuthController } from "../control/dev-auth-controller";
import { DevApiKeyController } from "../control/dev-apikey-controller";
import { DevUsageController } from "../control/dev-usage-controller";
import { DevAiTestController } from "../control/dev-ai-test-controller";

// MatchEngine 공개 테스트용 (선택)
import { MatchEngineController } from "../control/dev-match-controller";

export const DevRouter = Router();

/**
 * -------------------------------------------------------
 *  🔥 Developer Console API 전체 라우팅
 *  /dev/auth/*
 *  /dev/apikey/*
 *  /dev/usage/*
 *  /dev/ai/*
 *  /dev/match/*
 * -------------------------------------------------------
 */

// 인증/로그인
DevRouter.use(DevAuthController);

// API Key 관리
DevRouter.use(DevApiKeyController);

// API Key 사용량 조회
DevRouter.use(DevUsageController);

// AI 테스트 엔진 (Chat / Risk / Report / Math)
DevRouter.use(DevAiTestController);

// Match Engine (선택)
if (MatchEngineController) {
  DevRouter.use(MatchEngineController);
}

// 🔍 연결 확인용
DevRouter.get("/dev/ping", (req, res) => {
  return res.json({
    ok: true,
    engine: "YUA-AI Developer Router",
    status: "connected",
    timestamp: Date.now(),
  });
});

export default DevRouter;

// 📂 src/routes/engine-router.ts
import { Router } from "express";
import { EngineController } from "../control/engine-controller";
import { aiEngineLimiter } from "../middleware/engine-limiter";  // ✔ 올바른 이름

const router = Router();

// 엔진 상태
router.get("/status", EngineController.status);

// 메모리 리셋
router.post("/memory-reset", EngineController.memoryReset);

// 엔진 모드 변경
router.post("/mode", EngineController.setMode);

// -------------------------------------------------------------
// 핵심 FIX ★
// 모든 실행 라우트에 aiEngineLimiter 적용
// -------------------------------------------------------------
router.post("/run", aiEngineLimiter, EngineController.run);

router.post("/spine", aiEngineLimiter, EngineController.spine);

router.get("/spine-stream", aiEngineLimiter, EngineController.spineStream);

export default router;

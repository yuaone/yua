// 📂 src/routes/me-router.ts
import { Router } from "express";
import { getMeController, postMeController } from "../control/me-controller";

import { withWorkspace } from "../middleware/with-workspace";
import { requireFirebaseAuth } from "../auth/auth.express";

const router = Router();

// ✅ 1) /me는 "인증"이 먼저다. (req.user 세팅)
router.use(requireFirebaseAuth);

// ✅ 2) /me 본체는 workspace를 만들 수도 있으니 withWorkspace를 강제하지 않는다.
router.get("/", getMeController);
router.post("/", postMeController);
/**
 * GET /me/personalization
 * POST /me/personalization
 */
router.use(withWorkspace);

export default router;

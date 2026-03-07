import { Router } from "express";
import { assistantController } from "../../control/yua/assistant-controller";

const router = Router();

/**
 * Assistant Mode — 구조화 응답 엔진
 */
router.post("/", assistantController.run);

export default router;

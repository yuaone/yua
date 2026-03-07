import { Router } from "express";
import { devController } from "../../control/yua/dev-controller";

const router = Router();

/**
 * Developer Mode — 확장 컨텍스트 + Dev Engine
 */
router.post("/", devController.run);

export default router;

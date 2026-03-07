// 📂 src/routes/yua/basic-router.ts
import { Router } from "express";
import { basicController } from "../../control/yua/basic-controller";

const router = Router();

/** 
 * YUA Basic Mode 
 * POST /api/ai/basic
 */
router.post("/", basicController.run);

export default router;

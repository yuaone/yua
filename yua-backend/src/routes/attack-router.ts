// 📂 src/routes/attack-router.ts

import { Router } from "express";
import { AttackController } from "../control/attack-controller";
import { adminAuth } from "../middleware/admin-auth";

const router = Router();

// 관리자만 접근 가능
router.get("/list", adminAuth, AttackController.list);
router.get("/stats", adminAuth, AttackController.stats);

export default router;

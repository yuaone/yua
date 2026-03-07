// 🔥 Agent Router — SSOT FINAL

import { Router } from "express";
import { agentController } from "../control/agent-controller";

const router = Router();

/**
 * POST /agent/run
 * {
 *   instanceId: string,
 *   message: string,
 *   context?: any
 * }
 */
router.post("/run", agentController.run);

export default router;

import { Router } from "express";
import { assetController } from "../control/asset-controller";
import { validateAssetExecution } from "../api/middleware/validate-asset-execution";

const router = Router();

/* --------------------------------------------------
 * Asset Pipeline
 * -------------------------------------------------- */

// Planner
router.post("/plan", assetController.plan);

// Judge
router.post("/judge", assetController.judge);

// Execute
// 🔥 여기만 validate 붙이면 끝
router.post(
  "/execute",
  validateAssetExecution,
  assetController.execute
);

export default router;

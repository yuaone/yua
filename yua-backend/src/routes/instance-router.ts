// 📂 src/routes/instance-router.ts
import { Router } from "express";
import { requireFirebaseAuth } from "../middleware/firebase-auth-middleware";
import { requireInstanceAccess } from "../middleware/instance-access-middleware";
import { recordInstanceHistory } from "../middleware/instance-audit-middleware";

import {
  checkInstanceController,
  restartInstanceController,
  deployInstanceController,
} from "../control/instance-console-controller";

const router = Router();

router.get(
  "/check",
  requireFirebaseAuth,
  requireInstanceAccess,
  checkInstanceController
);

router.post(
  "/restart",
  requireFirebaseAuth,
  requireInstanceAccess,
  recordInstanceHistory("restart"),
  restartInstanceController
);

router.post(
  "/deploy",
  requireFirebaseAuth,
  requireInstanceAccess,
  recordInstanceHistory("deploy"),
  deployInstanceController
);

export default router;

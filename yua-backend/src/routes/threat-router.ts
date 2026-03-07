// 📂 src/routes/threat-router.ts
// Threat Router FINAL

import { Router } from "express";
import { ThreatController } from "../control/threat-controller";

const router = Router();

router.post("/check", ThreatController.check);
router.get("/patterns", ThreatController.listPatterns);
router.post("/patterns/add", ThreatController.addPattern);

export default router;

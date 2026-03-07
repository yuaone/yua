// 📂 src/routes/reasoning-router.ts
// 🔥 Reasoning Router — FINAL

import { Router } from "express";
import { ReasoningController } from "../control/reasoning-controller";

const router = Router();

router.post("/analyze", ReasoningController.analyze);

export default router;

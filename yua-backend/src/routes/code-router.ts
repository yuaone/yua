// 📂 src/routes/code-router.ts
// 🔥 CodeRouter — FINAL VERSION

import { Router } from "express";
import { CodeController } from "../control/code-controller";

const router = Router();

router.post("/run", CodeController.run);

export default router;

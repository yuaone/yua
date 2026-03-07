// 📂 src/routes/compress-router.ts

import { Router } from "express";
import { compressController } from "../control/compress-controller";

const router = Router();

// POST /api/compress
router.post("/", compressController.run);

export default router;

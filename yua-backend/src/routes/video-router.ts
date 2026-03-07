// 📂 src/routes/video-router.ts
import { Router } from "express";
import { videoController } from "../control/video-controller";

const router = Router();

router.post("/analyze", videoController.analyze);

export default router;

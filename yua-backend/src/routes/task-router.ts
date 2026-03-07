// 📂 src/routes/task-router.ts
import { Router } from "express";
import { taskController } from "../control/task-controller";

const router = Router();

router.post("/add", taskController.add);
router.post("/remove", taskController.remove);

export default router;

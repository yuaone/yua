// 📂 src/routes/workflow-router.ts
// 🔥 YUA-AI — Workflow Router FINAL UNIFIED (2025.11)

import { Router } from "express";
import { workflowController } from "../control/workflow-controller";

const router = Router();

// -------------------------------------------------------
// 🟣 1) Workflow 저장
// -------------------------------------------------------
router.post("/save", workflowController.save);

// -------------------------------------------------------
// 🟣 2) Workflow 리스트
// -------------------------------------------------------
router.get("/list", workflowController.list);

// -------------------------------------------------------
// 🟣 3) Workflow 단일 조회
// -------------------------------------------------------
router.get("/get/:id", workflowController.get);

// -------------------------------------------------------
// 🟦 4) Flow 실행
// -------------------------------------------------------
router.post("/run-flow", workflowController.runFlow);

// -------------------------------------------------------
// 🗑 5) 삭제
// -------------------------------------------------------
router.delete("/delete/:id", workflowController.delete);

export default router;

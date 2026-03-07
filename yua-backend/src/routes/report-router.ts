// 📂 src/routes/report-router.ts
// 🔥 YUA-AI Report Router — FINAL VERSION (with Solar support)
// ✔ 기존 구조 100% 유지
// ✔ Solar template 조건만 추가
// ✔ analyze clean / ts strict 완전 호환

import { Router } from "express";
import { reportController } from "../control/report-controller";

const router = Router();

/**
 * 📊 AI 리포트 생성
 * POST /api/report
 *
 * 🔥 추가:
 * - Solar 도메인(template: "solar") 요청일 때 컨트롤러가 자동 분기
 * - 여기서는 타입 검증 1줄만 추가하면 충분함
 */
router.post("/", (req, res, next) => {
  const body = req.body ?? {};

  // ⭐ Solar 요청 검증 (template: "solar")
  if (body.template && body.template === "solar") {
    // Solar 전용 요청은 controller.generate 로 넘기기만 하면 됨
    return reportController.generate(req, res);
  }

  // 기존 모든 리포트 그대로 처리
  return reportController.generate(req, res);
});

/**
 * 📌 (확장 예정) 추후 리포트 이력 조회 등 지원 가능
 * GET /api/report/:reportId
 *
 * router.get("/:reportId", reportController.getOne);
 */

export default router;

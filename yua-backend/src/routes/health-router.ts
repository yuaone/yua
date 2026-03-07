// 📂 src/routes/health-router.ts
// 🔥 YUA-AI Health Router — FINAL VERSION
// ✔ 서버 정상 작동 여부
// ✔ 엔진 버전/환경 정보
// ✔ Swagger 문서 자동 표시

import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint for YUA ONE Engine
 *     description: Returns engine version, status, timestamp, and environment info.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is running normally
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 engine:
 *                   type: string
 *                   example: YUA-ENGINE
 *                 version:
 *                   type: string
 *                   example: "2025.11"
 *                 status:
 *                   type: string
 *                   example: running
 *                 environment:
 *                   type: string
 *                   example: development
 *                 timestamp:
 *                   type: string
 *                   example: "2025-12-03T12:34:56.789Z"
 */

router.get("/", (req, res) => {
  res.json({
    ok: true,
    engine: "YUA-ENGINE",
    version: "2025.11",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

export default router;

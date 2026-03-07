// 📂 src/middleware/audit-log.ts
// 🔥 Production-Grade Audit Log Middleware (2025.11 STRICT FIXED)
// -----------------------------------------------------------------------
// ✔ 모든 TS 오류 제거
// ✔ req/res/next 타입 명시
// ✔ err 안전 처리
// ✔ 기능 100% 동일 유지
// -----------------------------------------------------------------------

import { Request, Response, NextFunction } from "express";
import { pool } from "../db/mysql";
import { randomUUID } from "crypto";

export async function auditLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const start = Date.now();

  const route: string = req.originalUrl || "";
  const method: string = req.method || "UNKNOWN";

  const ip: string =
    (req.headers["x-forwarded-for"] as string) ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown";

  const userAgent: string =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"].slice(0, 200)
      : "unknown";

  const requestId = randomUUID();

  res.on("finish", async () => {
    try {
      const latencyMs = Date.now() - start;
      const status = res.statusCode;

      // Bot / 스캐너 탐지
      const isBot =
        /bot|crawler|spider|curl|wget|python|scraper/i.test(userAgent);

      // 민감 데이터 마스킹
      const maskedQuery = JSON.stringify(req.query || {}).replace(
        /(token|key|password|pwd)["']?\s*:\s*["']?([^"']+)/gi,
        '$1:"***MASKED***"'
      );

      await pool.query(
        `
        INSERT INTO audit_logs
          (request_id, route, method, status, ip, user_agent, query, latency_ms, is_bot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          requestId,
          route,
          method,
          status,
          ip,
          userAgent,
          maskedQuery,
          latencyMs,
          isBot ? 1 : 0,
        ]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Audit Log Error:", message);
    }
  });

  next();
}

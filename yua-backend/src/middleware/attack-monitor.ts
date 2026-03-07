// 📂 src/middleware/attack-monitor.ts
// 🔥 Real-Time Attack Monitor Middleware — FINAL ENTERPRISE VERSION

import { Request, Response, NextFunction } from "express";
import { AttackDetector } from "../ai/security/attack-detector";

export async function attackMonitor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.connection.remoteAddress ||
    req.ip;

  // 📌 응답이 끝난 후에 공격 분석 실행 — 성능 최적화
  res.on("finish", async () => {
    try {
      await AttackDetector.detect({
        ip: String(ip),
        route: req.originalUrl,
        method: req.method,
        userAgent: String(req.headers["user-agent"] || ""),
        status: res.statusCode,
        extra: {
          body:
            typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body || {}),
        },
      });
    } catch (err) {
      console.error("[AttackMonitor] Detect Error:", err);
    }
  });

  next();
}

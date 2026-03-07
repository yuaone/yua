// 📂 src/middleware/admin-auth.ts
// 🔥 Production-Grade Admin Auth Middleware (2025.11)

import { Request, Response, NextFunction } from "express";
import { AuditEngine } from "../ai/audit/audit-engine";

// 선택 기능: 특정 IP만 허용
const ADMIN_IP_WHITELIST = (process.env.ADMIN_ALLOW_IPS || "")
  .split(",")
  .map((i) => i.trim())
  .filter(Boolean);

export function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const key = req.headers["x-admin-key"];
    const remoteIp =
      (req.headers["x-forwarded-for"] as string) ||
      req.connection.remoteAddress ||
      req.ip;

    // -------------------------------------------------------------
    // 1) 관리자 KEY 체크
    // -------------------------------------------------------------
    if (!key) {
      AuditEngine.record({
        route: "/middleware/admin-auth",
        method: "BLOCK",
        userId: 0,
        ip: String(remoteIp),
        requestData: { reason: "NO_KEY" },
        responseData: { blocked: true }
      });

      return res.status(401).json({
        ok: false,
        error: "Missing Admin Key",
      });
    }

    // -------------------------------------------------------------
    // 2) Key 검증
    // -------------------------------------------------------------
    if (key !== process.env.SUPERADMIN_KEY) {
      AuditEngine.record({
        route: "/middleware/admin-auth",
        method: "BLOCK",
        userId: 0,
        ip: String(remoteIp),
        requestData: { reason: "INVALID_KEY", attempt: String(key) },
        responseData: { blocked: true }
      });

      return res.status(403).json({
        ok: false,
        error: "Invalid Admin Credentials",
      });
    }

    // -------------------------------------------------------------
    // 3) IP 화이트리스트
    // -------------------------------------------------------------
    if (ADMIN_IP_WHITELIST.length > 0) {
      const allowed = ADMIN_IP_WHITELIST.includes(String(remoteIp));

      if (!allowed) {
        AuditEngine.record({
          route: "/middleware/admin-auth",
          method: "BLOCK",
          userId: 0,
          ip: String(remoteIp),
          requestData: { reason: "IP_NOT_ALLOWED" },
          responseData: { blocked: true }
        });

        return res.status(403).json({
          ok: false,
          error: "IP Not Allowed",
        });
      }
    }

    // -------------------------------------------------------------
    // 4) 성공 기록
    // -------------------------------------------------------------
    AuditEngine.record({
      route: "/middleware/admin-auth",
      method: "ALLOW",
      userId: 0,
      ip: String(remoteIp),
      requestData: { success: true },
      responseData: { ok: true }
    });

    next();
  } catch (err: unknown) {
    // 안전한 에러 메시지 처리
    const message =
      err instanceof Error ? err.message : String(err);

    // -------------------------------------------------------------
    // 5) 실패 로그 기록
    // -------------------------------------------------------------
    AuditEngine.record({
      route: "/middleware/admin-auth",
      method: "ERROR",
      userId: 0,
      ip: String(req.ip),
      requestData: {},
      responseData: { error: message }
    });

    return res.status(500).json({
      ok: false,
      error: "AdminAuth Internal Error",
    });
  }
}

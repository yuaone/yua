// 📂 src/middleware/owner-mode-guard.ts
// 🔥 Owner Mode Guard — ENTERPRISE FINAL BUILD (2025.12)

import { Request, Response, NextFunction } from "express";
import { query } from "../db/db-wrapper";

export async function ownerModeGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1) Level1 인증 확인
    if (!(req as any).ownerLevel1) {
      return res.status(401).json({
        ok: false,
        engine: "owner-guard",
        error: "Level1 authentication required",
      });
    }

    // 2) Token 존재 여부
    const token = req.headers["x-owner-token"];
    if (!token || typeof token !== "string") {
      return res.status(401).json({
        ok: false,
        engine: "owner-guard",
        error: "Owner token required",
      });
    }

    // 3) DB 조회
    const rows = await query(
      `
      SELECT token, expires_at
      FROM owner_tokens
      WHERE token = ?
      LIMIT 1
      `,
      [token]
    );

    // ⭐ SAFE TYPE GUARD (MySQL/PostgreSQL 모두 커버)
    const isRowArray =
      Array.isArray(rows) &&
      rows.length > 0 &&
      typeof rows[0] === "object" &&
      rows[0] !== null;

    if (!isRowArray) {
      return res.status(401).json({
        ok: false,
        engine: "owner-guard",
        error: "Invalid token",
      });
    }

    // TS 안전하게 타입 단언
    const record = rows[0] as {
      token: string;
      expires_at: string | number | Date;
    };

    // expires_at 숫자 변환
    const expiresAt =
      typeof record.expires_at === "number"
        ? record.expires_at
        : new Date(record.expires_at).getTime();

    if (expiresAt < Date.now()) {
      return res.status(401).json({
        ok: false,
        engine: "owner-guard",
        error: "Token expired",
      });
    }

    (req as any).ownerMode = true;
    next();
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      engine: "owner-guard-fatal",
      error: e?.message ?? "Unknown Owner Guard Error",
    });
  }
}

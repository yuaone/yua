// 📂 src/middleware/owner-auth.ts
// 🔥 Owner Mode Auth — Level 1 (Secret Key Verification) — FINAL

import { Request, Response, NextFunction } from "express";

// ⚠️ 환경변수 기반 Secret Key (필수)
const OWNER_SECRET = process.env.OWNER_SECRET_KEY || "LOCAL_OWNER_KEY";

export function ownerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const provided = req.headers["x-owner-key"];

    if (!provided || typeof provided !== "string") {
      return res.status(401).json({
        ok: false,
        engine: "owner-auth",
        error: "OWNER KEY required",
      });
    }

    // Secret Key 1차 검증
    if (provided !== OWNER_SECRET) {
      return res.status(401).json({
        ok: false,
        engine: "owner-auth",
        error: "Invalid OWNER KEY",
      });
    }

    // 인증 성공 → Level1 플래그 세팅
    (req as any).ownerLevel1 = true;
    return next();
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      engine: "owner-auth-fatal",
      error: e?.message ?? "Unknown owner-auth error",
    });
  }
}

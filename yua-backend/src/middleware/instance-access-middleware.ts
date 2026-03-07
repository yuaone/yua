// 📂 src/middleware/instance-access-middleware.ts
// 🔐 Instance Ownership Guard (DB-Authoritative) — FINAL SSOT

import { Request, Response, NextFunction } from "express";
import { db } from "../db/mysql";

/* =========================
   Types
========================= */

export interface InstanceContext {
  id: string;
  status: string;
}

/**
 * ✅ SSOT
 * - Express.Request는 express.d.ts에서 이미 확장됨
 * - 우리는 instance만 추가
 */
export type InstanceAuthedRequest = Request & {
  instance?: InstanceContext;
};

/* =========================
   Middleware
========================= */

export async function requireInstanceAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const r = req as InstanceAuthedRequest;

  try {
    /* --------------------------------------
       1) Firebase Auth 결과 확인
       - req.user는 express.d.ts에서 보장됨
    -------------------------------------- */
    if (!r.user?.firebaseUid) {
      return res.status(401).json({
        ok: false,
        error: "unauthorized",
        message: "Firebase auth missing",
      });
    }

    /* --------------------------------------
       2) instance_id 추출 (통일 규칙)
    -------------------------------------- */
    const instanceId =
      r.params?.instance_id ??
      r.body?.instance_id ??
      r.query?.instance_id;

    if (!instanceId || typeof instanceId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "missing_instance_id",
      });
    }

    /* --------------------------------------
       3) 유저 조회 (DB SSOT)
    -------------------------------------- */
    const [[user]]: any = await db.query(
      `SELECT id FROM users WHERE firebase_uid = ? LIMIT 1`,
      [r.user.firebaseUid]
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "user_not_found",
      });
    }

    /* --------------------------------------
       4) 인스턴스 소유권 검증
    -------------------------------------- */
    const [[instance]]: any = await db.query(
      `
      SELECT id, status
      FROM engine_instances
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [instanceId, user.id]
    );

    if (!instance) {
      return res.status(403).json({
        ok: false,
        error: "instance_access_denied",
      });
    }

    /* --------------------------------------
       5) Context 주입
    -------------------------------------- */
    r.instance = {
      id: instance.id,
      status: instance.status,
    };

    next();
  } catch (err) {
    console.error("Instance Access Error:", err);
    return res.status(500).json({
      ok: false,
      error: "instance_access_error",
    });
  }
}

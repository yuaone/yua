import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { pgPool } from "../db/postgres";
import { logError } from "../utils/logger";
import type { AdminRole } from "./admin-rbac";

export interface AdminContext {
  id: number;
  email: string;
  role: AdminRole;
  session_id: number;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminContext;
    }
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Validates admin session from Authorization: Bearer <session-token>
 */
export async function validateAdminSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Admin session token required" });
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  try {
    const { rows } = await pgPool.query<{
      session_id: number;
      admin_id: number;
      email: string;
      role: AdminRole;
      expires_at: Date;
    }>(
      `SELECT s.id AS session_id, s.admin_id, u.email, u.role, s.expires_at
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token_hash = $1 AND u.is_active = true
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Invalid or expired admin session" });
    }

    const session = rows[0];
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ ok: false, error: "Admin session expired" });
    }

    req.admin = {
      id: session.admin_id,
      email: session.email,
      role: session.role,
      session_id: session.session_id,
    };

    next();
  } catch (err) {
    logError("[admin-session] Validation error:", (err as Error).message);
    return res.status(500).json({ ok: false, error: "Internal auth error" });
  }
}

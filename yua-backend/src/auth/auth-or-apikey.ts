// 📂 src/auth/auth-or-apikey.ts
// 🔐 Firebase OR x-api-key 인증 (SSOT FINAL)

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getUserFromExpressRequest } from "./auth.express";
import { mysqlPool } from "../db/mysql";
import { pgPool } from "../db/postgres";

export async function requireAuthOrApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  /* ======================================================
     1️⃣ Firebase 인증
  ====================================================== */
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const fbUser = await getUserFromExpressRequest(req);

      if (!fbUser) {
        res.status(401).json({ ok: false, error: "invalid_firebase_token" });
        return;
      }

      // ✅ SSOT: Express.User는 userId + id(alias) 둘 다 필요
      req.user = {
        userId: fbUser.userId,
        id: fbUser.userId, // ✅ alias
        email: fbUser.email ?? null,
        firebaseUid: fbUser.firebaseUid,
        name: fbUser.name ?? "Firebase User",
        role: fbUser.role ?? "user",
      };

      next();
      return;
    } catch {
      res.status(401).json({ ok: false, error: "invalid_firebase_token" });
      return;
    }
  }

  /* ======================================================
     2️⃣ API Key 인증
  ====================================================== */
  const apiKey =
    (req.headers["x-api-key"] as string | undefined)?.trim() ??
    (req.headers["x-api-key".toUpperCase()] as string | undefined)?.trim();

  if (!apiKey) {
    res.status(401).json({ ok: false, error: "authorization_required" });
    return;
  }

  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  try {
    const [rows]: any = await mysqlPool.query(
      `
      SELECT ak.user_id, ak.plan_id, u.email, u.name
      FROM api_keys_v2 ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = ?
        AND ak.active = 1
      LIMIT 1
      `,
      [apiKeyHash]
    );

    const row = rows?.[0];
    if (row) {
      const userId = Number(row.user_id);

      // ✅ SSOT: Express.User shape 충족
      req.user = {
        userId,
        id: userId, // ✅ alias
        email: row.email ?? null,
        firebaseUid: "api_key",
        name: row.name ?? "API Key User",
        role: "user",
      };

      next();
      return;
    }

    /* ======================================================
       2️⃣-b PostgreSQL platform_api_keys fallback (yua_sk_... keys)
    ====================================================== */
    const pgResult = await pgPool.query(
      `SELECT id, workspace_id, user_id, name, status
       FROM platform_api_keys
       WHERE key_hash = $1
         AND status = 'active'
       LIMIT 1`,
      [apiKeyHash]
    );

    const platformKey = pgResult.rows?.[0];
    if (!platformKey) {
      res.status(401).json({ ok: false, error: "invalid_api_key" });
      return;
    }

    const platformUserId = Number(platformKey.user_id);
    const platformWorkspaceId = Number(platformKey.workspace_id);

    // Look up user email/name from MySQL users table
    let userEmail: string | null = null;
    let userName: string = "Platform API Key User";
    try {
      const [userRows]: any = await mysqlPool.query(
        `SELECT email, name FROM users WHERE id = ? LIMIT 1`,
        [platformUserId]
      );
      if (userRows?.[0]) {
        userEmail = userRows[0].email ?? null;
        userName = userRows[0].name ?? "Platform API Key User";
      }
    } catch (userErr) {
      console.warn("[AUTH][PLATFORM_KEY] Failed to look up user info:", userErr);
    }

    // ✅ Set req.user with platform key context
    req.user = {
      userId: platformUserId,
      id: platformUserId,
      email: userEmail,
      firebaseUid: "platform_api_key",
      name: userName,
      role: "user",
    };

    // Set workspace context so withWorkspace middleware picks it up
    req.headers["x-workspace-id"] = String(platformWorkspaceId);

    // Fire-and-forget: update last_used_at
    pgPool
      .query(
        `UPDATE platform_api_keys SET last_used_at = NOW() WHERE id = $1`,
        [platformKey.id]
      )
      .catch((e: any) =>
        console.warn("[AUTH][PLATFORM_KEY] Failed to update last_used_at:", e)
      );

    next();
    return;
  } catch (err) {
    console.error("[AUTH][API_KEY]", err);
    res.status(500).json({ ok: false, error: "api_key_auth_failed" });
    return;
  }
}

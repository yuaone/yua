// 📂 src/ai/identity/identity-engine.ts
// 🔥 IdentityEngine — ENTERPRISE FINAL FIX (2025.11)

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../../db/db-wrapper";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("[FATAL] JWT_SECRET env var is required");

export interface JWTPayload {
  userId: string;
  role: string;
}

export const IdentityEngine = {
  // -------------------------------------------------------------------
  // JWT 발급
  // -------------------------------------------------------------------
  issueJWT(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: "12h",
    });
  },

  // -------------------------------------------------------------------
  // JWT 검증
  // -------------------------------------------------------------------
  verifyJWT(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------------
  // API Key 생성
  // -------------------------------------------------------------------
  generateApiKey(userId: string): string {
    return "yua_" + crypto.randomBytes(24).toString("hex");
  },

  // -------------------------------------------------------------------
  // API Key 저장
  // -------------------------------------------------------------------
  async saveApiKey(userId: string, apiKey: string, role = "developer") {
    await query(
      `
      INSERT INTO api_keys (user_id, api_key, role, usage_count, created_at)
      VALUES (?, ?, ?, 0, ?)
      `,
      [userId, apiKey, role, Date.now()]
    );

    return { ok: true, apiKey };
  },

  // -------------------------------------------------------------------
  // API Key 검증
  // -------------------------------------------------------------------
  async verifyApiKey(apiKey: string) {
    const result = await query(
      `SELECT * FROM api_keys WHERE api_key = ? LIMIT 1`,
      [apiKey]
    );

    // 안전한 타입 분기
    if (!Array.isArray(result)) return null;

    const rows = result as any[];

    if (!rows.length) return null;

    const keyInfo = rows[0] as any;

    // 사용량 증가
    await query(
      `UPDATE api_keys SET usage_count = usage_count + 1 WHERE api_key = ?`,
      [apiKey]
    );

    return {
      userId: keyInfo.user_id,
      role: keyInfo.role,
    };
  },

  // -------------------------------------------------------------------
  // RBAC Role 인증
  // -------------------------------------------------------------------
  authorize(requiredRoles: string[], userRole?: string): boolean {
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
  },
};

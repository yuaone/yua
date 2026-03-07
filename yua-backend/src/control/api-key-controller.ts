// 📂 src/controllers/api-key-controller.ts
// 🔥 YUA-AI API Key Controller — ENTERPRISE FINAL (2025.11)
// ✔ SHA-256 해시 기반 저장
// ✔ Prefix Stripe-style
// ✔ 키 발급 / 폐기 / 목록 조회 / 검증 완성
// ✔ usage / lastUsedAt 안전 처리

import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db/firebase";
import { errorResponse } from "../utils/error-response";

// -------------------------------------------------------------
// 🔐 SHA-256 해시
// -------------------------------------------------------------
function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// -------------------------------------------------------------
// 🔐 Prefix (Stripe 방식)
// -------------------------------------------------------------
function maskKey(key: string) {
  return `${key.slice(0, 10)}****${key.slice(-4)}`;
}

// -------------------------------------------------------------
// 🔐 키 생성기
// -------------------------------------------------------------
function generateApiKey() {
  const rawKey = `yua_sk_${crypto.randomBytes(32).toString("base64url")}`;
  const hashed = hashKey(rawKey);
  const prefix = maskKey(rawKey);

  return { rawKey, hashed, prefix };
}

// -------------------------------------------------------------
// Controller
// -------------------------------------------------------------
export const ApiKeyController = {
  // ---------------------------------------------------------
  // 1) Key 발급
  // ---------------------------------------------------------
  async create(req: Request, res: Response) {
    try {
      const { plan = "free" } = req.body;

      const { rawKey, hashed, prefix } = generateApiKey();

      await db.collection("api_keys").doc(hashed).set({
        apiKeyHash: hashed,
        prefix,
        plan,
        active: true,
        requestCount: 0,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });

      return res.status(200).json({
        ok: true,
        apiKey: rawKey,
        prefix,
        plan,
      });
    } catch (err: any) {
      console.error("❌ API Key Create Error:", err);
      return errorResponse(res, "create_failed", "Failed to create API key", 500);
    }
  },

  // ---------------------------------------------------------
  // 2) Key 폐기 (Revoke)
  // ---------------------------------------------------------
  async revoke(req: Request, res: Response) {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        return errorResponse(res, "missing_key", "API key is required", 400);
      }

      const hashed = hashKey(apiKey);
      const ref = db.collection("api_keys").doc(hashed);
      const snap = await ref.get();

      if (!snap.exists) {
        return errorResponse(res, "not_found", "API key not found", 404);
      }

      // 🔥 키 비활성화
      await ref.update({
        active: false,
        revokedAt: new Date().toISOString(),
      });

      // 🔥 사용량 문서도 비활성화
      await db.collection("api_usage").doc(hashed).set(
        {
          active: false,
        },
        { merge: true }
      );

      return res.status(200).json({
        ok: true,
        message: "API key revoked",
      });
    } catch (err: any) {
      console.error("❌ API Key Revoke Error:", err);
      return errorResponse(res, "revoke_failed", "Failed to revoke key", 500);
    }
  },

  // ---------------------------------------------------------
  // 3) Key 목록 반환
  // ---------------------------------------------------------
  async list(req: Request, res: Response) {
    try {
      const snapshot = await db.collection("api_keys").get();

      const keys = snapshot.docs.map((d) => {
        const data = d.data();

        return {
          prefix: data.prefix,
          active: data.active,
          plan: data.plan,
          createdAt: data.createdAt,
          requestCount: data.requestCount ?? 0,
          lastUsedAt: data.lastUsedAt ?? null,
          // ❗ hashed / 원본키 절대 노출 금지
        };
      });

      return res.status(200).json({
        ok: true,
        keys,
      });
    } catch (err: any) {
      console.error("❌ API Key List Error:", err);
      return errorResponse(res, "list_failed", "Failed to fetch key list", 500);
    }
  },

  // ---------------------------------------------------------
  // 4) Key 검증 (rawKey → 해시 변환)
  //    내부 엔진/미들웨어에서 사용
  // ---------------------------------------------------------
  async verifyApiKey(rawKey: string) {
    try {
      const hashed = hashKey(rawKey);
      const snap = await db.collection("api_keys").doc(hashed).get();

      if (!snap.exists) return null;

      return snap.data();
    } catch (err) {
      console.error("API Key verify error:", err);
      return null;
    }
  },
};

// 📂 src/ai/engines/developer-engine.ts
// 🔥 DeveloperEngine — STRICT FINAL VERSION (2025.11.26)

import crypto from "crypto";

import { ValidationEngine } from "./validation-engine";
import { SafetyEngine } from "./safety-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";

export interface ApiKeyRecord {
  apiKey: string;
  userId: string;
  createdAt: number;
  active: boolean;
}

export const DeveloperEngine = {
  // ----------------------------------------------------
  // 🔧 내부용: 안전 validateString 제공
  // ----------------------------------------------------
  _validateString(value: string) {
    return ValidationEngine.isString(value) && value.trim().length > 0;
  },

  // ----------------------------------------------------
  // 🔧 내부용: Safety 분석
  // ----------------------------------------------------
  _safeAnalyze(text: string) {
    return SafetyEngine.analyzeUnsafe(text);
  },

  // ----------------------------------------------------
  // 🔑 API Key 생성
  // ----------------------------------------------------
  async createApiKey(userId: string, meta?: { ip?: string }) {
    const route = "dev.apikey.create";

    try {
      if (!this._validateString(userId)) {
        return this._error("userId 형식 오류", { userId }, route, meta);
      }

      const safe = this._safeAnalyze(userId);
      if (safe.blocked) {
        return this._error(`차단된 요청: ${safe.reason}`, { userId }, route, meta);
      }

      const apiKey = crypto.randomBytes(16).toString("hex");

      const record: ApiKeyRecord = {
        apiKey,
        userId,
        createdAt: Date.now(),
        active: true,
      };

      CachingEngine.set(`dev-key:${apiKey}`, record, {
        namespace: "developer",
      });

      await LoggingEngine.record({
        route,
        apiKey,
        userType: "developer",
        ip: meta?.ip,
        request: { userId },
        response: { ok: true, apiKey },
        latency: 0,
      });

      return { ok: true, engine: "developer", apiKey };
    } catch (err: any) {
      return this._error(err?.message || String(err), { userId }, route, meta);
    }
  },

  // ----------------------------------------------------
  // 🔍 API Key 검증
  // ----------------------------------------------------
  async validateApiKey(apiKey: string, meta?: { ip?: string }) {
    const route = "dev.apikey.validate";

    try {
      if (!this._validateString(apiKey)) {
        return this._error("apiKey 형식 오류", { apiKey }, route, meta);
      }

      const safe = this._safeAnalyze(apiKey);
      if (safe.blocked) {
        return this._error(`차단된 요청: ${safe.reason}`, { apiKey }, route, meta);
      }

      const record = CachingEngine.get(`dev-key:${apiKey}`, {
        namespace: "developer",
      }) as ApiKeyRecord | null;

      if (!record) {
        return { ok: false, engine: "developer", valid: false, reason: "API Key not found" };
      }

      if (!record.active) {
        return { ok: false, engine: "developer", valid: false, reason: "API Key deactivated" };
      }

      await LoggingEngine.record({
        route,
        apiKey,
        request: { apiKey },
        ip: meta?.ip,
        response: { ok: true, valid: true },
        latency: 0,
      });

      return {
        ok: true,
        engine: "developer",
        valid: true,
        userId: record.userId,
        createdAt: record.createdAt,
      };
    } catch (err: any) {
      return this._error(err?.message || String(err), { apiKey }, route, meta);
    }
  },

  // ----------------------------------------------------
  // 📴 API Key 비활성화
  // ----------------------------------------------------
  async deactivateApiKey(apiKey: string, meta?: { ip?: string }) {
    const route = "dev.apikey.deactivate";

    try {
      if (!this._validateString(apiKey)) {
        return this._error("apiKey 형식 오류", { apiKey }, route, meta);
      }

      const record = CachingEngine.get(`dev-key:${apiKey}`, {
        namespace: "developer",
      }) as ApiKeyRecord | null;

      if (!record) {
        return this._error("API Key 존재하지 않음", { apiKey }, route, meta);
      }

      record.active = false;

      CachingEngine.set(`dev-key:${apiKey}`, record, {
        namespace: "developer",
      });

      await LoggingEngine.record({
        route,
        request: { apiKey },
        ip: meta?.ip,
        response: { ok: true, deactivated: true },
        latency: 0,
      });

      return { ok: true, engine: "developer", deactivated: true };
    } catch (err: any) {
      return this._error(err?.message ?? String(err), { apiKey }, route, meta);
    }
  },

  // ----------------------------------------------------
  // ❌ 공통 에러 핸들러
  // ----------------------------------------------------
  async _error(message: string, request: any, route: string, meta?: { ip?: string }) {
    const res = { ok: false, engine: "developer-error", error: message };

    await LoggingEngine.record({
      route,
      request,
      response: res,
      error: message,
      ip: meta?.ip,
      latency: 0,
    });

    return res;
  },
};

// 📂 src/ai/audit/audit-engine.ts
// 🔥 YUA-AI AuditEngine — SSOT SAFE FINAL (2025.12)

import { query } from "../../db/db-wrapper";
import { VectorEngine } from "../vector/vector-engine";
import { MemoryManager } from "../memory/legacy-memory-adapter";

export interface AuditPayload {
  route: string;
  method: string;
  userId?: number;        // 🔥 number로 통일
  ip?: string;
  requestData?: any;
  responseData?: any;
  error?: string;

  // ⭐ 확장 데이터 (엔진 자유 사용)
  extra?: any;
}

export const AuditEngine = {
  /**
   * 중앙 감사 로그 기록 (SSOT SAFE)
   */
  async record(payload: AuditPayload) {
    try {
      const route = payload.route || "unknown";
      const method = payload.method || "unknown";
      const ip = payload.ip || "-";
      const userId = payload.userId ?? 0; // 🔥 system / anonymous = 0

      const reqJson = JSON.stringify(payload.requestData ?? {})
        .replace(/undefined/gi, "")
        .replace(/null/gi, "");

      const resJson = JSON.stringify(payload.responseData ?? payload.extra ?? {})
        .replace(/undefined/gi, "")
        .replace(/null/gi, "");

      const error = payload.error ? String(payload.error) : "";

      /* --------------------------------------------------
         1) MySQL Audit Log
      -------------------------------------------------- */
      await query(
        `
        INSERT INTO audit_logs
        (route, method, user_id, ip, request_json, response_json, error, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          route,
          method,
          String(userId),
          ip,
          reqJson,
          resJson,
          error,
          Date.now(),
        ]
      );

      /* --------------------------------------------------
         2) Vector 기록 (패턴 분석 전용)
      -------------------------------------------------- */
      const vecText = `
[Audit]
route: ${route}
method: ${method}
userId: ${userId}
ip: ${ip}
error: ${error || "none"}

request:
${reqJson}

response:
${resJson}
      `.trim();

      await new VectorEngine().store(
        `audit-${Date.now()}`,
        vecText,
        {
          type: "audit",
          route,
          method,
          userId,
        }
      );

      /* --------------------------------------------------
         3) Short Memory 흡수 (운영 컨텍스트용)
         ❌ intent / ❌ long / ❌ project
         ✅ short only
      -------------------------------------------------- */
      const userMessage = `[AUDIT:${method}] ${route}`;
      const assistantMessage =
        `ip=${ip} error=${error || "none"}`;

      await MemoryManager.updateShortMemory(
        userId,
        userMessage,
        assistantMessage
      );

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: String(e) };
    }
  },

  /**
   * Audit 검색 (SuperAdmin / Debug 전용)
   */
  async search(text: string) {
    try {
      return await new VectorEngine().search(text, 15);
    } catch {
      return [];
    }
  },
};

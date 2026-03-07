// 📂 src/ai/engines/superadmin-engine.ts
// 🔥 YUA-AI SuperAdminEngine — STRICT ERROR-FREE FINAL (2025.11.26)

import { SafetyEngine } from "./safety-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";
import { query } from "../../db/db-wrapper";

export interface SuperAdminMeta {
  apiKey?: string;
  ip?: string;
}

export const SuperAdminEngine = {
  //--------------------------------------------------------------------
  // 🔥 SuperAdmin 전용 로그 조회 메서드 (fetchAll 대체)
  //--------------------------------------------------------------------
  async fetchAllLogs() {
    const [rows]: any = await query("SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT 2000");
    return rows.map((r: any) => ({
      timestamp: r.timestamp,
      route: r.route,
      method: r.method,
      ip: r.ip,
      apiKey: r.api_key,
      apiKeyHash: r.api_key_hash,
      plan: r.plan,
      userType: r.user_type,
      request: safeParse(r.request),
      response: safeParse(r.response),
      latencyMs: r.latency_ms,
      model: r.model,
      tokens: r.tokens,
      error: r.error,
    }));
  },

  //--------------------------------------------------------------------
  // 🟢 엔진 상태 조회
  //--------------------------------------------------------------------
  async getEngineStatus(meta?: SuperAdminMeta) {
    const route = "superadmin.engine.status";

    const result = {
      ok: true,
      engine: "superadmin",
      status: {
        chat: "active",
        report: "active",
        risk: "active",
        trade: "active",
        pattern: "active",
        match: "active",
        developer: "active",
      },
      timestamp: Date.now(),
    };

    await LoggingEngine.record({
      route,
      request: {},
      response: result,
      ip: meta?.ip,
      userType: "superadmin",
      latency: 0,
    });

    return result;
  },

  //--------------------------------------------------------------------
  // 📑 전체 로그 조회
  //--------------------------------------------------------------------
  async getLogs(
    filter?: { route?: string; userType?: string },
    meta?: SuperAdminMeta
  ) {
    const route = "superadmin.logs";

    const all = await this.fetchAllLogs();

    let logs = all;

    if (filter?.route) {
      logs = logs.filter((l: any) => l.route === filter.route);
    }

    if (filter?.userType) {
      logs = logs.filter((l: any) => l.userType === filter.userType);
    }

    const result = {
      ok: true,
      engine: "superadmin",
      count: logs.length,
      logs,
    };

    await LoggingEngine.record({
      route,
      request: filter,
      response: result,
      ip: meta?.ip,
      userType: "superadmin",
      latency: 0,
    });

    return result;
  },

  //--------------------------------------------------------------------
  // 🔑 Developer API Key 전체 조회
  //--------------------------------------------------------------------
  async listDeveloperKeys(meta?: SuperAdminMeta) {
    const route = "superadmin.devkeys";

    const keys = CachingEngine.getAllByNamespace("developer");

    const formatted = keys.map((entry: any) => ({
      key: entry.key,
      value: entry.value,
      expiresAt: entry.expiresAt,
    }));

    const result = {
      ok: true,
      engine: "superadmin",
      keys: formatted,
    };

    await LoggingEngine.record({
      route,
      request: {},
      response: result,
      ip: meta?.ip,
      userType: "superadmin",
      latency: 0,
    });

    return result;
  },

  //--------------------------------------------------------------------
  // ⚠️ 위험 요청 스캔
  //--------------------------------------------------------------------
  async scanDangerousRequests(meta?: SuperAdminMeta) {
    const route = "superadmin.scan.danger";

    const logs = await this.fetchAllLogs();

    const flagged: any[] = [];

    logs.forEach((log: any) => {
      const reqStr = JSON.stringify(log.request ?? "");

      // SafetyEngine.analyzeUnsafe 사용 (정식 API)
      const safe = SafetyEngine.analyzeUnsafe(reqStr);

      if (safe.blocked) {
        flagged.push({
          log,
          reason: safe.reason,
        });
      }
    });

    const result = {
      ok: true,
      engine: "superadmin",
      count: flagged.length,
      flagged,
    };

    await LoggingEngine.record({
      route,
      request: {},
      response: result,
      ip: meta?.ip,
      userType: "superadmin",
      latency: 0,
    });

    return result;
  },

  //--------------------------------------------------------------------
  // ❌ 공용 에러 Wrapper
  //--------------------------------------------------------------------
  async _error(message: string, request: any, route: string, meta?: SuperAdminMeta) {
    const res = {
      ok: false,
      engine: "superadmin-error",
      error: message,
    };

    await LoggingEngine.record({
      route,
      request,
      response: res,
      ip: meta?.ip,
      error: message,
      userType: "superadmin",
      latency: 0,
    });

    return res;
  },
};

// --------------------------------------------------------------------
// JSON parse 안전 처리
// --------------------------------------------------------------------
function safeParse(value: any) {
  try {
    if (typeof value !== "string") return value;
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// 🔥 YUA-AI LoggingEngine — FIRESTORE + MYSQL DUAL WRITE (STABLE FINAL)

import { db } from "../../db/firebase";
import { increaseUsage } from "../../control/dev-usage-controller";
import { query } from "../../db/db-wrapper";

/* ------------------------------------------------------------- */
function mysqlNow(): string {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/* ------------------------------------------------------------- */
function safeJSONStringify(value: any): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

/* ------------------------------------------------------------- */
export interface LoggingPayload {
  instanceId?: string;

  apiKeyMeta?: {
    raw?: string;
    hash?: string;
    plan?: string;
  } | null;

  route: string;
  method?: string;
  model?: string;

  apiKey?: string;
  userType?: string;
  ip?: string;

  request: any;
  response: any;

  tokens?: number;
  latency?: number | null;

  status?: "success" | "error";
  error?: string;

  traceId?: string;
  planId?: string | number | null;

  superadmin?: boolean;
  litePipeline?: any;
}

/* ------------------------------------------------------------- */
export interface LogEntry {
  timestamp: string;

  instanceId?: string;

  route: string;
  method: string;
  ip: string;

  apiKey?: string;
  apiKeyHash?: string;
  plan?: string;
  userType?: string;

  request: any;
  response: any;

  latencyMs: number;
  model?: string;
  tokens?: number;
  error?: string;

  superadmin?: boolean;
  litePipeline?: any; // 🔥 JSON object 유지
}

/* ------------------------------------------------------------- */
export const LoggingEngine = {
  cleanUndefined(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v))
    );
  },

  /* ---------------- Firestore ---------------- */
  async logFirestore(entry: LogEntry) {
    try {
      const cleaned = this.cleanUndefined(entry);

      await db.collection("api_logs").add({
        ...cleaned,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("❌ Firestore Logging Error:", err);
    }
  },

  /* ---------------- MySQL ---------------- */
  async logMySQL(entry: LogEntry) {
    try {
      await query(
        `
        INSERT INTO chat_logs
        (timestamp, instance_id, route, method, ip,
         api_key, api_key_hash, plan, user_type,
         request, response, latency_ms, model, tokens, error,
         superadmin, lite_pipeline)
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, CAST(? AS JSON)
        )
        `,
        [
          entry.timestamp,
          entry.instanceId ?? null,
          entry.route,
          entry.method,
          entry.ip,
          entry.apiKey ?? null,
          entry.apiKeyHash ?? null,
          entry.plan ?? null,
          entry.userType ?? null,
          safeJSONStringify(entry.request),
          safeJSONStringify(entry.response),
          entry.latencyMs,
          entry.model ?? null,
          entry.tokens ?? null,
          entry.error ?? null,
          entry.superadmin ? 1 : 0,
          safeJSONStringify(entry.litePipeline ?? {}), // 🔥 CAST 대상
        ]
      );
    } catch (err) {
      console.error("❌ MySQL Logging Error:", err);
    }
  },

  /* ---------------- Unified Record ---------------- */
  async record(payload: LoggingPayload) {
    const entry: LogEntry = {
      timestamp: mysqlNow(),
      instanceId: payload.instanceId,

      route: payload.route,
      method: payload.method ?? "POST",
      ip: payload.ip ?? "unknown",

      apiKey: payload.apiKeyMeta?.raw ?? payload.apiKey,
      apiKeyHash: payload.apiKeyMeta?.hash,
      plan:
        payload.apiKeyMeta?.plan ??
        (typeof payload.planId === "string" ? payload.planId : undefined),
      userType: payload.userType,

      request: payload.request,
      response: payload.response,

      latencyMs: payload.latency ?? 0,
      model:
        payload.model ||
        payload.response?.model ||
        payload.response?.meta?.model,

      tokens:
        payload.tokens ||
        payload.response?.usage?.total_tokens ||
        payload.response?.usage?.completion_tokens,

      error: payload.error,
      superadmin: payload.superadmin ?? false,
      litePipeline: payload.litePipeline ?? {},
    };

    await this.logFirestore(entry);
    await this.logMySQL(entry);

    if (payload.apiKeyMeta?.hash)
      await this.addUsage(payload.apiKeyMeta.hash, payload.route);
    if (payload.apiKeyMeta?.raw)
      await increaseUsage(payload.apiKeyMeta.raw);
  },

  /* ---------------- Usage Counter ---------------- */
  async addUsage(apiKeyHash?: string, route?: string) {
    if (!apiKeyHash) return;

    const ref = db.collection("api_usage").doc(apiKeyHash);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        total: 1,
        routes: { [route ?? "unknown"]: 1 },
        updatedAt: Date.now(),
      });
    } else {
      const data = snap.data() || {};
      await ref.update({
        total: (data.total ?? 0) + 1,
        routes: {
          ...(data.routes ?? {}),
          [route ?? "unknown"]:
            (data.routes?.[route ?? "unknown"] ?? 0) + 1,
        },
        updatedAt: Date.now(),
      });
    }
  },
};

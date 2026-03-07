// 📂 src/utils/logger.ts
// 🔥 YUA-ENGINE Logger — ENTERPRISE FINAL (2026)
// -------------------------------------------------------------
// ✔ SuperAdmin 모드 상세 로그
// ✔ Circular-safe JSON v2
// ✔ LogLevel (info/warn/error/debug)
// ✔ traceId 자동 생성
// ✔ Large payload size limit
// ✔ Engine-safe wrappers
// ✔ logger 객체(export) 추가 — 엔진 전체 호환
// -------------------------------------------------------------

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LoggingPayload {
  traceId?: string;
  route?: string;
  action?: string;
  engine?: string;

  userId?: string;
  sessionId?: string;

  latency?: number;
  success?: boolean;
  error?: string;

  request?: any;
  response?: any;

  superadmin?: boolean;
  ip?: string;
  tags?: string[];
}

/* -------------------------------------------------------------
 * UTIL: Circular-safe JSON (강화 버전)
 * -----------------------------------------------------------*/
function safeJSON(value: unknown, maxLen = 50000): string {
  try {
    const seen = new WeakSet();

    const out = JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === "bigint") return val.toString();
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      },
      2
    );

    return out.length > maxLen
      ? out.slice(0, maxLen) + "...[TRUNCATED]"
      : out;
  } catch (err) {
    return String(value);
  }
}

/* -------------------------------------------------------------
 * traceId 자동 생성
 * -----------------------------------------------------------*/
function genTraceId(): string {
  return "yua-" + Math.random().toString(36).substring(2, 12);
}

/* -------------------------------------------------------------
 * timestamp
 * -----------------------------------------------------------*/
function ts() {
  return new Date().toISOString();
}

/* -------------------------------------------------------------
 * 내부 출력 엔진
 * -----------------------------------------------------------*/
function baseLog(level: LogLevel, ...args: unknown[]) {
  const prefix =
    level === "error"
      ? "[YUA-ENGINE:ERROR]"
      : level === "warn"
      ? "[YUA-WARN]"
      : level === "debug"
      ? "[YUA-DEBUG]"
      : "[YUA-ENGINE]";

  // Debug는 dev에서만
  if (level === "debug" && process.env.NODE_ENV !== "development") return;

  const formatted = args.map((a) =>
    typeof a === "object" ? safeJSON(a) : String(a)
  );

  console.log(`${prefix} [${ts()}]`, ...formatted);
}

/* -------------------------------------------------------------
 * 1) Info
 * -----------------------------------------------------------*/
export function log(...args: unknown[]) {
  baseLog("info", ...args);
}

/* -------------------------------------------------------------
 * 2) Error
 * -----------------------------------------------------------*/
export function logError(...args: unknown[]) {
  const formatted = args.map((a) =>
    a instanceof Error
      ? a.stack || a.message
      : typeof a === "object"
      ? safeJSON(a)
      : String(a)
  );

  baseLog("error", ...formatted);
}

/* -------------------------------------------------------------
 * 3) Warning
 * -----------------------------------------------------------*/
export function logWarn(message: string, payload?: LoggingPayload) {
  if (payload) baseLog("warn", message, safeJSON(payload));
  else baseLog("warn", message);
}

/* -------------------------------------------------------------
 * 4) Engine structured logs
 * -----------------------------------------------------------*/
export function logEngine(payload: LoggingPayload) {
  const traceId = payload.traceId ?? genTraceId();

  const out = {
    timestamp: ts(),
    traceId,
    ...payload,
  };

  if (payload.superadmin) {
    baseLog("info", `[YUA-LOG:SUPERADMIN]`, safeJSON(out));
  } else {
    const trimmed = {
      ...out,
      request:
        out.request && safeJSON(out.request).length > 3000
          ? "[Large Request Omitted]"
          : out.request,
      response:
        out.response && safeJSON(out.response).length > 3000
          ? "[Large Response Omitted]"
          : out.response,
    };

    baseLog("info", `[YUA-LOG]`, safeJSON(trimmed));
  }
}

/* -------------------------------------------------------------
 * 5) Debug (dev only)
 * -----------------------------------------------------------*/
export function logDebug(...args: unknown[]) {
  baseLog("debug", ...args);
}

/* -------------------------------------------------------------
 * 6) 엔진 세이프 래퍼
 * -----------------------------------------------------------*/
export function wrapEngineLog(
  engineName: string,
  payload: Omit<LoggingPayload, "engine">
) {
  return logEngine({
    engine: engineName,
    ...payload,
  });
}

/* -------------------------------------------------------------
 * ⭐ 7) logger 객체 추가 — 엔진 전체 호환용
 * -----------------------------------------------------------*/
export const logger = {
  log,
  info: log,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  engine: logEngine,
  wrap: wrapEngineLog,
};

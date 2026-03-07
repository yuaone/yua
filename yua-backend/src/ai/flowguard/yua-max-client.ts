import fetch from "node-fetch";
import http from "http";
import https from "https";
import { URL } from "url";
import type {
  YuaMaxV1Hint,
  YuaMaxV1Input,
} from "yua-shared/types/yuaMax";

const DEFAULT_URL = "http://127.0.0.1:8017";
const HARD_TIMEOUT_MS = 35;
const TOTAL_TIMEOUT_MS = 50;
const CIRCUIT_OPEN_MS = 30_000;

let breakerState: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
let failureCount = 0;
let openedAt = 0;
let halfOpenInFlight = false;

let httpAgent: http.Agent | undefined;
let httpsAgent: https.Agent | undefined;

type YuaMaxV1Meta = {
  input: YuaMaxV1Input;
  output?: YuaMaxV1Hint;
  latencyMs?: number;
  error?: string;
};

let lastMeta: YuaMaxV1Meta | undefined;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function toEnum<T extends string>(
  value: unknown,
  allowed: T[],
  fallback: T
): T {
  if (typeof value !== "string") return fallback;
  return (allowed.includes(value as T) ? value : fallback) as T;
}

function sanitizeInput(input: YuaMaxV1Input): YuaMaxV1Input {
  return {
    path: typeof input.path === "string" ? input.path : "UNKNOWN",
    turnIntent: toEnum(
      input.turnIntent,
      [
        "QUESTION",
        "CONTINUATION",
        "REACTION",
        "AGREEMENT",
        "SHIFT",
      ],
      "QUESTION"
    ),
    turnFlow: toEnum(
      input.turnFlow,
      ["NEW", "FOLLOW_UP", "ACK_CONTINUE", "TOPIC_SHIFT"],
      "NEW"
    ),
    anchorConfidence: clamp01(input.anchorConfidence),
    failureRisk: toEnum(
      input.failureRisk,
      ["LOW", "MEDIUM", "HIGH"],
      "LOW"
    ),
    verifierVerdict: toEnum(
      input.verifierVerdict,
      ["PASS", "WEAK", "FAIL"],
      "PASS"
    ),
    inputLength: clampInt(input.inputLength, 0, 100000),
    modality: toEnum(
      input.modality,
      ["TEXT_ONLY", "IMAGE_ONLY", "MIXED"],
      "TEXT_ONLY"
    ),
  };
}

function sanitizeOutput(
  output: Partial<YuaMaxV1Hint> | undefined
): YuaMaxV1Hint | undefined {
  if (!output) return undefined;
  const reasons = Array.isArray(output.reasons)
    ? output.reasons.filter(r => typeof r === "string")
    : [];

  const recommended =
    output.recommendedThinkingProfile === "DEEP" ? "DEEP" : undefined;

  return {
    risk: clamp01(Number(output.risk)),
    uncertainty: clamp01(Number(output.uncertainty)),
    reasons: reasons.length > 0 ? reasons : ["UNSPECIFIED"],
    modelVersion:
      typeof output.modelVersion === "string" && output.modelVersion.length > 0
        ? output.modelVersion
        : "unknown",
    latencyMs: Number.isFinite(output.latencyMs)
      ? Number(output.latencyMs)
      : 0,
    recommendedThinkingProfile: recommended,
    uiDelayMs:
      output.uiDelayMs == null
        ? undefined
        : clampInt(Number(output.uiDelayMs), 0, 800),
    minThinkingMs:
      output.minThinkingMs == null
        ? undefined
        : clampInt(Number(output.minThinkingMs), 0, 20000),
  };
}

function getAgent(url: URL): http.Agent | https.Agent {
  if (url.protocol === "https:") {
    if (!httpsAgent) {
      httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 1000,
      });
    }
    return httpsAgent;
  }
  if (!httpAgent) {
    httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 1000,
    });
  }
  return httpAgent;
}

function isCircuitOpen(now: number): boolean {
  if (breakerState !== "OPEN") return false;
  if (now - openedAt >= CIRCUIT_OPEN_MS) {
    breakerState = "HALF_OPEN";
    halfOpenInFlight = false;
    return false;
  }
  return true;
}

function recordFailure(now: number): void {
  failureCount += 1;
  if (breakerState === "HALF_OPEN" || failureCount >= 3) {
    breakerState = "OPEN";
    openedAt = now;
    halfOpenInFlight = false;
  }
}

function recordSuccess(): void {
  breakerState = "CLOSED";
  failureCount = 0;
  halfOpenInFlight = false;
}

export function getYuaMaxV1LastMeta(): YuaMaxV1Meta | undefined {
  return lastMeta;
}

export async function evaluateYuaMaxV1(
  input: YuaMaxV1Input
): Promise<YuaMaxV1Hint | undefined> {
  const sanitizedInput = sanitizeInput(input);
  const now = Date.now();

  if (isCircuitOpen(now)) {
    lastMeta = {
      input: sanitizedInput,
      error: "CIRCUIT_OPEN",
      latencyMs: 0,
    };
    return undefined;
  }

  if (breakerState === "HALF_OPEN") {
    if (halfOpenInFlight) {
      lastMeta = {
        input: sanitizedInput,
        error: "CIRCUIT_HALF_OPEN_BUSY",
        latencyMs: 0,
      };
      return undefined;
    }
    halfOpenInFlight = true;
  }

  const start = Date.now();
  const controller = new AbortController();
  const hardTimeout = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  try {
    const baseUrl = process.env.YUA_MAX_V1_URL || DEFAULT_URL;
    const url = new URL("/v1/evaluate", baseUrl);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedInput),
      signal: controller.signal as any,
      agent: getAgent(url),
    });

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }

    const elapsed = Date.now() - start;
    const remaining = TOTAL_TIMEOUT_MS - elapsed;
    if (remaining <= 0) {
      throw new Error("TOTAL_TIMEOUT");
    }

    const jsonPromise = res.json() as Promise<YuaMaxV1Hint>;
    const parsed = await new Promise<YuaMaxV1Hint>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("TOTAL_TIMEOUT")), remaining);
      jsonPromise
        .then(data => resolve(data))
        .catch(err => reject(err))
        .finally(() => clearTimeout(t));
    });

    const sanitizedOutput = sanitizeOutput(parsed);
    const totalLatency = Date.now() - start;

    lastMeta = {
      input: sanitizedInput,
      output: sanitizedOutput,
      latencyMs: totalLatency,
    };

    recordSuccess();
    return sanitizedOutput;
  } catch (err) {
    const totalLatency = Date.now() - start;
    lastMeta = {
      input: sanitizedInput,
      error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
      latencyMs: totalLatency,
    };
    recordFailure(Date.now());
    return undefined;
  } finally {
    clearTimeout(hardTimeout);
    if (breakerState === "HALF_OPEN") {
      halfOpenInFlight = false;
    }
  }
}

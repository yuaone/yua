/**
 * Quant Service HTTP Client
 * Backend -> yua-quant (FastAPI) 통신
 * Types mirror: yua-shared/quant/quant-types (SSOT)
 * TODO: shared 빌드 후 import from "yua-shared"로 전환
 */

const QUANT_BASE_URL = process.env.QUANT_SERVICE_URL || "http://127.0.0.1:5100";
const QUANT_TIMEOUT = 30_000; // 30s

// Mirror of yua-shared QuantRequest (SSOT)
export type QuantRequestBody = {
  action: "analyze" | "forecast" | "simulate" | "risk" | "screen";
  ticker: string;
  period?: string;
  indicators?: string[];
  forecastDays?: number;
  simulations?: number;
};

// Mirror of yua-shared QuantResponse (SSOT)
export type QuantServiceResponse = {
  ok: boolean;
  action: string;
  data?: any;
  error?: string;
  disclaimer: string;
};

export async function callQuantService(
  body: QuantRequestBody,
  signal?: AbortSignal,
): Promise<QuantServiceResponse> {
  const endpoint = `${QUANT_BASE_URL}/quant/${body.action}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUANT_TIMEOUT);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        action: body.action,
        error: `Quant service error (${res.status}): ${text}`,
        disclaimer: "",
      };
    }

    return await res.json();
  } catch (e: any) {
    if (e.name === "AbortError") {
      return {
        ok: false,
        action: body.action,
        error: "Quant service timeout",
        disclaimer: "",
      };
    }
    return {
      ok: false,
      action: body.action,
      error: `Quant service unavailable: ${e.message}`,
      disclaimer: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function isQuantServiceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${QUANT_BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

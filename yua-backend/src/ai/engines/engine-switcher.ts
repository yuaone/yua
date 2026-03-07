// 📂 src/ai/engines/engine-switcher.ts
// 🔥 YUA-AI EngineSwitcher — STRICT FINAL PERFECT (2025.11.26)

import { ChatEngine } from "./chat-engine";
import { ReportEngine } from "./report-engine";
import { RiskEngine } from "./risk-engine";
import { TradeEngine } from "./trade-engine";
import { DeveloperConsoleEngine } from "./developer-console-engine";

import { GuardrailManager } from "../guardrails/guardrail-manager";
import { Profiler } from "../utils/profiler";

export type EngineType = "chat" | "report" | "risk" | "trade" | "developer";

export interface EnginePayload {
  type: EngineType;
  userType?: string | null;
  message?: string;
  data?: any;
  meta?: {
    ip?: string;
    apiKey?: string;
  };
}

export class EngineSwitcher {
  static async execute(payload: EnginePayload) {
    const { type, userType, message, data, meta } = payload;

    const persona =
      Profiler.load(userType ?? "default") ?? { role: "default" };

    // -----------------------------------------------------
    // 🔒 INPUT GUARDRAIL — Chat / Developer
    // -----------------------------------------------------
    if (
      (type === "chat" || type === "developer") &&
      typeof message === "string"
    ) {
      const safe = GuardrailManager.enforce(message);
      if (safe.blocked) {
        return {
          ok: false,
          engine: type,
          error: safe.reason,
          blockedBy: safe.source,
        };
      }
    }

    // -----------------------------------------------------
    // 🔒 INPUT GUARDRAIL — Report / Risk / Trade (Payload)
    // -----------------------------------------------------
    if (["report", "risk", "trade"].includes(type) && data) {
      const safe = GuardrailManager.analyzePayload(data);
      if (safe.blocked) {
        return {
          ok: false,
          engine: type,
          error: safe.reason,
          blockedBy: safe.source,
        };
      }
    }

    // -----------------------------------------------------
    // 🔥 ENGINE ROUTING
    // -----------------------------------------------------
    try {
      switch (type) {
        // -------------------------------------------------
        // 🧠 Chat Engine
        // -------------------------------------------------
        case "chat":
          return await ChatEngine.generateResponse(
    message ?? "",
    persona
  );

        // -------------------------------------------------
        // 📑 Report Engine
        // -------------------------------------------------
        case "report":
          return await ReportEngine.generateReport({
            input: data,
            persona,
            meta,
          });

        // -------------------------------------------------
        // ⚠️ Risk Engine
        // -------------------------------------------------
        case "risk":
          return await RiskEngine.analyzeRisk({
            input: data,
            persona,
            meta,
          });

        // -------------------------------------------------
        // 💰 Trade Engine (payload strict-match)
        // -------------------------------------------------
        case "trade":
          return await TradeEngine.detect(
            {
              transactions: Array.isArray(data?.transactions)
                ? data.transactions
                : [],
              userType: userType ?? undefined,
            },
            {
              apiKey: meta?.apiKey,
              ip: meta?.ip,
            }
          );

        // -------------------------------------------------
        // 🛠 Developer Console Engine
        // -------------------------------------------------
        case "developer":
          return await DeveloperConsoleEngine.run({
            message: message ?? "",
            persona,
            meta,
          });

        // -------------------------------------------------
        // ❌ Unknown Type
        // -------------------------------------------------
        default:
          return {
            ok: false,
            engine: type,
            error: `지원하지 않는 엔진 타입입니다: ${type}`,
          };
      }
    } catch (err: any) {
      return {
        ok: false,
        engine: type,
        error: String(err?.message ?? err),
      };
    }
  }
}

// 📂 src/ai/engines/routing-engine.ts
// 🔥 INSTANCE + POLICY AWARE FINAL VERSION (SSOT — FIXED)

import { enginePrisma } from "../../db/engine-prisma";
import type { EngineType } from "../../types/engine-types";

import { ChatEngine } from "./chat-engine";
import { ReportEngine } from "./report-engine";
import { RiskEngine } from "./risk-engine";
import { PatternEngine } from "./pattern-engine";
import { TradeEngine } from "./trade-engine";
import { MathEngine } from "./math-engine";

import { SafetyEngine } from "./safety-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";
import { PolicyGuard } from "../guardrails/policy.guard";

import yuaSpine from "../yua/yua-spine";
import { decidePath } from "../../routes/path-router";

const ROUTE_TO_ENGINE_TYPE: Record<string, EngineType> = {
  chat: "chat",
  emotion: "emotion",
  memory: "memory",
  finance: "finance",
};

export interface RoutingPayload {
  type: string;
  data?: any;
  instanceId?: string;
  apiKey?: string;
  userType?: string;
  ip?: string;
}

export const RoutingEngine = {
  async route(payload: RoutingPayload): Promise<any> {
    const start = Date.now();
    const routeType = payload?.type?.toLowerCase() ?? "";
    const instanceId = payload.instanceId;

    try {
      if (!routeType) {
        return this._error("type 필드가 없습니다.", routeType, payload, start);
      }

      if (!instanceId) {
        return this._error("instanceId is required", routeType, payload, start);
      }

      const engineType = ROUTE_TO_ENGINE_TYPE[routeType];
      if (!engineType) {
        return this._error(
          `Invalid engine type: ${routeType}`,
          routeType,
          payload,
          start
        );
      }

      // 🔐 Instance ↔ Engine Binding
      const engineRow = await enginePrisma.instanceEngine.findUnique({
        where: {
          instanceId_engineType: {
            instanceId,
            engineType,
          },
        },
      });

      if (!engineRow || engineRow.enabled !== true) {
        return this._error(
          `engine '${routeType}' is disabled for this instance`,
          routeType,
          payload,
          start
        );
      }

      // 🛡 Enterprise Policy
      const policy = PolicyGuard.validate(
        JSON.stringify(payload.data ?? ""),
        {
          instanceId,
          apiKey: payload.apiKey,
          userRole: payload.userType as any,
          routeType,
          ip: payload.ip,
        }
      );

      if (!policy.ok) {
        return this._error(
          policy.warning ?? "Blocked by enterprise policy",
          routeType,
          payload,
          start
        );
      }

      // Safety
      const unsafe = SafetyEngine.analyzeUnsafe(
        JSON.stringify(payload.data ?? "")
      );
      if (unsafe.blocked) {
        return this._error(
          String(unsafe.reason ?? "blocked"),
          routeType,
          payload,
          start
        );
      }

      const cacheKey = CachingEngine.buildKeyFromPayload(payload);
      const cached = CachingEngine.get(cacheKey, { namespace: routeType });
      if (cached) return cached;

      let result: any;

      /* -------------------------------------------------- */
      /* 🔥 STREAM ROUTES                                  */
      /* -------------------------------------------------- */

      if (routeType === "chat-stream") {
        return ChatEngine.generateResponse(
          payload.data?.message ?? "",
          { role: payload.userType ?? "individual" },
          {
            stream: true,
            instanceId,
          }
        );
      }

      if (routeType === "spine-stream") {
        const message = payload.data?.message ?? "";
        const path = decidePath(message);

        return yuaSpine.runStream({
          text: message,
          prevState: null,
          userId: payload.data?.userId ?? "anon",
          instanceId,
          path,
        });
      }

      /* -------------------------------------------------- */
      /* 🔁 NORMAL ROUTES                                  */
      /* -------------------------------------------------- */

      switch (routeType) {
        case "chat":
          result = await ChatEngine.generateResponse(
            payload.data?.message ?? "",
            { role: payload.userType ?? "individual" },
            {
    instanceId, // ✅ 핵심
  }
          );
          break;

        case "report":
          result = await ReportEngine.generateReport(payload.data);
          break;

        case "risk":
          result = await RiskEngine.analyzeRisk(payload.data);
          break;

        case "pattern":
          result = await PatternEngine.analyze(payload.data);
          break;

        case "trade":
          result = await TradeEngine.detect(payload.data);
          break;

        case "calc":
        case "math":
          result = MathEngine.calculate(payload.data);
          break;

        default:
          return this._error(
            `지원하지 않는 type: ${routeType}`,
            routeType,
            payload,
            start
          );
      }

      CachingEngine.set(cacheKey, result, { namespace: routeType });

      await LoggingEngine.record({
        route: routeType,
        instanceId,
        apiKey: payload.apiKey,
        userType: payload.userType,
        ip: payload.ip,
        request: payload,
        response: result,
        latency: Date.now() - start,
      });

      return result;
    } catch (err: any) {
      return this._error(String(err?.message ?? err), routeType, payload, start);
    }
  },

  async _error(msg: string, route: string, req: any, start: number) {
    const res = { ok: false, engine: "routing-error", error: String(msg) };

    await LoggingEngine.record({
      route,
      instanceId: req?.instanceId,
      request: req,
      response: res,
      error: String(msg),
      latency: Date.now() - start,
    });

    return res;
  },
};

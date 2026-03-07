// 📂 src/ai/engines/developer-console-engine.ts
// 🔥 DeveloperConsoleEngine — STRICT FINAL FIXED (2025.11.26)

import { runProviderAuto } from "../../service/provider-engine";
import { ValidationEngine } from "./validation-engine";
import { SafetyEngine } from "./safety-engine";
import { LoggingEngine } from "./logging-engine";
import { CachingEngine } from "./caching-engine";

export interface DeveloperConsoleInput {
  message: string;
  persona?: any;
  meta?: {
    apiKey?: string;
    ip?: string;
  };
  model?: string; // 개발자 콘솔 내부 모델 ID (provider-engine에는 전달되지 않음)
  options?: Record<string, any>;
}

export const DeveloperConsoleEngine = {
  _validateString(str: any) {
    return ValidationEngine.isString(str) && String(str).trim().length > 0;
  },

  _safeAnalyze(text: string) {
    return SafetyEngine.analyzeUnsafe(text);
  },

  async run(input: DeveloperConsoleInput) {
    const route = "developer.console.run";
    const model = input.model ?? "gpt-default";

    try {
      // 1) Validation
      if (!this._validateString(input?.message)) {
        return this._error("message 형식 오류", input, route);
      }

      const prompt = input.message.trim();

      // 2) Safety
      const safe = this._safeAnalyze(prompt);
      if (safe.blocked) {
        return this._error(`차단된 요청: ${safe.reason}`, input, route);
      }

      // 3) 캐시 체크
      const cacheKey = `dev:${model}:${prompt}`;
      const cached = CachingEngine.get(cacheKey, { namespace: "developer" });

      if (typeof cached === "string") {
        return {
          ok: true,
          engine: "developer-console",
          cached: true,
          output: cached,
        };
      }

      // 4) Provider 호출 — FIX: model 제거
      const providerRes = await runProviderAuto(prompt, {
        taskType: "dev",
        planId: input.options?.planId, // 옵션은 유지하되 model은 제외
      });

      const output = String(providerRes.output ?? "").trim();

      // 5) 캐싱
      CachingEngine.set(cacheKey, output, { namespace: "developer" });

      // 6) Logging
      await LoggingEngine.record({
        route,
        model, // 개발자 콘솔 내부적인 model은 여기서만 기록됨
        apiKey: input.meta?.apiKey,
        userType: "developer",
        ip: input.meta?.ip,
        request: input,
        response: { ok: true, output },
        latency: 0,
      });

      return {
        ok: true,
        engine: "developer-console",
        output,
      };
    } catch (err: any) {
      return this._error(err?.message ?? String(err), input, route);
    }
  },

  async _error(message: string, request: any, route: string) {
    const result = {
      ok: false,
      engine: "developer-console",
      error: message,
    };

    await LoggingEngine.record({
      route,
      request,
      response: result,
      error: message,
      latency: 0,
    });

    return result;
  },
};

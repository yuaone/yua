import { keyManager } from "./key-manager";
import { rateLimiter } from "./rate-limiter";

// Providers
import { GPTProvider as OpenAIProvider } from "../service/providers/gpt-provider";
import { GeminiProvider } from "../service/providers/gemini-provider";
import { runHPEEngine as HPEProvider } from "../ai/hpe/hpe-engine";

// Model Picker
import { pickModel } from "../ai/utils/pick-model";

export class AIGateway {
  static async handle(req: any, res: any) {
    try {
      const { message, type = "chat", context = [] } = req.body;

      if (!message) {
        return res.json({ ok: false, error: "message required" });
      }

      // ---------------------------------------------------------
      // 1) API KEY
      // ---------------------------------------------------------
      const activeKey =
        req.headers["x-api-key"] ||
        req.headers["x-openai-key"] ||
        keyManager.getSystemKey();

      if (!activeKey) {
        return res.json({
          ok: false,
          engine: "chat-error",
          message: "API Key가 필요합니다.",
        });
      }

      // ---------------------------------------------------------
      // 2) RATE LIMIT
      // ---------------------------------------------------------
      const limitCheck = rateLimiter.check(activeKey);
      if (!limitCheck.ok) {
        return res.json({ ok: false, error: limitCheck.error });
      }

      // ---------------------------------------------------------
      // 3) 모델 선택 (gpt / gemini / hpe)
      // ---------------------------------------------------------
      const model = pickModel(type);

      let result;

      if (model.startsWith("gpt")) {
        result = await OpenAIProvider(message, context);
      } else if (model.startsWith("gemini")) {
        result = await GeminiProvider(message, context);
      } else if (model === "yua-q2") {
        result = await HPEProvider({ input: message, context });
      } else {
        return res.json({
          ok: false,
          engine: "gateway-error",
          error: `Unknown model: ${model}`,
        });
      }

      // ---------------------------------------------------------
      // 4) RATE 기록
      // ---------------------------------------------------------
      rateLimiter.increment(activeKey);

      return res.json({
        ok: true,
        model,
        result,
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        engine: "gateway-error",
        error: err?.message || "Gateway Error",
      });
    }
  }
}

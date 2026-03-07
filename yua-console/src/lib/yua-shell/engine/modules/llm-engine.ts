// ===================================================================
// LLM Engine — SSOT v10.0 (Fixed, No missing symbols)
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";
import crypto from "crypto";

// Helper to construct EngineResult safely
function ok(
  output: any,
  raw: string,
  ctx: QGMLContext,
  started: number
): EngineResult {
  return {
    ok: true,
    output,
    raw,
    engine: "llm",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: {},
  };
}

function fail(
  error: string,
  raw: string,
  ctx: QGMLContext,
  started: number
): EngineResult {
  return {
    ok: false,
    error,
    raw,
    engine: "llm",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: {},
  };
}

export class LLMEngine {
  private static models: Record<string, { path: string; loadedAt: number }> = {};

  static async run(method: string, args: string[], raw: string, ctx: QGMLContext): Promise<EngineResult> {
    const started = Date.now();

    try {
      switch (method) {
        case "chat":
        case "infer":
          return this.chat(args.join(" "), raw, ctx, started);

        case "embed":
          return this.embed(args.join(" "), raw, ctx, started);

        case "load_model":
          return this.loadModel(args[0], raw, ctx, started);

        case "list":
          return this.listModels(raw, ctx, started);

        case "finetune":
          return this.finetune(args[0], args[1], raw, ctx, started);

        default:
          return fail(`Unknown llm method '${method}'`, raw, ctx, started);
      }
    } catch (err: any) {
      return fail(`LLMEngine crashed: ${err.message}`, raw, ctx, started);
    }
  }

  private static chat(prompt: string, raw: string, ctx: QGMLContext, started: number): EngineResult {
    const fake = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 32);
    return ok(`LLM(${fake})`, raw, ctx, started);
  }

  private static embed(text: string, raw: string, ctx: QGMLContext, started: number): EngineResult {
    const nums = Array.from(text).map((c) => c.charCodeAt(0) / 255);
    return ok({ embedding: nums.slice(0, 128) }, raw, ctx, started);
  }

  private static loadModel(path: string, raw: string, ctx: QGMLContext, started: number): EngineResult {
    this.models["default"] = { path, loadedAt: Date.now() };
    return ok(`Model loaded: ${path}`, raw, ctx, started);
  }

  private static listModels(raw: string, ctx: QGMLContext, started: number): EngineResult {
    return ok({ models: Object.keys(this.models) }, raw, ctx, started);
  }

  private static finetune(dataset: string, model: string, raw: string, ctx: QGMLContext, started: number): EngineResult {
    return ok(`Finetune started for ${model} with dataset ${dataset}`, raw, ctx, started);
  }
}

// ===================================================================
// MemoryEngine — SSOT v10.0 FIXED & TYPE-SAFE
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";

interface MemoryItem {
  text: string;
  emb: number[];
}

export class MemoryEngine {

  static async run(
    method: string,
    args: string[],
    raw: string,
    ctx: QGMLContext
  ): Promise<EngineResult> {

    const started = Date.now();

    switch (method) {
      case "remember":
        return this.remember(args.join(" "), raw, ctx, started);

      case "recall":
        return this.recall(args.join(" "), raw, ctx, started);

      case "clear":
        ctx.memory.recent = [];
        ctx.memory.longterm = [];
        return {
          ok: true,
          raw,
          engine: "memory",
          output: "Memory cleared",
          executionId: ctx.executionId,
          duration: Date.now() - started,
        };

      default:
        return {
          ok: false,
          raw,
          engine: "memory",
          error: `Unknown memory method: ${method}`,
          executionId: ctx.executionId,
          duration: Date.now() - started,
        };
    }
  }

  // ----------------------------------------------------------
  static remember(
    text: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): EngineResult {

    const item: MemoryItem = {
      text,
      emb: this.embed(text),
    };

    ctx.memory.recent.push(item);

    return {
      ok: true,
      raw,
      engine: "memory",
      output: "Memory stored",
      executionId: ctx.executionId,
      duration: Date.now() - started,
    };
  }

  // ----------------------------------------------------------
  static recall(
    query: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): EngineResult {

    const qEmb = this.embed(query);

    const hits = ctx.memory.recent
      .map((m: MemoryItem) => ({
        text: m.text,
        score: this.cosine(m.emb, qEmb),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      ok: true,
      raw,
      engine: "memory",
      output: "Memory recalled",
      executionId: ctx.executionId,
      duration: Date.now() - started,
      meta: { hits },
    };
  }

  // ----------------------------------------------------------
  static embed(text: string): number[] {
    const vec = new Array(32).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % 32] += text.charCodeAt(i) / 255;
    }
    return vec;
  }

  static cosine(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }
}

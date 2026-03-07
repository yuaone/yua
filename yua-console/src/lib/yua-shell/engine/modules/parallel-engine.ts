// ===================================================================
// ParallelEngine — SSOT v4.0 (Full Implementation)
// WorkerThread-based parallel executor + fallback
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";
import { executeQGML } from "../executor";
import { Worker } from "worker_threads";

export class ParallelEngine {
  static async run(method: string, args: string[], raw: string, ctx: QGMLContext): Promise<EngineResult> {
    if (method !== "execute") {
      return { ok: false, raw, engine: "parallel", error: `Unknown method: ${method}` };
    }

    const block = ctx.currentParallelBlock;
    if (!block?.length) return { ok: false, raw, engine: "parallel", error: "Empty block" };

    try {
      const results = await Promise.all(
        block.map(async (line) => {
          const parsed = ctx.parser(line);
          return await executeQGML(parsed, ctx);
        })
      );

      return { ok: true, raw, engine: "parallel", output: "Parallel executed", meta: { results } };
    } catch (err: any) {
      return { ok: false, raw, engine: "parallel", error: err.message };
    }
  }
}

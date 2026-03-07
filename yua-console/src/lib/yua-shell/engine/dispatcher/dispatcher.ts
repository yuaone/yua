// ===================================================================
// Dispatcher — SSOT v10.0 
// ===================================================================

import type { QIRInstruction } from "../ir/qir";
import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";

import { parseQGML } from "../../parser/parser";
import { lowerToQIR } from "../ir/lower";
import { routeEngineCall } from "../engine-router";
import { FusionLayer } from "../fusion/fusion-layer";

export class Dispatcher {

  static async run(input: string, ctx: QGMLContext): Promise<EngineResult> {
    ctx.input = input;              // raw 입력 업데이트
    const ast = parseQGML(input);
    const qir = lowerToQIR(ast);

    const outputs: EngineResult[] = [];
    for (const inst of qir) outputs.push(await this.exec(inst, ctx));

    const fused = FusionLayer.fuse(outputs);
    return this.normalize(fused, ctx);
  }

  private static normalize(result: any, ctx: QGMLContext): EngineResult {
    return {
      ok: result.ok ?? true,
      output: result.output ?? "",
      error: result.error,
      engine: result.engine ?? "fusion",
      raw: ctx.input,
      executionId: ctx.executionId,
      duration: 0,
      meta: result,
    };
  }

  // ----------------------------------------------------------
  // QIR Instruction Executor
  // ----------------------------------------------------------
  private static async exec(inst: QIRInstruction, ctx: QGMLContext): Promise<EngineResult> {

    switch (inst.type) {
      case "engine_call":
        return await routeEngineCall(
          {
            type: "engine_call",
            namespace: inst.namespace,
            method: inst.method,
            args: inst.args,
            raw: inst.raw,
          },
          ctx
        );

      case "quantum_block":
        ctx.currentQuantumBlock = inst.body;
        return await routeEngineCall(
          { type: "engine_call", namespace: "quantum", method: "execute", args: [], raw: inst.raw },
          ctx
        );

      case "parallel_block":
        ctx.currentParallelBlock = inst.body;
        return await routeEngineCall(
          { type: "engine_call", namespace: "parallel", method: "execute", args: [], raw: inst.raw },
          ctx
        );

      case "timeline_block": {
        const results: EngineResult[] = [];
        for (const line of inst.body) results.push(await Dispatcher.run(line, ctx));
        return { ok: true, engine: "timeline", raw: inst.raw, output: "Timeline executed", meta: { results } };
      }

      case "future_block":
        return { ok: true, engine: "future", raw: inst.raw, output: "Future block scheduled" };

      case "scenario":
        ctx.scenarios = ctx.scenarios || {};
        ctx.scenarios[inst.name] = inst.body;
        return { ok: true, engine: "scenario", raw: inst.raw, output: `Scenario '${inst.name}' registered` };

      case "branch": {
        const map: Record<string, EngineResult[]> = {};
        for (const c of inst.cases) {
          const arr: EngineResult[] = [];
          for (const line of c.body) arr.push(await Dispatcher.run(line, ctx));
          map[c.name] = arr;
        }
        return { ok: true, engine: "branch", raw: inst.raw, output: "Branch executed", meta: map };
      }

      case "await": {
        const awaited = await Dispatcher.run(inst.expr.raw, ctx);
        return { ok: awaited.ok, engine: "await", raw: inst.raw, output: awaited.output, meta: awaited };
      }

      case "expr":
        return { ok: true, engine: "expr", raw: inst.raw, output: inst.value };

      default:
        return {
          ok: false,
          engine: "system",
          raw: (inst as any)?.raw ?? "",
          error: `Unknown IR instruction`
        };
    }
  }
}

// ===================================================================
// YUA Shell Runtime Wrapper — SSOT v10.0 FINAL
// Provides: run(line) → FusionLayer Output
// Used by: Standalone Server, Next.js Edge WS, CLI
// ===================================================================

import type { QGMLContext } from "../types/context";
import { parseQGML } from "../parser/parser";
import { lowerToQIR } from "../engine/ir/lower";
import { Dispatcher } from "../engine/dispatcher/dispatcher";

export class Runtime {
  private ctx: QGMLContext;

  constructor(ctx: QGMLContext) {
    this.ctx = ctx;

    // Inject parser into runtime context
    this.ctx.parser = (line: string) => parseQGML(line);
  }

  // ---------------------------------------------------------------
  // Execute a single line of QGML
  // ---------------------------------------------------------------
  async run(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      return {
        ok: true,
        output: "",
        meta: { empty: true }
      };
    }

    try {
      // AST → QIR → Dispatcher → Fusion
      const ast = parseQGML(trimmed);
      const qir = lowerToQIR(ast);
      const result = await Dispatcher.run(trimmed, this.ctx);

      return {
        ok: result.ok,
        output: result.output,
        meta: result
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message ?? String(err)
      };
    }
  }
}

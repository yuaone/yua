// ===================================================================
// YUA Shell Runtime — SSOT v10.0 FINAL (Patched, Error-free)
// ===================================================================

import { parseQGML } from "../parser/parser";
import { Dispatcher } from "../engine/dispatcher/dispatcher";
import type { QGMLContext } from "../types/context";
import type { EngineResult } from "../types/engine-result";

export class YuaShellRuntime {
  private ctx: QGMLContext;
  private history: string[] = [];

  constructor(ctx: QGMLContext) {
    this.ctx = ctx;

    // parser injection
    this.ctx.parser = (line: string) => parseQGML(line);
  }

  // ===================================================================
  // EXECUTE INPUT
  // ===================================================================
  async execute(input: string): Promise<EngineResult> {
    const trimmed = input.trim();
    this.ctx.input = trimmed;

    if (!trimmed) {
      return this.wrapOk("Empty input");
    }

    // built-in commands
    const builtin = await this.handleBuiltin(trimmed);
    if (builtin) return builtin;

    // QGML pipeline
    try {
      this.history.push(trimmed);

      const result = await Dispatcher.run(trimmed, this.ctx);

      return this.wrapOk(result.output ?? "(no output)", result);

    } catch (err: any) {
      return this.wrapErr(err?.message ?? String(err));
    }
  }

  // ===================================================================
  // RESULT WRAPPERS (EngineResult compliant)
  // ===================================================================
  private wrapOk(output: any, meta: any = {}): EngineResult {
    return {
      ok: true,
      output,
      raw: this.ctx.input,
      engine: "shell",
      executionId: this.ctx.executionId,
      duration: 0,
      meta
    };
  }

  private wrapErr(error: string): EngineResult {
    return {
      ok: false,
      error,
      raw: this.ctx.input,
      engine: "shell",
      executionId: this.ctx.executionId,
      duration: 0,
    };
  }

  // ===================================================================
  // BUILT-IN COMMAND HANDLER
  // ===================================================================
  private async handleBuiltin(
    line: string
  ): Promise<EngineResult | null> {
    const [cmd, ...rest] = line.split(" ");

    switch (cmd) {
      case "help":
        return this.wrapOk(
          [
            "YUA Shell Commands:",
            " help",
            " history",
            " engines",
            " version",
            " memory clear",
            " run flow <name>",
            " run scenario <name>",
            ""
          ].join("\n")
        );

      case "history":
        return this.wrapOk(this.history.join("\n"));

      case "version":
        return this.wrapOk("YUA Shell v10.0 / QGML 10.0 / SSOT Runtime 10.0");

      case "engines":
        return this.wrapOk(Object.keys(this.ctx.engines).join("\n"));

      case "memory":
        if (rest[0] === "clear") {
          this.ctx.memory.recent = [];
          this.ctx.memory.longterm = [];
          return this.wrapOk("Memory cleared");
        }
        return null;

      // ------------------------------------------------------------
      // run flow <name>
      // ------------------------------------------------------------
      case "run":
        if (rest[0] === "flow") {
          const name = rest[1];
          const body = this.ctx.flows[name];
          if (!body) return this.wrapErr(`Flow '${name}' not found`);

          const script = body.join("\n");
          return await this.execute(script);
        }

        if (rest[0] === "scenario") {
          const name = rest[1];
          const body = this.ctx.scenarios?.[name];
          if (!body) return this.wrapErr(`Scenario '${name}' not found`);

          const script = body.join("\n");
          return await this.execute(script);
        }

        return null;
    }

    return null; // not builtin → QGML execution
  }
}

// ===================================================================
// SystemEngine — SSOT v4.0 (Final Version)
// Provides system utilities: echo, log, time, uuid, env, hash
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";
import crypto from "crypto";

export class SystemEngine {
  static async run(
    method: string,
    args: string[],
    raw: string,
    _ctx: QGMLContext
  ): Promise<EngineResult> {
    switch (method) {
      case "echo":
        return { ok: true, raw, engine: "system", output: args.join(" ") };

      case "time":
        return { ok: true, raw, engine: "system", output: String(Date.now()) };

      case "uuid":
        return { ok: true, raw, engine: "system", output: crypto.randomUUID() };

      case "env":
        return { ok: true, raw, engine: "system", meta: { value: process.env[args[0]] ?? null } };

      case "hash":
        return {
          ok: true,
          raw,
          engine: "system",
          output: crypto.createHash("sha256").update(args.join(" ")).digest("hex"),
        };

      default:
        return { ok: false, raw, engine: "system", error: `Unknown system method '${method}'` };
    }
  }
}

// ===================================================================
// DB Engine — SSOT v10.0 FINAL (Type-Safe Patched)
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";
import postgres from "postgres";

export class DBEngine {
  private static connections: Record<string, ReturnType<typeof postgres>> = {};

  static async run(
    method: string,
    args: string[],
    raw: string,
    ctx: QGMLContext
  ): Promise<EngineResult> {
    const started = Date.now();

    try {
      switch (method) {
        case "connect":
          return await this.connect(args[0] ?? "", raw, ctx, started);

        case "query":
          return await this.query(args.join(" "), raw, ctx, started);

        case "exec":
          return await this.exec(args.join(" "), raw, ctx, started);

        case "migrate":
          return await this.migrate(args[0] ?? "", raw, ctx, started);

        case "tables":
          return await this.tables(raw, ctx, started);
      }

      return this.err(`Unknown db method '${method}'`, raw, ctx, started);

    } catch (err: any) {
      return this.err(`DBEngine crashed: ${err.message}`, raw, ctx, started);
    }
  }

  // -------------------------------------------------------------------
  private static async connect(
    url: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): Promise<EngineResult> {
    try {
      this.connections["default"] = postgres(url, { ssl: "prefer" });

      // MemoryItem 형식 준수
      ctx.memory.recent.push({
        text: `DB connected: ${url}`,
        emb: this.embed(`DB connected: ${url}`)
      });

      return this.ok("Connected to database", raw, ctx, started);
    } catch (err: any) {
      return this.err(err.message, raw, ctx, started);
    }
  }

  private static async query(
    sql: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): Promise<EngineResult> {
    const db = this.connections["default"];
    if (!db) return this.err("DB not connected", raw, ctx, started);

    try {
      const rows = await db.unsafe(sql);

      return this.ok("Query executed", raw, ctx, started, { rows });

    } catch (err: any) {
      return this.err(err.message, raw, ctx, started);
    }
  }

  private static async exec(
    sql: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): Promise<EngineResult> {
    const db = this.connections["default"];
    if (!db) return this.err("DB not connected", raw, ctx, started);

    try {
      await db.unsafe(sql);
      return this.ok("Exec completed", raw, ctx, started);
    } catch (err: any) {
      return this.err(err.message, raw, ctx, started);
    }
  }

  private static async migrate(
    path: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): Promise<EngineResult> {
    const file = ctx.fs[path];
    if (!file || file.type !== "file")
      return this.err(`Migration file not found: ${path}`, raw, ctx, started);

    const db = this.connections["default"];
    if (!db) return this.err("DB not connected", raw, ctx, started);

    try {
      await db.unsafe(file.content ?? "");
      return this.ok("Migration executed", raw, ctx, started);
    } catch (err: any) {
      return this.err(err.message, raw, ctx, started);
    }
  }

  private static async tables(
    raw: string,
    ctx: QGMLContext,
    started: number
  ): Promise<EngineResult> {
    const db = this.connections["default"];
    if (!db) return this.err("DB not connected", raw, ctx, started);

    try {
      const rows = await db.unsafe(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public';
      `);

      return this.ok("Table list", raw, ctx, started, {
        tables: rows.map((r: any) => r.table_name)
      });
    } catch (err: any) {
      return this.err(err.message, raw, ctx, started);
    }
  }

  // ==================================================================
  // EngineResult helpers
  // ==================================================================
  private static ok(
    output: any,
    raw: string,
    ctx: QGMLContext,
    started: number,
    meta: any = {}
  ): EngineResult {
    return {
      ok: true,
      output,
      raw,
      engine: "db",
      executionId: ctx.executionId,
      duration: Date.now() - started,
      meta,
    };
  }

  private static err(
    error: string,
    raw: string,
    ctx: QGMLContext,
    started: number
  ): EngineResult {
    return {
      ok: false,
      error,
      raw,
      engine: "db",
      executionId: ctx.executionId,
      duration: Date.now() - started,
      meta: {},
    };
  }

  // simple embedding to make MemoryItem valid
  private static embed(text: string): number[] {
    return Array.from({ length: 16 }).map((_, i) => (text.charCodeAt(i % text.length) || 0) / 255);
  }
}

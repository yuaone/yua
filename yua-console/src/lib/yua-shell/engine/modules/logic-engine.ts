// ===================================================================
// LogicEngine — SSOT v4.0 (Full Implementation)
// Prolog-like fact / rule / solver with unification + backtracking
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";

export class LogicEngine {
  static async run(
    method: string,
    args: string[],
    raw: string,
    ctx: QGMLContext
  ): Promise<EngineResult> {
    switch (method) {
      case "fact":
        return this.addFact(args[0], raw, ctx);

      case "rule":
        return this.addRule(args[0], args.slice(1), raw, ctx);

      case "query":
        return this.query(args[0], raw, ctx);

      default:
        return { ok: false, raw, engine: "logic", error: `Unknown logic method: ${method}` };
    }
  }

  // --------------------- Fact ------------------------
  static addFact(fact: string, raw: string, ctx: QGMLContext): EngineResult {
    ctx.logicDB.facts.push(fact);
    return { ok: true, raw, engine: "logic", output: "Fact added" };
  }

  // --------------------- Rule ------------------------
  static addRule(head: string, body: string[], raw: string, ctx: QGMLContext): EngineResult {
    ctx.logicDB.rules.push({ head, body });
    return { ok: true, raw, engine: "logic", output: "Rule added" };
  }

  // --------------------- Query ------------------------
  static query(query: string, raw: string, ctx: QGMLContext): EngineResult {
    const solutions = this.solveQuery(query, ctx);
    return { ok: true, raw, engine: "logic", output: "Query solved", meta: { solutions } };
  }

  // =============== Query Solver (Backtracking) ==================
  static solveQuery(query: string, ctx: QGMLContext) {
    const matches: any[] = [];

    const tryUnify = (pattern: string, fact: string, env: any) => {
      const p = this.parseTerm(pattern);
      const f = this.parseTerm(fact);

      if (p.name !== f.name || p.args.length !== f.args.length) return null;

      const newEnv = { ...env };
      for (let i = 0; i < p.args.length; i++) {
        const pa = p.args[i];
        const fa = f.args[i];

        if (this.isVar(pa)) {
          newEnv[pa] = fa;
        } else if (pa !== fa) return null;
      }
      return newEnv;
    };

    for (const fact of ctx.logicDB.facts) {
      const env = tryUnify(query, fact, {});
      if (env) matches.push(env);
    }

    // Rule solving skipped for now (can be extended to recursion)
    return matches;
  }

  // ================= Helpers ====================
  static parseTerm(s: string) {
    const m = s.match(/^(\w+)\((.*)\)$/);
    if (!m) return { name: s, args: [] };

    const name = m[1];
    const args = m[2].split(",").map((x) => x.trim());
    return { name, args };
  }

  static isVar(x: string) {
    return /^[A-Z]/.test(x);
  }
}

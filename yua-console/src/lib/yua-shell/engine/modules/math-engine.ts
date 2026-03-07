// ===================================================================
// MathEngine — SSOT v4.0 (Final Version)
// High-precision scalar ops + vector + matrix + statistics
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";

export class MathEngine {
  static async run(
    method: string,
    args: string[],
    raw: string,
    _ctx: QGMLContext
  ): Promise<EngineResult> {
    try {
      switch (method) {
        case "add": return this.scalar(args, raw, (a, b) => a + b);
        case "mul": return this.scalar(args, raw, (a, b) => a * b);
        case "sub": return this.scalar(args, raw, (a, b) => a - b);
        case "div": return this.scalar(args, raw, (a, b) => a / b);

        case "dot": return this.dot(args, raw);
        case "vec_add": return this.vector(args, raw, (a, b) => a + b);
        case "vec_mul": return this.vector(args, raw, (a, b) => a * b);

        case "matmul": return this.matmul(args, raw);

        case "mean": return this.mean(args, raw);
        case "variance": return this.variance(args, raw);

        default:
          return { ok: false, raw, engine: "math", error: `Unknown math method '${method}'` };
      }
    } catch (err: any) {
      return { ok: false, raw, engine: "math", error: err?.message ?? String(err) };
    }
  }

  // ----------------------------------------------------------
  // scalar operations
  // ----------------------------------------------------------
  private static scalar(args: string[], raw: string, fn: (a: number, b: number) => number): EngineResult {
    const a = Number(args[0]);
    const b = Number(args[1]);
    if (isNaN(a) || isNaN(b)) return { ok: false, raw, engine: "math", error: "Invalid numeric arguments" };
    return { ok: true, raw, engine: "math", output: String(fn(a, b)) };
  }

  // ----------------------------------------------------------
  // vector operations
  // ----------------------------------------------------------
  private static vector(args: string[], raw: string, fn: (a: number, b: number) => number): EngineResult {
    const A = JSON.parse(args[0]);
    const B = JSON.parse(args[1]);

    if (!Array.isArray(A) || !Array.isArray(B) || A.length !== B.length) {
      return { ok: false, raw, engine: "math", error: "Vector shape mismatch" };
    }

    const result = A.map((v: number, i: number) => fn(v, B[i]));
    return { ok: true, raw, engine: "math", meta: { vector: result } };
  }

  // ----------------------------------------------------------
  // dot product
  // ----------------------------------------------------------
  private static dot(args: string[], raw: string): EngineResult {
    const A = JSON.parse(args[0]);
    const B = JSON.parse(args[1]);

    if (!Array.isArray(A) || !Array.isArray(B) || A.length !== B.length)
      return { ok: false, raw, engine: "math", error: "Dot shape mismatch" };

    const sum = A.reduce((acc: number, val: number, i: number) => acc + val * B[i], 0);
    return { ok: true, raw, engine: "math", output: String(sum) };
  }

  // ----------------------------------------------------------
  // matrix multiply
  // ----------------------------------------------------------
  private static matmul(args: string[], raw: string): EngineResult {
    const A = JSON.parse(args[0]);
    const B = JSON.parse(args[1]);

    if (!Array.isArray(A) || !Array.isArray(B))
      return { ok: false, raw, engine: "math", error: "Invalid matrix input" };

    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
      return { ok: false, raw, engine: "math", error: "Matrix dimension mismatch" };
    }

    const R = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

    for (let i = 0; i < rowsA; i++)
      for (let j = 0; j < colsB; j++)
        for (let k = 0; k < colsA; k++)
          R[i][j] += A[i][k] * B[k][j];

    return { ok: true, raw, engine: "math", meta: { matrix: R } };
  }

  // ----------------------------------------------------------
  // mean
  // ----------------------------------------------------------
  private static mean(args: string[], raw: string): EngineResult {
    const arr = JSON.parse(args[0]);
    if (!Array.isArray(arr)) return { ok: false, raw, engine: "math", error: "Invalid array input" };

    const avg = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
    return { ok: true, raw, engine: "math", output: String(avg) };
  }

  // ----------------------------------------------------------
  // variance
  // ----------------------------------------------------------
  private static variance(args: string[], raw: string): EngineResult {
    const arr = JSON.parse(args[0]);
    if (!Array.isArray(arr)) return { ok: false, raw, engine: "math", error: "Invalid array input" };

    const mean = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
    const variance = arr.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / arr.length;

    return { ok: true, raw, engine: "math", output: String(variance) };
  }
}

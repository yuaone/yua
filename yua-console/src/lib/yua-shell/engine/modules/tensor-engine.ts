// ===================================================================
// TensorEngine — SSOT v4.0 (Final Version)
// ndarray math: add, mul, matmul, reshape
// ===================================================================

import type { EngineResult } from "../../types/engine-result";
import type { QGMLContext } from "../../types/context";

export type Tensor = { data: number[]; shape: number[] };

export class TensorEngine {
  static async run(
    method: string,
    args: string[],
    raw: string,
    _ctx: QGMLContext
  ): Promise<EngineResult> {
    switch (method) {
      case "zeros": return this.zeros(args, raw);
      case "ones": return this.ones(args, raw);

      case "add":
      case "mul":
      case "matmul": return this.basicOp(method, args, raw);

      case "reshape": return this.reshape(args, raw);

      default:
        return { ok: false, raw, engine: "tensor", error: `Unknown tensor method '${method}'` };
    }
  }

  private static zeros(args: string[], raw: string): EngineResult {
    const shape = JSON.parse(args[0]);
    const size = shape.reduce((a: number, b: number) => a * b, 1);
    return { ok: true, raw, engine: "tensor", meta: { tensor: { data: Array(size).fill(0), shape } } };
  }

  private static ones(args: string[], raw: string): EngineResult {
    const shape = JSON.parse(args[0]);
    const size = shape.reduce((a: number, b: number) => a * b, 1);
    return { ok: true, raw, engine: "tensor", meta: { tensor: { data: Array(size).fill(1), shape } } };
  }

  private static basicOp(op: string, args: string[], raw: string): EngineResult {
    const A: Tensor = JSON.parse(args[0]);
    const B: Tensor = JSON.parse(args[1]);

    if (A.shape.length !== 1 || B.shape.length !== 1 || A.shape[0] !== B.shape[0]) {
      return { ok: false, raw, engine: "tensor", error: "Shape mismatch" };
    }

    const out = A.data.map((v, i) => (op === "add" ? v + B.data[i] : v * B.data[i]));
    return { ok: true, raw, engine: "tensor", meta: { tensor: { data: out, shape: A.shape } } };
  }

  private static reshape(args: string[], raw: string): EngineResult {
    const A: Tensor = JSON.parse(args[0]);
    const newShape = JSON.parse(args[1]);
    const newSize = newShape.reduce((a: number, b: number) => a * b, 1);

    if (newSize !== A.data.length)
      return { ok: false, raw, engine: "tensor", error: "Invalid reshape" };

    return { ok: true, raw, engine: "tensor", meta: { tensor: { data: A.data, shape: newShape } } };
  }
}

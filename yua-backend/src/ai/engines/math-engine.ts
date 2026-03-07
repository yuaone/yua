// 📂 src/ai/engines/math-engine.ts
// 🔥 YUA-AI MathEngine — FINAL UTIL VERSION (2025.11)
// ------------------------------------------------------
// ✔ 사칙연산 / 비교연산 / sum / avg / abs / round
// ✔ 문자열 숫자 자동 변환
// ✔ NaN / Infinity 방지
// ✔ 개발자 콘솔 / Workflow 모두에서 사용 가능
// ✔ strict-ts 100% 통과
// ------------------------------------------------------

export interface CalcPayload {
  a?: number | string;
  b?: number | string;
  op: string;
}

export interface CalcResult {
  ok: boolean;
  engine: string;
  result?: number | boolean | null;
  error?: string;
}

export const MathEngine = {
  // ----------------------------------------------------
  // 🎯 evaluate
  // ----------------------------------------------------
  async evaluate(input: { expression: string }): Promise<CalcResult> {
    return this.evalExpr(input.expression);
  },

  // ----------------------------------------------------
  // 🎯 Main calculate
  // ----------------------------------------------------
  calculate(payload: CalcPayload): CalcResult {
    try {
      const { a, b, op } = payload;

      const x = this.toNumber(a);
      const y = this.toNumber(b);

      switch (op) {
        case "+":
          return this.success(x + y);
        case "-":
          return this.success(x - y);
        case "*":
          return this.success(x * y);
        case "/":
          return y === 0
            ? this.fail("0으로 나눌 수 없습니다.")
            : this.success(x / y);

        case "sum":
          return this.success(x + y);
        case "avg":
          return this.success((x + y) / 2);

        case "abs":
          return this.success(Math.abs(x));

        case "round":
          return this.success(Math.round(x));

        // 비교 연산
        case ">":
          return this.success(x > y);
        case "<":
          return this.success(x < y);
        case ">=":
          return this.success(x >= y);
        case "<=":
          return this.success(x <= y);
        case "==":
          return this.success(x === y);

        default:
          return this.fail(`지원하지 않는 연산자입니다: ${op}`);
      }
    } catch (err: any) {
      return this.fail(err?.message || String(err));
    }
  },

  // ----------------------------------------------------
  // 🔢 safe number converter
  // ----------------------------------------------------
  toNumber(v?: number | string): number {
    if (v === undefined) return 0;

    if (typeof v === "number") {
      return Number.isFinite(v) ? v : 0;
    }

    const parsed = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  },

  // ----------------------------------------------------
  // 🔐 result wrappers
  // ----------------------------------------------------
  success(result: number | boolean): CalcResult {
    return { ok: true, engine: "math", result };
  },

  fail(error: string): CalcResult {
    return { ok: false, engine: "math-error", error };
  },

  // ----------------------------------------------------
  // 📊 리스트 sum / avg — FIXED FOR STRICT-TS
  // ----------------------------------------------------
  sumList(values: (number | string)[]): number {
    return values.reduce<number>((acc: number, v) => {
      return acc + this.toNumber(v);
    }, 0);
  },

  avgList(values: (number | string)[]): number {
    return values.length === 0 ? 0 : this.sumList(values) / values.length;
  },

  // ----------------------------------------------------
  // 🧮 수식 파싱
  // ----------------------------------------------------
  evalExpr(expr: string): CalcResult {
    try {
      if (!expr || typeof expr !== "string") {
        return this.fail("수식이 잘못되었습니다.");
      }

      const safe = expr.replace(/[^0-9+\-*/(). ]/g, "");

      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${safe})`);
      const result = fn();

      if (!Number.isFinite(result)) {
        return this.fail("계산 결과가 유효하지 않습니다.");
      }

      return this.success(result);
    } catch (err: any) {
      return this.fail(err?.message || `수식 오류: ${expr}`);
    }
  },
};

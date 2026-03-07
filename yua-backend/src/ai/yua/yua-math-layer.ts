/* --------------------------------------------------
 * mathjs loader (ESM-safe)
 * -------------------------------------------------- */

type MathJs = any;

let _math: MathJs | null = null;

async function loadMath(): Promise<MathJs> {
  if (!_math) {
    _math = await import("mathjs");
  }
  return _math;
}

/* --------------------------------------------------
 * TYPE DEFINITIONS
 * -------------------------------------------------- */

type AST = any;

type MathType =
  | "ARITHMETIC"
  | "EQUATION"
  | "NUMERIC"
  | "CALCULUS"
  | "UNKNOWN";

export interface MathRunInput {
  expression: string;
  context?: Record<string, number>;
}

export interface MathRunOutput {
  ok: boolean;
  verified: boolean;
  result?: number;
  errors?: string[];
  meta?: {
    executionTimeMs: number;
    toleranceUsed: number;
    checksPerformed: string[];
    ast?: string;
    simplifiedAst?: string;
    residualError?: number;
    equationMode?: boolean;
    mathType?: MathType;
  };
}

const DEFAULT_TOLERANCE = 1e-6;

/* --------------------------------------------------
 * SpineMathLayer
 * -------------------------------------------------- */

export class SpineMathLayer {
  private tolerance: number;
  private errors: string[] = [];
  private checks: string[] = [];

  constructor(tolerance: number = DEFAULT_TOLERANCE) {
    this.tolerance = tolerance;
  }

  async run(input: MathRunInput): Promise<MathRunOutput> {
    const math = await loadMath();

    const t0 = process.hrtime.bigint();
    this.errors = [];
    this.checks = [];

    let ast: AST | null = null;
    let simplified: AST | null = null;
    let result: number | undefined;
    let residual: number | undefined;
    let equationMode = false;
    let mathType: MathType = "UNKNOWN";

    try {
      ast = this.parse(math, input.expression);
      this.checks.push("parsed");

      if (input.expression.includes("=")) {
        equationMode = true;
        mathType = "EQUATION";
        ast = this.toZeroEquation(math, input.expression);
        this.checks.push("equation-normalized");
      }

      if (mathType === "UNKNOWN") {
        if (/d\/dx|∫|lim/.test(input.expression)) {
          mathType = "CALCULUS";
        } else if (/sin|cos|tan|log|sqrt|exp/.test(input.expression)) {
          mathType = "NUMERIC";
        } else if (/\d/.test(input.expression)) {
          mathType = "ARITHMETIC";
        }
      }

      simplified = this.simplify(math, ast);
      this.checks.push("simplified");

      result = this.numericSolve(math, simplified, input.context);
      this.checks.push("numeric-solved");

      this.detectContradictions(math, simplified, result);
      this.checks.push("contradiction-check");

      residual = this.substitutionResidual(math, simplified, input.context);
      const verified = residual < this.tolerance;

      if (!verified) {
        this.errors.push(
          `Residual ${residual} exceeds tolerance ${this.tolerance}`
        );
      }

      const t1 = process.hrtime.bigint();

      return {
        ok: true,
        verified,
        result,
        meta: {
          executionTimeMs: Number(t1 - t0) / 1e6,
          toleranceUsed: this.tolerance,
          checksPerformed: this.checks,
          ast: ast.toString(),
          simplifiedAst: simplified.toString(),
          residualError: residual,
          equationMode,
          mathType,
        },
      };
    } catch (e: any) {
      this.errors.push(e?.message ?? "unknown error");

      const t1 = process.hrtime.bigint();
      return {
        ok: false,
        verified: false,
        errors: this.errors,
        meta: {
          executionTimeMs: Number(t1 - t0) / 1e6,
          toleranceUsed: this.tolerance,
          checksPerformed: this.checks,
          ast: ast?.toString(),
          simplifiedAst: simplified?.toString(),
          equationMode,
          mathType,
        },
      };
    }
  }

  /* ---------- helpers ---------- */

  private parse(math: MathJs, expr: string): AST {
    return math.parse(expr);
  }

  private toZeroEquation(math: MathJs, expr: string): AST {
    const [lhs, rhs] = expr.split("=");
    if (!lhs || !rhs) throw new Error("Invalid equation");
    return math.parse(`(${lhs}) - (${rhs})`);
  }

  private simplify(math: MathJs, ast: AST): AST {
    try {
      return math.simplify(ast);
    } catch {
      this.errors.push("symbolic-simplify-failed");
      return ast;
    }
  }

  private numericSolve(
    math: MathJs,
    ast: AST,
    ctx?: Record<string, number>
  ): number {
    const v = ast.evaluate(ctx ?? {});
    if (typeof v === "number" && isFinite(v)) return v;
    if (math.isNumeric(v)) return math.number(v);
    throw new Error("Numeric evaluation failed");
  }

  private substitutionResidual(
    math: MathJs,
    ast: AST,
    ctx?: Record<string, number>
  ): number {
    try {
      const val = ast.evaluate(ctx ?? {});
      if (!math.isNumeric(val)) return Infinity;
      return Math.abs(math.number(val));
    } catch {
      return Infinity;
    }
  }

  private detectContradictions(
    math: MathJs,
    ast: AST,
    result?: number
  ) {
    if (result === undefined || !isFinite(result)) {
      throw new Error("Invalid numeric result");
    }

    ast.traverse((node: any) => {
      if (node.type === "OperatorNode" && node.op === "/") {
        try {
          const denom = node.args[1].evaluate({});
          if (denom === 0) throw new Error("Division by zero");
        } catch {}
      }
    });
  }
}

export default SpineMathLayer;

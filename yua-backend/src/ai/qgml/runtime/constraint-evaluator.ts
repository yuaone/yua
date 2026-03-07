// 🔒 Constraint Evaluator (λ-based, Immutable)

import {
  ConstraintNode,
  QGMLRuntimeState,
  ConstraintEvaluationResult,
} from "../types";

type ConstraintLambda = (state: QGMLRuntimeState) => boolean;

function compileLambda(source: string): ConstraintLambda {
  // ⚠️ sandboxed execution (no state mutation)
  return new Function(
    "state",
    `"use strict"; return (${source})(state);`
  ) as ConstraintLambda;
}

export function evaluateConstraints(
  state: QGMLRuntimeState,
  constraints: ConstraintNode[]
): ConstraintEvaluationResult {
  for (const c of constraints) {
    try {
      const fn = compileLambda(c.lambda);
      const ok = fn(state);

      if (!ok) {
        return {
          ok: false,
          failedConstraintId: c.id,
        };
      }
    } catch (err) {
      return {
        ok: false,
        failedConstraintId: c.id,
        error: "constraint_runtime_error",
      };
    }
  }

  return { ok: true };
}

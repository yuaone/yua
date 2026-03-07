// 📂 src/ai/hpe/hpe7/lambda.ts
// ------------------------------------------------------
// Latency-Aware Interference λ Calculator (Final)
// ------------------------------------------------------

import { safeNumber } from "../shared/math-safe";
import { HPE7HyperParams } from "./hpe7-protocol";

// exp 오버플로 방지
const MAX_EXP = 700;

export function computeLambda(
  latencyA: number,
  latencyB: number,
  params: HPE7HyperParams
): number {
  const { lambdaMax, lambdaDecayK, lambdaTau } = params;

  const delta = Math.abs(latencyA - latencyB); // ΔLatency

  // 🔥 Sigmoid 기반 Decay
  let x = lambdaDecayK * (delta - lambdaTau);

  // exp 오버플로 방지
  if (x > MAX_EXP) x = MAX_EXP;
  if (x < -MAX_EXP) x = -MAX_EXP;

  const denom = 1 + Math.exp(x);
  const λ = lambdaMax / denom;

  return safeNumber(λ);
}

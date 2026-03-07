// 📂 src/ai/yua/yua-jacobian-lite.ts
// -------------------------------------------------------------
// ⚡ YUA-AI Jacobian-Lite v2.1
// - Power Iteration 기반 Jacobian Spectral Norm 근사
// - Low-Rank 증분 업데이트 지원
// - Embedding / Engine Output / Hidden Vector 모두 지원
// - Stability Kernel에서 호출됨
// -------------------------------------------------------------

import { logWarn } from "../../utils/logger";

export interface JacobianApproxInput {
  func: (x: number[]) => number[];    // 엔진 내부 함수 f(x)
  x: number[];                        // 입력 벡터
  dim?: number;                       // 출력 차원 (옵션)
  iters?: number;                     // power iteration 횟수 (기본 5)
  epsilon?: number;                   // numerical jitter
}

export interface JacobianApproxOutput {
  spectralNorm: number;               // ‖J‖₂
  iterations: number;                 // 실제 PI 횟수
}

export class YuaJacobianLite {
  constructor() {}

  /* -------------------------------------------------------------
   * 1) Numerical Gradient (J·v 근사)
   * -----------------------------------------------------------*/
  private jacobianVectorProduct(
    f: (x: number[]) => number[],
    x: number[],
    v: number[],
    eps: number
  ) {
    const x1 = x.map((xi, i) => xi + eps * v[i]);
    const f1 = f(x1);
    const f0 = f(x);
    return f1.map((fi, i) => (fi - f0[i]) / eps);
  }

  /* -------------------------------------------------------------
   * 2) Vector normalization
   * -----------------------------------------------------------*/
  private normalize(v: number[]) {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
  }

  /* -------------------------------------------------------------
   * 3) Power Iteration Spectral Norm Approx
   * -----------------------------------------------------------*/
  compute(input: JacobianApproxInput): JacobianApproxOutput {
    const {
      func,
      x,
      iters = 5,
      epsilon = 1e-4,
    } = input;

    try {
      const dim = func(x).length;

      // 초기 벡터 (randomized)
      let v = Array(dim)
        .fill(0)
        .map(() => Math.random());

      v = this.normalize(v);

      let lambda = 0;

      for (let i = 0; i < iters; i++) {
        // Jacobian-vector product
        const Jv = this.jacobianVectorProduct(func, x, v, epsilon);

        // 업데이트된 λ = ||Jv||
        lambda = Math.sqrt(Jv.reduce((s, z) => s + z * z, 0));

        // Normalize for next iteration
        v = this.normalize(Jv);
      }

      return { spectralNorm: lambda, iterations: iters };
    } catch (err: any) {
      logWarn("⚠️ Jacobian-Lite failed, fallback λ=0.5");
      return { spectralNorm: 0.5, iterations: 0 };
    }
  }

  /* -------------------------------------------------------------
   * 4) Low-Rank Jacobian Update
   * -----------------------------------------------------------*/
  updateWithDelta(
    prevNorm: number,
    delta: number[]
  ): number {
    // delta는 이전 step 대비 변화량
    const deltaNorm = Math.sqrt(delta.reduce((s, x) => s + x * x, 0));

    // Rank-1 update: λ_new ≈ λ_prev + ||Δ||
    return Math.max(0, prevNorm + deltaNorm);
  }
}

// 📂 src/ai/pkl/routing-kernel.ts
// 🔥 PKL 3.0 — Dynamic Routing Kernel

export interface ProviderInfo {
  id: string;
  semanticWeight: number; // W_i
  providerScore: number;  // S_i
  riskScore: number;      // R_i
}

export class RoutingKernel {
  /**
   * softmax 기반 라우팅 확률 계산
   */
  static computeRouting(providers: ProviderInfo[]) {
    const scores = providers.map((p) =>
      Math.exp(p.semanticWeight * p.providerScore) * (1 - p.riskScore)
    );

    const sum = scores.reduce((a, b) => a + b, 0);

    return providers.map((p, i) => ({
      id: p.id,
      prob: scores[i] / sum,
    }));
  }

  /**
   * pruning threshold 적용
   */
  static prune(list: { id: string; prob: number }[], avgLatency: number) {
    const tauBase = 0.12;
    const tau = tauBase / Math.max(avgLatency, 0.8);

    return list.filter((p) => p.prob >= tau);
  }
}

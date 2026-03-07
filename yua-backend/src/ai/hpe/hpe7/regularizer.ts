// 📂 src/ai/hpe/hpe7/regularizer.ts
// ------------------------------------------------------
// Wasserstein Drift & Interference Regularizers (Final)
// ------------------------------------------------------

import { Distribution } from "./distribution";
import { computeLambda } from "./lambda";
import { PathScenario, HPE7HyperParams } from "./hpe7-protocol";
import { safeNumber } from "../shared/math-safe";

export const Regularizer = {
  // Drift Regularizer
  drift(paths: PathScenario[]): number {
    let sum = 0;
    for (const p of paths) {
      // HPE7 기준: prevScoreDistribution 사용
      const d = Distribution.drift(
        p.prevScoreDistribution,
        p.scoreDistribution
      );
      sum += safeNumber(d);
    }
    return safeNumber(sum);
  },

  // Interference
  interference(
    paths: PathScenario[],
    params: HPE7HyperParams,
    latencies: number[]
  ): number {
    let sum = 0;

    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const λ = computeLambda(latencies[i], latencies[j], params);
        const wDist = Distribution.interference(
          paths[i].scoreDistribution,
          paths[j].scoreDistribution
        );
        sum += safeNumber(λ * wDist);
      }
    }

    return safeNumber(sum);
  },

  // Total Regularizer
  total(paths: PathScenario[], params: HPE7HyperParams, latencies: number[]) {
    const driftVal = this.drift(paths);
    const interfVal = this.interference(paths, params, latencies);

    return {
      drift: driftVal,
      interference: interfVal,
      total: params.betaDrift * driftVal + params.betaInterf * interfVal
    };
  }
};

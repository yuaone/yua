// 📂 src/ai/hpe/hpe7/policy.ts
// ------------------------------------------------------
// HPE 7.0 — Rebalancing Policy (FINAL CLEAN VERSION)
// ------------------------------------------------------

import { EngineState, HPE7HyperParams } from "./hpe7-protocol";
import { Regularizer } from "./regularizer";
import { safeNumber } from "../shared/math-safe";

export class Policy {
  // ------------------------------------------------------
  // 1) RawScore 계산: (contextEMA ⊙ scenario.embedding)
  // ------------------------------------------------------
  static computeRawScores(state: EngineState): number[] {
    const C = state.contextEMA;
    const scores: number[] = [];

    for (const p of state.topKPaths) {
      let sum = 0;
      const v = p.embedding ?? [];

      for (let i = 0; i < C.length; i++) {
        const a = safeNumber(C[i]);
        const b = safeNumber(v[i] ?? 0);
        sum += a * b;
      }

      scores.push(safeNumber(sum));
    }

    return scores;
  }

  // ------------------------------------------------------
  // 2) Min-Max 정규화
  // ------------------------------------------------------
  static normalize(scores: number[]): number[] {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const denom = safeNumber(max - min) || 1;

    return scores.map((s) => safeNumber((s - min) / denom));
  }

  // ------------------------------------------------------
  // 3) Weight 업데이트
  // ------------------------------------------------------
  static updateWeights(
    weights: number[],
    scores: number[],
    params: HPE7HyperParams
  ): number[] {
    const lr = safeNumber(params.eta); // learningRate → eta

    return weights.map((w, i) => {
      const prev = safeNumber(w);
      const s = safeNumber(scores[i]);
      let newW = prev + lr * (s - prev);

      return Math.min(1, Math.max(0, safeNumber(newW)));
    });
  }

  // ------------------------------------------------------
  // 4) Policy 실행
  // ------------------------------------------------------
  static run(
    state: EngineState,
    params: HPE7HyperParams,
    latencies: number[]
  ) {
    const rawScores = this.computeRawScores(state);
    const normScores = this.normalize(rawScores);

    const reg = Regularizer.total(state.topKPaths, params, latencies);

    const weightsBefore = state.topKPaths.map((p) => p.weight ?? 0);

    const updatedWeights = this.updateWeights(
      weightsBefore,
      normScores,
      params
    );

    // state에 반영
    for (let i = 0; i < state.topKPaths.length; i++) {
      state.topKPaths[i].weight = updatedWeights[i];
    }

    const finalScores = updatedWeights.map((w, i) => safeNumber(w * normScores[i]));

    const bestIndex = finalScores.indexOf(Math.max(...finalScores));
    const bestScenario = state.topKPaths[bestIndex];

    return {
      rawScores,
      normScores,
      updatedWeights,
      finalScores,
      bestScenario,
      regularizer: reg
    };
  }
}

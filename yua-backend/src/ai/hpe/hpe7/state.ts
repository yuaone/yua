// 📂 src/ai/hpe/hpe7/state.ts
// ------------------------------------------------------
// HPE 7.0 State Manager — FINAL CLEAN VERSION
// ------------------------------------------------------

import { safeNumber } from "../shared/math-safe";
import { EngineState, PathScenario } from "./hpe7-protocol";

export class StateManager {
  private static emaState: Record<string, number> = {};

  // ------------------------------------------
  // 1) EMA 업데이트
  // ------------------------------------------
  static updateEMA(key: string, value: number, alpha = 0.05): number {
    const prev = this.emaState[key] ?? value;
    const newVal = alpha * safeNumber(value) + (1 - alpha) * safeNumber(prev);
    this.emaState[key] = newVal;
    return newVal;
  }

  // ------------------------------------------
  // 2) Context → EMA 벡터 생성
  // ------------------------------------------
  static buildContext(features: Record<string, number>): number[] {
    const keys = Object.keys(features);
    return keys.map((k) => this.updateEMA(k, features[k]));
  }

  // ------------------------------------------
  // 3) Minimal State Space 생성
  // ------------------------------------------
  static buildState(
    context: Record<string, number>,
    topKPaths: PathScenario[]
  ): EngineState {
    const C_EMA = this.buildContext(context);

    // Distribution 정렬 (prevScoreDistribution & scoreDistribution)
    for (const p of topKPaths) {
      p.scoreDistribution = [...p.scoreDistribution].sort((a, b) => a - b);
      p.prevScoreDistribution = [...p.prevScoreDistribution].sort((a, b) => a - b);
    }

    return {
      contextEMA: C_EMA,
      systemMetrics: context,
      topKPaths
    };
  }

  // ------------------------------------------
  // 4) 초기 상태 (context 불필요)
  // ------------------------------------------
  static buildInitialState(): EngineState {
    return {
      contextEMA: [],
      systemMetrics: {},
      topKPaths: []
    };
  }
}

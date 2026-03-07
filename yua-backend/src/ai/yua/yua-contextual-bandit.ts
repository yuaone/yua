// 📂 src/ai/yua/yua-contextual-bandit.ts
// ⚡ YUA-AI Contextual Bandit — FINAL v2.4 (StatePhase Aware, NON-BREAKING)

import { BanditState } from "./yua-types";

export type BanditEngineKey = "hpe" | "quantum" | "gen59";

export interface BanditOutput {
  weights: Record<BanditEngineKey, number>;
  debug: any;
}

export class YuaContextualBandit {
  private engineList: BanditEngineKey[] = ["hpe", "quantum", "gen59"];

  /**
   * θ 차원 설명
   * [0] jsDivergence
   * [1] dsConflict
   * [2] stabilityMu
   * [3] gen59Confidence
   * [4] statePhaseSignal (NEW, optional)
   */
  private theta: Record<BanditEngineKey, number[]> = {
    hpe: [0, 0, 0, 0, 0],
    quantum: [0, 0, 0, 0, 0],
    gen59: [0, 0, 0, 0, 0],
  };

  private alpha = 0.6;
  private learnRate = 0.05;

  constructor() {}

  // -------------------------------------------------------------
  // 1) encodeState — 기존 + statePhase feature (OPTIONAL)
  // -------------------------------------------------------------
  private encodeState(s: BanditState): number[] {
    // 🔥 안전한 비공식 접근 (타입 확장 없이)
    const phase: string | undefined =
      (s as any)?.aggregatedState?.statePhase ??
      (s as any)?.statePhase;

    /**
     * statePhase → numeric signal
     * STABLE = 0
     * SHIFT  = 0.5
     * RISK   = 1
     */
    const phaseSignal =
      phase === "RISK" ? 1 :
      phase === "SHIFT" ? 0.5 :
      0;

    return [
      s.jsDivergence,
      s.dsConflict,
      s.stabilityMu,
      s.gen59Confidence,
      phaseSignal, // NEW FEATURE (optional)
    ];
  }

  // -------------------------------------------------------------
  // 2) Linear-UCB (unchanged)
  // -------------------------------------------------------------
  private computeUcb(engine: BanditEngineKey, x: number[]): number {
    const θ = this.theta[engine];

    let base = 0;
    for (let i = 0; i < x.length; i++) {
      base += (θ[i] ?? 0) * x[i];
    }

    const bonus = this.alpha * Math.sqrt(
      x.reduce((a, xi) => a + xi * xi, 0)
    );

    return base + bonus;
  }

  // -------------------------------------------------------------
  // 3) Softmax (unchanged)
  // -------------------------------------------------------------
  private softmax(scores: Record<BanditEngineKey, number>) {
    const arr = this.engineList.map((e) => scores[e]);
    const max = Math.max(...arr);

    const expArr = arr.map((v) => Math.exp(v - max));
    const sum = expArr.reduce((a, b) => a + b, 0);

    const out: Record<BanditEngineKey, number> = {
      hpe: 0,
      quantum: 0,
      gen59: 0,
    };

    this.engineList.forEach((e, i) => {
      out[e] = expArr[i] / sum;
    });

    return out;
  }

  // -------------------------------------------------------------
  // 4) Online Learning (unchanged)
  // -------------------------------------------------------------
  private updateTheta(engine: BanditEngineKey, x: number[], reward: number) {
    const θ = this.theta[engine];

    for (let i = 0; i < θ.length; i++) {
      θ[i] += this.learnRate * reward * x[i];
    }

    this.theta[engine] = θ;
  }

  // -------------------------------------------------------------
  // 5) PUBLIC RUN (unchanged logic)
  // -------------------------------------------------------------
  async run(state: BanditState): Promise<BanditOutput> {
    const x = this.encodeState(state);

    const scores: Record<BanditEngineKey, number> = {
      hpe: this.computeUcb("hpe", x),
      quantum: this.computeUcb("quantum", x),
      gen59: this.computeUcb("gen59", x),
    };

    const weights = this.softmax(scores);

    let reward =
      1 -
      Math.min(1, state.jsDivergence) -
      Math.min(1, state.dsConflict);

    const mathType = state.mathType ?? "UNKNOWN";

    if (state.mathVerified === true) {
      reward +=
        mathType === "EQUATION" ? 0.4 :
        mathType === "NUMERIC"  ? 0.3 :
        mathType === "CALCULUS" ? 0.5 :
        0.2;
    }

    if (state.mathVerified === false) {
      reward -=
        mathType === "CALCULUS" ? 0.8 :
        mathType === "EQUATION" ? 0.6 :
        0.4;
    }

    // 안정성 클리핑 (학습 폭주 방지)
    reward = Math.max(-1, Math.min(1, reward));

    const best = this.engineList.reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    this.updateTheta(best, x, reward);

    return {
      weights,
      debug: {
        state,
        scores,
        reward,
        best,
        theta: this.theta,
        statePhaseSignal: x[4], // 디버깅 가시성
        mathSignal: state.mathVerified,
      },
    };
  }
}

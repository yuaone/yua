// src/ai/judgment/tpu/tpu-strategy-scorer.ts

import { TPUInputVector } from "./tpu-input-vector";
import { TPUStrategyScore } from "./tpu-score-result";

export class TPUStrategyScorer {
  async predict(input: TPUInputVector): Promise<TPUStrategyScore[]> {
    // PHASE 3: placeholder
    return [
      { strategy: "DEEP", score: Math.random() * 0.4 },
      { strategy: "NORMAL", score: Math.random() * 0.8 },
      { strategy: "FAST", score: Math.random() * 0.2 },
    ];
  }
}

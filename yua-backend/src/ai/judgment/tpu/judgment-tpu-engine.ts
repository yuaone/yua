// 🔥 TPU Judgment Engine — PHASE 3 CORE (SSOT SAFE)

import { TPUStrategyScorer } from "./tpu-strategy-scorer";
import { JudgmentRegistry } from "../judgment-registry";
import { updateRuleConfidenceWithTPU } from "./tpu-confidence-updater";
import { TPUInputVector } from "./tpu-input-vector";
import type { JudgmentRule } from "../judgment-rule";
import type { JudgmentTPUCallbacks } from "./judgment-tpu-bootstrap";

export class JudgmentTPUEngine {
  private scorer = new TPUStrategyScorer();

  constructor(
    private readonly registry: JudgmentRegistry,
    private readonly callbacks?: JudgmentTPUCallbacks
  ) {}

  /**
   * 🔁 TPU 가속 학습
   *
   * SSOT:
   * - TPU는 verdict를 생성하지 않는다
   * - Rule을 활성/비활성만 보조한다
   */
  async accelerate(input: TPUInputVector): Promise<void> {
    const scores = await this.scorer.predict(input);

    for (const rule of this.registry.getActive()) {
      if (rule.status === "disabled") continue;

      const beforeConfidence = rule.confidence;

      const updatedRule = updateRuleConfidenceWithTPU(
        rule,
        scores
      );

      this.registry.update(updatedRule);

      this.invokeCallbacks(
        rule,
        updatedRule,
        beforeConfidence
      );
    }
  }

  private invokeCallbacks(
    beforeRule: JudgmentRule,
    afterRule: JudgmentRule,
    beforeConfidence: number
  ): void {
    if (!this.callbacks) return;

    const delta =
      afterRule.confidence - beforeConfidence;

    // 🔒 실패는 거의 신호로 쓰지 않는다
    if (delta > 0.01) {
      this.callbacks.onSuccess?.(afterRule);
      }
  }
}

// 🔥 PHASE 4-D CORE
// Judgment Self-Learning Loop (SSOT FINAL)

import { JudgmentFailureStore } from "./judgment-failure-store";
import { JudgmentRegistry } from "./judgment-registry";
import { JudgmentRuleAutoGenerator } from "./judgment-rule-auto-generator";
import { JudgmentRuleGovernor } from "./judgment-rule-governor";
import {
  JudgmentLearningPolicy,
  DEFAULT_JUDGMENT_LEARNING_POLICY,
} from "./judgment-learning-policy";

export class JudgmentLearningLoop {
  private lastRunAt = 0;

  private autoGenerator: JudgmentRuleAutoGenerator;
  private governor: JudgmentRuleGovernor;

  constructor(
    private readonly failureStore: JudgmentFailureStore,
    private readonly registry: JudgmentRegistry,
    private readonly policy: JudgmentLearningPolicy =
      DEFAULT_JUDGMENT_LEARNING_POLICY
  ) {
    this.autoGenerator = new JudgmentRuleAutoGenerator(
      failureStore,
      registry
    );
    this.governor = new JudgmentRuleGovernor(registry);
  }

  /**
   * 🔁 학습 실행 여부 판단 + 실행
   *
   * ❗ ChatEngine에서는 이 메서드만 호출
   */
  maybeRun(params: {
    stream?: boolean;
  }): void {
    const now = Date.now();

    // 1️⃣ stream 중 실행 금지
    if (
      params.stream &&
      this.policy.allowDuringStream === false
    ) {
      return;
    }

    // 2️⃣ 실행 간격 보호
    if (now - this.lastRunAt < this.policy.minIntervalMs) {
      return;
    }

    // 3️⃣ failure 누적 기준
    const recentFailures =
      this.failureStore.getRecent(
        this.policy.minFailures
      );

    if (recentFailures.length < this.policy.minFailures) {
      return;
    }

    // 🔥 실제 학습 실행
    this.autoGenerator.run();
    this.governor.run();

    this.lastRunAt = now;
  }
}

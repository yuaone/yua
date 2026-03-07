// src/ai/judgment/judgment-singletons.ts
// 🔒 SSOT: Judgment 전역 싱글톤 모음 (PHASE 3 FINAL)

import { JudgmentRegistry } from "./judgment-registry";
import { bootstrapJudgmentTPU } from "./tpu/judgment-tpu-bootstrap";
import {
  penalizeRule,
  reinforceRule,
} from "./judgment-lifecycle";
import { JudgmentRule } from "./judgment-rule";

export const judgmentRegistry = new JudgmentRegistry();

export const judgmentTPUEngine = bootstrapJudgmentTPU(
  judgmentRegistry,
  {
    onSoftFailure(rule: JudgmentRule) {
      judgmentRegistry.update(
        penalizeRule(rule, "soft")
      );
    },
    onHardFailure(rule: JudgmentRule) {
      judgmentRegistry.update(
        penalizeRule(rule, "hard")
      );
    },
    onSuccess(rule: JudgmentRule) {
      judgmentRegistry.update(
        reinforceRule(rule)
      );
    },
  }
);

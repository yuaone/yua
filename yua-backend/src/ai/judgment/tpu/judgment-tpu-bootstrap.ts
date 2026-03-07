// src/ai/judgment/tpu/judgment-tpu-bootstrap.ts

import { JudgmentRegistry } from "../judgment-registry";
import { JudgmentTPUEngine } from "./judgment-tpu-engine";
import { JudgmentRule } from "../judgment-rule";

export type JudgmentTPUCallbacks = {
  onSoftFailure?: (rule: JudgmentRule) => void;
  onHardFailure?: (rule: JudgmentRule) => void;
  onSuccess?: (rule: JudgmentRule) => void;
};

export function bootstrapJudgmentTPU(
  registry: JudgmentRegistry,
  callbacks?: JudgmentTPUCallbacks
) {
  return new JudgmentTPUEngine(registry, callbacks);
}

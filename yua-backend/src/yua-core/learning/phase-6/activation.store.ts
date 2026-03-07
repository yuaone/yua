// 🔒 YUA SSOT — Activation Store (PHASE 6)
// 목적: 활성화 상태는 항상 명시적이어야 한다

import { ActivationPlan } from "./activation.types";

const activationStore = new Map<string, ActivationPlan>();

export const ActivationStore = {
  set(plan: ActivationPlan): void {
    activationStore.set(plan.candidateId, plan);
  },

  get(candidateId: string): ActivationPlan | undefined {
    return activationStore.get(candidateId);
  },

  list(): ReadonlyArray<ActivationPlan> {
    return Array.from(activationStore.values());
  },
};

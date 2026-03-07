// 🔒 YUA SSOT — Activation Executor (PHASE 6)
// 목적: 활성화는 "실행"이 아니라 "허용 상태 전환"이다

import { ActivationPlan } from "./activation.types";
import { ActivationStore } from "./activation.store";

export function activateCandidate(plan: ActivationPlan): ActivationPlan {
  const now = Date.now();

  const activated: ActivationPlan = {
    ...plan,
    activatedAt: now,
  };

  ActivationStore.set(activated);
  return activated;
}

export function rollbackCandidate(
  candidateId: string
): ActivationPlan | null {
  const existing = ActivationStore.get(candidateId);
  if (!existing) return null;

  const rolledBack: ActivationPlan = {
    ...existing,
    mode: "ROLLED_BACK",
    rolledBackAt: Date.now(),
  };

  ActivationStore.set(rolledBack);
  return rolledBack;
}

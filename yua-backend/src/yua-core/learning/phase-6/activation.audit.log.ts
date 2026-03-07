// 🔒 YUA SSOT — Activation Audit Log (PHASE 6)
// 목적: 언제, 왜, 누가 활성화/중단했는지 영구 기록

import { ActivationPlan } from "./activation.types";

const activationAuditLog: ActivationPlan[] = [];

export const ActivationAuditLog = {
  record(plan: ActivationPlan): void {
    activationAuditLog.push(plan);
  },

  list(): ReadonlyArray<ActivationPlan> {
    return activationAuditLog;
  },
};

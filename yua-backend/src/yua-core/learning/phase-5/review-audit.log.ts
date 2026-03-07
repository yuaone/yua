// 🔒 YUA SSOT — Review Audit Log (PHASE 5)
// 목적: 모든 판단은 "되돌릴 수 있고 설명 가능"해야 한다

import { ReviewResult } from "./review-decision.types";

const auditLog: ReviewResult[] = [];

export const ReviewAuditLog = {
  record(result: ReviewResult): void {
    auditLog.push(result);
  },

  list(): ReadonlyArray<ReviewResult> {
    return auditLog;
  },
};

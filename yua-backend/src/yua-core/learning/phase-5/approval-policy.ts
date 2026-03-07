// 🔒 YUA SSOT — Approval Policy (PHASE 5)
// 목적: "언제 승인되는가"를 코드로 봉인

import { ReviewDecision, ReviewerRole } from "./review-decision.types";

interface ApprovalContext {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reviews: {
    role: ReviewerRole;
    decision: ReviewDecision;
  }[];
}

export function evaluateApproval(
  ctx: ApprovalContext
): ReviewDecision {
  // ❌ CRITICAL은 자동 승인 불가
  if (ctx.severity === "CRITICAL") {
    return "HOLD";
  }

  const approvedByAdmin = ctx.reviews.some(
    (r) =>
      r.role === "ENGINE_ADMIN" &&
      r.decision === "APPROVE"
  );

  const approvedBySafety = ctx.reviews.some(
    (r) =>
      r.role === "SAFETY_OFFICER" &&
      r.decision === "APPROVE"
  );

  if (approvedByAdmin && approvedBySafety) {
    return "APPROVE";
  }

  if (ctx.reviews.some((r) => r.decision === "REJECT")) {
    return "REJECT";
  }

  return "HOLD";
}

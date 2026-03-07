// 🔒 YUA SSOT — Review Decision Types (PHASE 5)

export type ReviewDecision =
  | "APPROVE"
  | "REJECT"
  | "HOLD";

export type ReviewerRole =
  | "ENGINE_ADMIN"
  | "SAFETY_OFFICER"
  | "DOMAIN_OWNER";

export interface ReviewResult {
  candidateId: string;
  reviewerRole: ReviewerRole;
  decision: ReviewDecision;
  reason: string;
  reviewedAt: number;
}

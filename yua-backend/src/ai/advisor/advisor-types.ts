// 📂 src/ai/advisor/advisor-types.ts
// 🔥 YUA-AI — Advisor Types (2025.11 FINAL)
// -------------------------------------------------------------
// AdvisorEngine에서 사용하는 모든 타입을 통합 관리
// Strict mode 100% 통과
// -------------------------------------------------------------

export type AdvisorMode =
  | "default"
  | "developer"
  | "tax"
  | "risk"
  | "architecture";

export type AdvisorDomain =
  | "general"
  | "security_risk"
  | "tax_accounting"
  | "system_architecture"
  | "software_engineering"
  | "legal";

export interface AdvisorRequest {
  userMessage: string;
  projectId?: string;
  mode?: AdvisorMode;
}

export interface AdvisorResponse {
  ok: boolean;
  result: string;
  riskScore?: string;
  domain?: AdvisorDomain;
}

// 🔒 YUA SSOT — Activation Types (PHASE 6)

export type ActivationMode =
  | "SHADOW"
  | "LIMITED"
  | "FULL"
  | "ROLLED_BACK";

export interface ActivationPlan {
  candidateId: string;
  mode: ActivationMode;
  rolloutPercentage: number; // 0 ~ 100
  activatedAt?: number;
  rolledBackAt?: number;
}

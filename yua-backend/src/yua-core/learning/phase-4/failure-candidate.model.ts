// 🔒 YUA SSOT — Failure Learning Candidate Model (PHASE 4)
// 목적: "학습 가능한 실패 후보"의 유일한 정형 스키마

export type FailureSource =
  | "JUDGMENT"
  | "SILENCE"
  | "TOOL"
  | "RUNTIME"
  | "ENGINE";

export type FailureSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface FailureCandidate {
  // 🔑 식별
  candidateId: string;
  createdAt: number;

  // 📍 발생 위치
  source: FailureSource;
  engine?: string;
  path?: string;
  mode?: string;

  // 📊 이산 신호
  verdict?: string;
  confidence?: number;
  riskScore?: number;
  uncertainty?: number;

  // ⚠️ 평가
  severity: FailureSeverity;
  reasonCode: string;

  // 🔒 절대 포함 금지
  // - prompt
  // - answer
  // - user text
  // - embedding
}

// 🔒 YUA SSOT — Failure Candidate Generator (PHASE 4)
// 목적: 런타임 실패 신호를 "학습 후보"로만 변환

import { randomUUID } from "crypto";
import {
  FailureCandidate,
  FailureSeverity,
  FailureSource,
} from "./failure-candidate.model";

interface FailureSignalInput {
  source: FailureSource;
  engine?: string;
  path?: string;
  mode?: string;

  verdict?: string;
  confidence?: number;
  riskScore?: number;
  uncertainty?: number;

  reasonCode: string;
}

export function generateFailureCandidate(
  input: FailureSignalInput
): FailureCandidate {
  return {
    candidateId: randomUUID(),
    createdAt: Date.now(),

    source: input.source,
    engine: input.engine,
    path: input.path,
    mode: input.mode,

    verdict: input.verdict,
    confidence: clamp(input.confidence),
    riskScore: clamp(input.riskScore),
    uncertainty: clamp(input.uncertainty),

    severity: classifySeverity(input),
    reasonCode: input.reasonCode,
  };
}

/* -------------------------------------------------- */
/* 🔧 Helpers                                         */
/* -------------------------------------------------- */

function clamp(v?: number): number | undefined {
  if (typeof v !== "number") return undefined;
  if (!Number.isFinite(v)) return undefined;
  return Math.max(0, Math.min(1, Number(v.toFixed(4))));
}

function classifySeverity(
  input: FailureSignalInput
): FailureSeverity {
  if (input.verdict === "BLOCK") return "CRITICAL";
  if ((input.riskScore ?? 0) > 0.85) return "HIGH";
  if ((input.confidence ?? 1) < 0.4) return "MEDIUM";
  return "LOW";
}

// 🔥 TPU Input Vector — PHASE 3 SSOT FINAL (SAFE)

import type { PathType } from "../../../routes/path-router";
import type { FailureStage } from "../judgment-failure-log";

/**
 * 🔒 TPUInputVector
 *
 * SSOT:
 * - verdict 정보 포함 ❌
 * - confidence는 "사전 신호"일 뿐 판단 근거 아님
 */
export interface TPUInputVector {
  inputEmbedding: number[];

  domain: string;

  difficulty: number;

  pathHint: PathType;

  /* Failure Signals */
  softFailure?: boolean;
  hardFailure?: boolean;
  failureReason?: string;
  failureStage?: FailureStage;

  /* Path Signals */
  pathCorrected?: boolean;
  originalPath?: PathType;
  correctedPath?: PathType;

  /* Confidence Hints (Non-authoritative) */
  confidence?: number;

  hasUrl?: boolean;
  documentCount?: number;
  researchIntent?: boolean;

  timestamp?: number;
}

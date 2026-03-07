import type { PathType } from "../../routes/path-router";

export type FailureStage =
  | "path-router"
  | "document"
  | "generation"
  | "vision"
  | "engine"
  | "capability";

export type JudgmentFailureType =
  | "soft"
  | "hard"
  | "claim-boundary";

export interface JudgmentFailureLog {
  id: string;

  input: string;

  path: PathType;
  correctedPath?: PathType;

  confidence: number;
  reason: string;

  type: JudgmentFailureType;

  stage: FailureStage;

  /**
   * 🔥 PHASE 6
   * Claim Boundary 위반 기록용
   */
  boundary?: "CANNOT_ASSERT" | "CAN_SUGGEST" | "CAN_ASSERT";

  timestamp: number;
}

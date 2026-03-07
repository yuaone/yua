// 🔒 QGML RUNTIME CORE TYPES — SSOT FINAL

import { QGMLRuntimeState } from "./qgml-state";

export type ConstraintLambda = (state: QGMLRuntimeState) => boolean;

export interface ConstraintEvaluationResult {
  ok: boolean;
  failedConstraintId?: string;
  error?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
}

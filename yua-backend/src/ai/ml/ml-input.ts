  import type { PathType } from "../../routes/path-router";
import type { DecisionDomain } from "../decision-assistant/decision-domain";


export interface MLInput {
  // 🔒 필수
  path: PathType;
  baseConfidence: number;

  // 🔹 보조 (허용)
  domain?: any;
  contentLength?: number;
  hasSensitiveKeyword?: boolean;
  hasCodeBlock?: boolean;
  suggestedPath?: PathType;
  confidenceHint?: number;
  retryCount?: number;
}
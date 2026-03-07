import type { PathType } from "../../routes/path-router";
import type { DecisionDomain } from "./decision-domain";

export interface DecisionInputContext {
  threadId?: number;

  decisionDomain: DecisionDomain;
  contentLength: number;

  hasSensitiveKeyword: boolean;
  hasCodeBlock: boolean;

  suggestedPath: PathType;

  userRole?: string;
  metadata: Record<string, unknown>;
}
    
import type { PathType } from "../../routes/path-router";
import type { DecisionDomain } from "./decision-domain";
import type { DecisionResult } from "./decision-result";
import type { ToolGateDecision } from "../tools/tool-types";

export interface DecisionContext {
  sanitizedMessage: string;

  decisionDomain: DecisionDomain;
  path: PathType;

  decision: DecisionResult;
  anchorConfidence: number;

  toolGate?: ToolGateDecision;

  traceId: string;
  threadId?: number;
}

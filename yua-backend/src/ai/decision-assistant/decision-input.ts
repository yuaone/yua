import type { PathType } from "../../routes/path-router";
import type { DecisionDomain } from "./decision-domain";
import type { DecisionInputContext } from "./decision-input-context";

export interface RawDecisionInput {
  threadId?: number;
  domain: DecisionDomain;
  content: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

export function buildDecisionInputContext(
  input: RawDecisionInput
): DecisionInputContext {
  const content = input.content;

  const hasSensitiveKeyword =
    /(계약|법적|위험|배포|삭제|권한|root|sudo|rm\s+-rf)/i.test(content);

  const hasCodeBlock =
    /```|function\s+|class\s+|import\s+|SELECT\s+/i.test(content);

  let suggestedPath: PathType = "FAST";
  if (input.domain === "CODE" || hasSensitiveKeyword) {
    suggestedPath = "DEEP";
  }

  return {
    threadId: input.threadId,
    decisionDomain: input.domain,
    contentLength: content.length,
    hasSensitiveKeyword,
    hasCodeBlock,
    suggestedPath,
    userRole: input.userRole,
    metadata: input.metadata ?? {},
  };
}

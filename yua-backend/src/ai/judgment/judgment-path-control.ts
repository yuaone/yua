// 📂 src/ai/judgment/judgment-path-control.ts

import type { PathType } from "../../routes/path-router";
import { applyRuleDecay } from "./judgment-lifecycle";
import { judgmentRegistry } from "./judgment-singletons";
import { JudgmentFailureStore } from "./judgment-failure-store";
import { judgmentMetrics } from "./judgment-metrics";
import { StreamEngine } from "../engines/stream-engine";
import { inferDecisionRiskML } from "../ml/decision-ml-bridge";
import { decideToolGate } from "../tools/tool-gate";
import type { MLInput } from "../ml/ml-input";

export const judgmentFailureStore = new JudgmentFailureStore();

export async function applyJudgmentToPath(params: {
  input: string;
  initialPath: PathType;
  instanceId: string;
  threadId?: number;
  decisionCtx?: {
    domain?: any;
    contentLength?: number;
    hasSensitiveKeyword?: boolean;
    hasCodeBlock?: boolean;
    confidenceHint?: number;
  };
}): Promise<PathType> {
  const { input, initialPath, instanceId, threadId } = params;

  if (initialPath !== "DEEP") {
    return initialPath;
  }

  let path: PathType = "DEEP";
  const hasUrl = /(https?:\/\/)/i.test(input);

  const mlInput: MLInput = {
    path: initialPath,
    baseConfidence: params.decisionCtx?.confidenceHint ?? 0.6,
    domain: params.decisionCtx?.domain ?? "SYSTEM",
    contentLength: params.decisionCtx?.contentLength ?? input.length,
    hasSensitiveKeyword:
      params.decisionCtx?.hasSensitiveKeyword ??
      /(계약|법적|위험|삭제|권한|sudo|rm\s+-rf|drop\s+table)/i.test(input),
    hasCodeBlock:
      params.decisionCtx?.hasCodeBlock ??
      /```|function\s+|class\s+|import\s+|export\s+/i.test(input),
  };

  const riskRes = await inferDecisionRiskML(mlInput);
  const risk = riskRes?.risk ?? 0;

  if (riskRes?.level === "HIGH") {
    path = "NORMAL";

    await judgmentFailureStore.addSoftFailure({
      instanceId,
      input,
      originalPath: initialPath,
      correctedPath: path,
      confidence: 0.6,
      reason: "ml_path_risk_high",
      stage: "judgment",
    });

    judgmentMetrics.recordHit("ml_path_risk", "DEEP→NORMAL");

    if (threadId) {
await StreamEngine.publish(threadId, {
  event: "stage",
  stage: "system",
  topic: "decision.path.adjusted",
  token: "안정성을 위해 처리 깊이를 낮췄어요.",
});
    }
  }

  decideToolGate({
    domain: mlInput.domain,
    path,
    baseConfidence: mlInput.baseConfidence,
    risk,
    hasSensitiveKeyword: mlInput.hasSensitiveKeyword ?? false,
    hasCodeBlock: mlInput.hasCodeBlock ?? false,
    hasUrl,
  });

  for (const rule of judgmentRegistry.getActive()) {
    if (!rule.match(input)) continue;

    judgmentMetrics.recordHit(rule.id, rule.triggerHint);

    if (rule.type === "block") {
      path = "NORMAL";
    }

    judgmentRegistry.update(applyRuleDecay(rule));
  }

  return path;
}

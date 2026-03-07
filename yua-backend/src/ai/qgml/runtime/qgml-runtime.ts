  // 🔒 QGML Runtime — PHASE 1 FINAL (SSOT, TYPE-SAFE)

import {
  QGMLAST,
  QGMLVerdict,
  QGMLRuntimeState,
} from "../types";

import { loadWorldState } from "./world-loader";
import { loadEmotionState } from "./emotion-loader";
import { loadMemoryState } from "./memory-loader";
import { evaluateConstraints } from "./constraint-evaluator";
import { evaluatePolicies } from "./policy-evaluator";

import { StreamEngine } from "../../engines/stream-engine";

export function runQGMLRuntime(
  ast: QGMLAST,
  threadId: number
): QGMLVerdict {

  // QGML Init (internal)
  StreamEngine.publish(threadId, {
    stage: "memory",
    event: "stage",
    topic: "qgml.init",
    internal: true,
  });

  const state: QGMLRuntimeState = {
    world: loadWorldState(ast.world),
    emotion: loadEmotionState(ast.emotion),
    memory: loadMemoryState(ast.memory),
    timestamp: Date.now(),
  };

  StreamEngine.publish(threadId, {
    stage: "memory",
    event: "stage",
    topic: "qgml.state.ready",
    internal: true,
  });

  /* ---------- CONSTRAINT ---------- */
  if (ast.constraint?.length) {
    const result = evaluateConstraints(state, ast.constraint);

    StreamEngine.publish(threadId, {
      stage: "memory",
      event: "stage",
      topic: "constraint.checked",
      internal: true,
    });

    if (!result.ok) {
      StreamEngine.publish(threadId, {
event: "final",
stage: "answer",
finalText: "요청을 검토한 결과, 현재 조건에서는 진행이 어려울거같아.",
final: true,
      });

      return {
        allowed: false,
        blocked: true,
        deferred: false,
        reason: result.failedConstraintId,
      };
    }
  }

  /* ---------- POLICY ---------- */
  if (ast.policy?.length) {
    const policyResult = evaluatePolicies(state, ast.policy);

    StreamEngine.publish(threadId, {
      stage: "memory",
      event: "stage",
      topic: "policy.checked",
      internal: true,
    });

    if (!policyResult.allowed) {
      StreamEngine.publish(threadId, {
        stage: "answer",
        event: "final",
finalText: "보안 및 운영 기준을 고려했을 때, 해당 요청은 허용할 수 없어 조금 더 보완 해야할거같아.",
        final: true,
      });

      return {
        allowed: false,
        blocked: true,
        deferred: false,
        reason: policyResult.reason,
      };
    }
  }

  return {
    allowed: true,
    blocked: false,
    deferred: false,
  };
}

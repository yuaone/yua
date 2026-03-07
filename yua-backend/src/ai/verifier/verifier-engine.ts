// 🔒 VERIFIER ENGINE — SSOT FINAL (PHASE 6-2)
// -----------------------------------------
// 책임:
// - verifier-rules를 사용해 "검증 결과"를 단일 포맷으로 반환
// - downstream(LLM/Prompt/Executor)이 사용할 수 있는 confidence/structure 제공
//
// 금지:
// - LLM 의존 ❌
// - async ❌ (여기선 순수 동기 계산)
// - side effect ❌
// - 코드 생성 ❌

import type { TaskKind } from "../task/task-kind";
import type { ReasoningResult } from "../reasoning/reasoning-engine";
import {
  verifyForTask,
  type CodeContextLike,
  type VerifierOutput,
} from "./verifier-rules";

/* -------------------------------------------------- */
/* Engine Output                                       */
/* -------------------------------------------------- */

export type VerifierEngineResult =
  | {
      ok: true;
      confidence: number; // 0~1
      result: VerifierOutput;
    }
  | {
      ok: false;
      confidence: number; // 0~1 (낮게)
      reason: string;
      detail?: unknown;
    };

/* -------------------------------------------------- */
/* Engine Input                                        */
/* -------------------------------------------------- */

export interface VerifierEngineInput {
  task: TaskKind;
  context: CodeContextLike;
  reasoning: ReasoningResult;
}

/* -------------------------------------------------- */
/* Core                                                */
/* -------------------------------------------------- */

export function runVerifierEngine(
  input: VerifierEngineInput
): VerifierEngineResult {
  const { task, context, reasoning } = input;

  // 🔒 기본 confidence는 Reasoning을 존중하되 verifier 신호로 보정
  const base = clamp01(Number(reasoning.confidence ?? 0));

  // 컨텍스트가 부족하면 confidence를 강제로 낮춘다 (과대확신 방지)
  const penalty =
    (task === "TYPE_ERROR_FIX" || task === "RUNTIME_ERROR_FIX" || task === "CODE_REVIEW") &&
    (context.hasCode !== true || (task !== "CODE_REVIEW" && context.hasErrorLog !== true))
      ? 0.35
      : 0;

  const preConfidence = clamp01(base - penalty);

  const verified = verifyForTask({
    task,
    message: "", // rules 내부에서 message를 쓰고 싶으면 여기 확장
    context,
  });

  // 룰 기반 ok 판단 실패
  if (!verified.ok) {
    return {
      ok: false,
      confidence: clamp01(preConfidence * 0.6),
      reason: verified.reason ?? "verification_failed",
      detail: verified.output,
    };
  }

  // ok일 때 confidence를 약간 보정 (컨텍스트 충분 + 에러 분류 명확)
  const boost = computeBoost(task, verified.output, context);
  const finalConfidence = clamp01(preConfidence + boost);

  return {
    ok: true,
    confidence: finalConfidence,
    result: verified.output,
  };
}

/* -------------------------------------------------- */
/* Helpers                                             */
/* -------------------------------------------------- */

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function computeBoost(
  task: TaskKind,
  output: VerifierOutput,
  context: CodeContextLike
): number {
  // 보수적 boost: 과대확신 방지
  let b = 0;

  const hasTypeIssue = output.issues.some((i) => i.kind === "TYPE_ERROR");
  const hasRuntimeIssue = output.issues.some((i) => i.kind === "RUNTIME_ERROR");
  const missing = output.issues.some((i) => i.kind === "MISSING_CONTEXT");

  if (missing) return 0;

  if (task === "CODE_REVIEW" && context.hasCode) {
    b += 0.08;
  }

  if (task === "TYPE_ERROR_FIX" && context.hasCode && context.hasErrorLog && hasTypeIssue) {
    b += 0.12;
  }

  if (task === "RUNTIME_ERROR_FIX" && context.hasCode && context.hasErrorLog && hasRuntimeIssue) {
    b += 0.10;
  }

  // safeToGenerateFix면 조금 추가 (하지만 과하게 올리진 않음)
  if (output.safeToGenerateFix) {
    b += 0.06;
  }

  return b;
}

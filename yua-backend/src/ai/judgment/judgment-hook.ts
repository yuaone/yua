// 🔒 Judgment Path Control — FINAL SSOT (Streamless)
// 역할: Path 교정 / 차단 / 실패 신호 생성
// ❌ 판단 없음
// ❌ Stream / Narration 제거
// ⭕ Silent control only

import type { PathType } from "../../routes/path-router";
import { applyRuleDecay } from "./judgment-lifecycle";
import { judgmentRegistry } from "./judgment-singletons";
import { JudgmentFailureStore } from "./judgment-failure-store";
import { judgmentMetrics } from "./judgment-metrics";

/* ================================================== */
/* 🔒 Global Failure Store (SSOT)                      */
/* ================================================== */

export const judgmentFailureStore =
  new JudgmentFailureStore();

/* ================================================== */
/* 🔁 Judgment Hook — Path Control                    */
/* ================================================== */

export async function applyJudgmentToPath(
  params: {
    input: string;
    initialPath: PathType;
    instanceId: string;
    threadId?: number; // 유지 (호환성)
  }
): Promise<PathType> {
  const { input, initialPath, instanceId } = params;

  let path: PathType = initialPath;

  const hasUrl = /(https?:\/\/)/i.test(input);
  const hasResearchIntent =
    /(분석|비교|리서치|연구|차이|공통|vs|evaluate|analyze)/i.test(input);

  /* -------------------------------------------------- */
  /* SEARCH ↔ RESEARCH 자동 교정 (SSOT)                 */
  /* -------------------------------------------------- */

  if (path === "SEARCH" && hasResearchIntent) {
    const corrected: PathType = "RESEARCH";

    await judgmentFailureStore.addSoftFailure({
      instanceId,
      input,
      originalPath: initialPath,
      correctedPath: corrected,
      confidence: 0.7,
      reason: "search_to_research_correction",
      stage: "path-router",
    });

    judgmentMetrics.recordHit(
      "path_correction",
      "SEARCH→RESEARCH"
    );

    path = corrected;
  }

  if (path === "RESEARCH" && hasUrl && !hasResearchIntent) {
    const corrected: PathType = "SEARCH";

    await judgmentFailureStore.addSoftFailure({
      instanceId,
      input,
      originalPath: initialPath,
      correctedPath: corrected,
      confidence: 0.7,
      reason: "research_to_search_correction",
      stage: "path-router",
    });

    judgmentMetrics.recordHit(
      "path_correction",
      "RESEARCH→SEARCH"
    );

    path = corrected;
  }

  /* -------------------------------------------------- */
  /* Rule Registry 기반 차단 / 지연                     */
  /* -------------------------------------------------- */

  for (const rule of judgmentRegistry.getActive()) {
    if (!input.includes(rule.triggerHint)) continue;

    judgmentMetrics.recordHit(
      rule.id,
      rule.triggerHint
    );

    // 🚫 차단 규칙
    if (rule.type === "block" && path === "DEEP") {
      await judgmentFailureStore.addHardFailure({
        instanceId,
        input,
        originalPath: initialPath,
        correctedPath: "NORMAL",
        reason: "blocked_by_judgment_rule",
        stage: "path-router",
      });

      judgmentMetrics.recordFailure(
        rule.id,
        "hard"
      );

      path = "NORMAL";
    }

    // ⏳ 지연 규칙
    if (rule.type === "defer" && path === "FAST") {
      path = "NORMAL";
    }

    // 🔁 Rule decay (SSOT)
    judgmentRegistry.update(
      applyRuleDecay(rule)
    );
  }

  return path;
}

/* ================================================== */
/* 🔁 Capability → Judgment Feedback (SSOT FINAL)     */
/* ================================================== */

/**
 * Capability Engine 결과를 Judgment 학습 신호로 전달
 *
 * 원칙:
 * - Capability는 판단하지 않는다 ❌
 * - confidence / context만 전달 ⭕
 * - 해석 및 rule 진화는 Judgment Layer 책임
 * - UI / Stream / User feedback ❌
 */
export async function feedbackFromCapability(params: {
  instanceId: string;
  input: string;
  path: PathType;
  confidence: number;
  reason: string;
  stage: "vision" | "engine" | "capability";
}): Promise<void> {
  const {
    instanceId,
    input,
    path,
    confidence,
    reason,
    stage,
  } = params;

  // 🔽 confidence 낮음 → soft failure
  if (confidence < 0.5) {
    await judgmentFailureStore.addSoftFailure({
      instanceId,
      input,
      originalPath: path,
      confidence,
      reason,
      stage,
    });

    judgmentMetrics.recordFailure(
      reason,
      "soft"
    );
  }

  // 🔼 성공 케이스는 기록하지 않음 (SSOT)
}

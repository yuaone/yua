// 🔒 YUA generateResponse — SSOT v1.1 FINAL (UPGRADED)
// --------------------------------------------------
// 책임:
// - Core 판단 결과를 "항상 string 응답"으로 변환
// - 침묵 ❌
// - 판단 변경 ❌
// - ResponsePlan → Renderer → Humanize → Safety Check
//
// ⚠️ 이 함수는 YUA의 유일한 최종 응답 진입점이다.

import type { DecisionResult } from "../../types/decision";
import type { ResponsePlan, ResponseState } from "./response-types";

import { planResponse } from "./response-planner";
import { buildResponseContract } from "./response-contract";

import { renderApprove } from "./render/render-approve";
import { renderUncertain } from "./render/render-uncertain";
import { renderDefer } from "./render/render-defer";
import { renderBlock } from "./render/render-block";

import { applyHumanization } from "./humanize";
import { cognitiveSafetyCheck } from "./cognitive-check";

/* ================================
   Types
================================ */

export interface UserSignals {
  isCounterArgument: boolean; // v1.2 대비 (미사용)
  isWhyLoop: boolean;
  isDesignDiscussion: boolean;
  isCasual?: boolean;

  /** 명시적 표현 모드 힌트 (REPORT 등) */
  userModeHint?: ResponsePlan["mode"];

  /** 장기/단기 메모리 스니펫 */
  memory?: string[];
}

/* ================================
   Internal helpers
================================ */

function mapVerdictToState(
  verdict: DecisionResult["verdict"]
): ResponseState {
  switch (verdict) {
    case "APPROVE":
      return "APPROVE";
    case "HOLD":
      return "UNCERTAIN";
    case "REJECT":
    default:
      return "BLOCK";
  }
}

function renderByState(plan: ResponsePlan): string {
  switch (plan.state) {
    case "APPROVE":
      return renderApprove(plan);
    case "UNCERTAIN":
      return renderUncertain(plan);
    case "DEFER":
      return renderDefer(plan);
    case "BLOCK":
    default:
      return renderBlock(plan);
  }
}

/* ================================
   Public API
================================ */

export function generateResponse(
  coreResult: DecisionResult,
  userSignals: UserSignals
): string {
  const state = mapVerdictToState(coreResult.verdict);

  /* --------------------------------------------------
   * 1️⃣ Core → ResponsePlan
   * -------------------------------------------------- */
  let plan = planResponse({
    confidence: coreResult.confidence ?? 0.5,
    state,

    isWhyLoop: userSignals.isWhyLoop,
    isDesignDiscussion: userSignals.isDesignDiscussion,
    isCasual: userSignals.isCasual ?? false,

    userModeHint: userSignals.userModeHint,

    // 🔒 Exposure budget (v1.1 고정)
    exposureBudget: {
      frame: 1,
      axis: 1,
      boundary: 1,
    },
    exposureUsed: {
      frame: 0,
      axis: 0,
      boundary: 0,
    },
  });

  /* --------------------------------------------------
   * 2️⃣ Initial Render
   * -------------------------------------------------- */
  let rawText = renderByState(plan);

  /* --------------------------------------------------
   * 3️⃣ Humanization
   * -------------------------------------------------- */
  let humanized = applyHumanization(
    rawText,
    plan,
    userSignals.memory
  );

  /* --------------------------------------------------
   * 4️⃣ Cognitive Safety Check
   * - depth / safetyMapping 조정 가능
   * - 판단(state) 자체는 변경 ❌
   * -------------------------------------------------- */
  const safePlan = cognitiveSafetyCheck(
    humanized,
    plan
  );

  /* --------------------------------------------------
   * 5️⃣ Depth 변경 시 1회 재렌더
   * -------------------------------------------------- */
  if (safePlan.depth !== plan.depth) {
    plan = safePlan;
    humanized = applyHumanization(
      renderByState(plan),
      plan,
      userSignals.memory
    );
  }

  /* --------------------------------------------------
   * 6️⃣ Response Contract (문서 모드 only)
   * -------------------------------------------------- */
  if (plan.useContract === true) {
    const contract = buildResponseContract(plan);
    if (contract) {
      humanized = `${contract}\n\n${humanized}`;
    }
  }

  /* --------------------------------------------------
   * 7️⃣ Always Respond 보장
   * -------------------------------------------------- */
  if (!humanized || humanized.trim().length === 0) {
    return "현재 기준에서 확인 가능한 정보만 정리해서 설명하는 게 가장 합리적인 접근이야.";
  }

  return humanized.trim();
}

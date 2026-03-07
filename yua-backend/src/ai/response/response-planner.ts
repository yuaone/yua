// 🔒 YUA Response Planner — SSOT v1.1 FINAL (SERVICE SAFE)
// --------------------------------------------------
// 책임:
// - ResponsePlan 생성
// - Depth / Mode / Exposure / Tone 결정
// - Always Respond 보장
//
// ❌ Core 판단 수정 금지
// ❌ Stream / UI 관여 금지

import type {
  ResponsePlan,
  ResponseMode,
  ResponseState,
  ExposureBudget,
} from "./response-types";

import { decideResponseDepth } from "./depth-decider";
import { computeExposureFlags } from "./exposure-budget";

/* ================================
   Planner Context (FINAL)
================================ */
export interface ResponsePlannerContext {
  confidence: number;
  state: ResponseState;

  isWhyLoop: boolean;
  isDesignDiscussion: boolean;
  isCasual: boolean;

  /** 명시적으로 "문서" 요청인 경우에만 true */
  isDocument?: boolean;

  /** USER가 명시적으로 REPORT/문서 모드를 요청한 경우 */
  userModeHint?: ResponseMode;

  exposureBudget: ExposureBudget;
  exposureUsed: {
    frame: number;
    axis: number;
    boundary: number;
  };
}

/* ================================
   Planner
================================ */
export function planResponse(
  ctx: ResponsePlannerContext
): ResponsePlan {
  const depth = decideResponseDepth({
    confidence: ctx.confidence,
    isWhyLoop: ctx.isWhyLoop,
    isDesignDiscussion: ctx.isDesignDiscussion,
    isCasual: ctx.isCasual,
  });

  const mode: ResponseMode =
    ctx.userModeHint ??
    (ctx.isCasual ? "CASUAL" : "DEFAULT");

  const exposure = computeExposureFlags(
    ctx.state,
    ctx.exposureBudget,
    ctx.exposureUsed
  );

  const tone =
    mode === "CASUAL" || mode === "MEME"
      ? "casual"
      : mode === "ONE_LINER"
      ? "playful"
      : "neutral";

  const explanationStyle =
    depth >= 2 ? "explicit" : "implicit";

  /**
   * 🔥 Safety Mapping
   * - UNCERTAIN → redirect (역질문 루프 방지)
   */
  const safetyMapping =
    ctx.state === "BLOCK"
      ? "soft-block"
      : ctx.state === "UNCERTAIN" || ctx.state === "DEFER"
      ? "redirect"
      : "clarify";

  /**
   * 🔒 Contract 적용 조건 (SSOT 핵심)
   *
   * ✔ 문서 + 설계 논의 + 명시적 REPORT 요청
   * ❌ NORMAL / ADVICE / RECOMMEND / CASUAL 절대 적용 금지
   */
  const useContract =
    ctx.isDocument === true &&
    ctx.isDesignDiscussion === true &&
    ctx.userModeHint === "REPORT";

  return {
    mode,
    state: ctx.state,
    depth,

    useContract,

    exposeFrame: exposure.exposeFrame,
    exposeAxis: exposure.exposeAxis,
    exposeBoundary: exposure.exposeBoundary,

    tone,
    explanationStyle,
    safetyMapping,
  };
}

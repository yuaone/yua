// 🔒 YUA Hybrid Exposure Budget — SSOT v1.1 FINAL
// ----------------------------------------------
// 책임:
// - Frame / Axis / Boundary 노출 제한
// - 세션 누적 제어
// - ResponsePlanner 전용

import type {
  ExposureBudget,
  ResponseState,
} from "./response-types";

export interface ExposureUsage {
  frame: number;
  axis: number;
  boundary: number;
}

export function computeExposureFlags(
  state: ResponseState,
  budget: ExposureBudget,
  used: ExposureUsage
): {
  exposeFrame: boolean;
  exposeAxis: boolean;
  exposeBoundary: boolean;
} {
  let exposeFrame = false;
  let exposeAxis = false;
  let exposeBoundary = false;

  if (budget.frame > used.frame) exposeFrame = true;
  if (budget.axis > used.axis) exposeAxis = true;
  if (budget.boundary > used.boundary)
    exposeBoundary = true;

  // 🔒 BLOCK 상태 제한
  if (state === "BLOCK") {
    const allowed = [exposeFrame, exposeAxis, exposeBoundary]
      .filter(Boolean)
      .length;

    if (allowed > 1) {
      exposeAxis = false;
      exposeBoundary = false;
    }
  }

  return {
    exposeFrame,
    exposeAxis,
    exposeBoundary,
  };
}

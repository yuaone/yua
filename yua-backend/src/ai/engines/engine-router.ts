// src/ai/engine/engine-router.ts
// 🔒 Engine Router — PHASE 7.9 FINAL (SSOT)
//
// 책임:
// - AdaptiveRouter로 confidence 보정
// - CORE / DESIGN 엔진 분기
// - ActivationPolicy 적용 (출력 영향도만 결정)
// ❌ Judgment 생성/수정 금지
// ❌ Controller 로직 침범 금지

import type { ToolGateDecision } from "../tools/tool-types";
import { AdaptiveRouter } from "./adaptive-router";

import type {
  ActivationDecision,
} from "../../yua-core/activation/activation.policy";
import {
  decideActivation,
} from "../../yua-core/activation/activation.policy";

export type EngineType = "CORE" | "DESIGN";

export interface EngineRouteInput {
  confidence: number;
  toolGate: ToolGateDecision;
  path?: string;
}

export interface EngineRouteDecision {
  engine: EngineType;
  reason: string;
  activation: ActivationDecision;
}

/**
 * Engine Router (SSOT)
 *
 * 불변 원칙:
 * - 엔진 선택은 "실행 방식" 결정일 뿐
 * - 안전/차단 판단은 이미 Judgment에서 끝남
 * - 여기서는 출력 영향도만 ActivationPolicy로 결정
 */
export async function routeEngine(
  input: EngineRouteInput
): Promise<EngineRouteDecision> {
  const adjusted = await AdaptiveRouter.adjust({
    path: input.path ?? "default",
    confidence: input.confidence,
  });

  const confidence = adjusted.confidence;
  const toolGate = input.toolGate;

  // --------------------------------------------------
  // CORE ENGINE
  // --------------------------------------------------
  if (
    confidence >= 0.75 &&
    toolGate.toolLevel !== "FULL"
  ) {
    const activation = decideActivation({
      verdict: "APPROVE", // ⚠️ 실제 verdict는 Controller에서 override 가능
      confidence,
      risk: 0,
      path: input.path ?? "default",
      engine: "CORE",
    });

    return {
      engine: "CORE",
      reason: adjusted.drifted
        ? "calibrated_high_confidence_with_drift"
        : "high_confidence_low_tool_requirement",
      activation,
    };
  }

  // --------------------------------------------------
  // DESIGN ENGINE
  // --------------------------------------------------
  const activation = decideActivation({
    verdict: "APPROVE", // ⚠️ Controller에서 최종 verdict 반영 가능
    confidence,
    risk: 0,
    path: input.path ?? "default",
    engine: "DESIGN",
  });

  return {
    engine: "DESIGN",
    reason: adjusted.drifted
      ? "drift_detected"
      : "verification_required_or_low_confidence",
    activation,
  };
}

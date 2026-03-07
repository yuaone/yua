// 🔥 YUA FailureSurfaceEngine — SSOT SAFE (2026.01)
// ------------------------------------------------
// 책임:
// - 이번 턴에서 "틀릴 수 있는 구조적 표면"만 감지
// - 진단 신호 생성 (설명/변명/존재론 ❌)
// - 출력은 Prompt/Stream에 직접 노출 ❌
// - ResponseComposer / ToneEngine만 참고
//
// 철학:
// - 내부 파이프라인 노출 ❌
// - 사용자 이해 가능한 "위험 힌트"만 제공
// ------------------------------------------------

import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { TurnIntent } from "../chat/types/turn-intent";
import type { PathType } from "../../routes/path-router";

export type FailureRisk = "LOW" | "MEDIUM" | "HIGH";

export type FailurePointCode =
  | "LOW_REASONING_CONFIDENCE"
  | "CONTEXT_DISCONTINUITY"
  | "INPUT_LOSS_POSSIBLE"
  | "ASSERTION_WITHOUT_VERIFICATION"
  | "INTENT_EDGE_CASE";

export type FailureSurface = {
  risk: FailureRisk;
  points: {
    code: FailurePointCode;
    severity: 1 | 2 | 3;
  }[];
};

type Input = {
  reasoning: ReasoningResult;
  turnIntent?: TurnIntent;
  path: PathType;
  anchorConfidence?: number;
  continuityAllowed?: boolean;
  inputLength?: number;
  sanitizedLength?: number;
  searchEnabled?: boolean;
};

export const FailureSurfaceEngine = {
  analyze(input: Input): FailureSurface {
    const points: FailureSurface["points"] = [];

    /* ----------------------------------
     * 1️⃣ Reasoning Confidence
     * ---------------------------------- */
    if (input.reasoning.confidence < 0.45) {
      points.push({
        code: "LOW_REASONING_CONFIDENCE",
        severity: input.reasoning.confidence < 0.3 ? 3 : 2,
      });
    }

    /* ----------------------------------
     * 2️⃣ Context Discontinuity
     * ---------------------------------- */
    if (
      input.anchorConfidence !== undefined &&
      input.anchorConfidence < 0.4
    ) {
      points.push({
        code: "CONTEXT_DISCONTINUITY",
        severity: 2,
      });
    }

    if (input.continuityAllowed === false) {
      points.push({
        code: "CONTEXT_DISCONTINUITY",
        severity: 3,
      });
    }

    /* ----------------------------------
     * 3️⃣ Input Loss (sanitize / truncate)
     * ---------------------------------- */
    if (
      typeof input.inputLength === "number" &&
      typeof input.sanitizedLength === "number"
    ) {
      const ratio =
        input.sanitizedLength / Math.max(1, input.inputLength);

      if (ratio < 0.7) {
        points.push({
          code: "INPUT_LOSS_POSSIBLE",
          severity: ratio < 0.4 ? 3 : 2,
        });
      }
    }

    /* ----------------------------------
     * 4️⃣ Assertion Risk
     * ---------------------------------- */
    if (
      input.path !== "SEARCH" &&
      input.searchEnabled === false &&
      input.reasoning.depthHint === "shallow" &&
      input.reasoning.intent === "decide"
    ) {
      points.push({
        code: "ASSERTION_WITHOUT_VERIFICATION",
        severity: 2,
      });
    }

    /* ----------------------------------
     * 5️⃣ Intent Edge Case
     * ---------------------------------- */
    if (
      input.turnIntent === "CONTINUATION" &&
      input.reasoning.depthHint === "deep"
    ) {
      points.push({
        code: "INTENT_EDGE_CASE",
        severity: 1,
      });
    }

    /* ----------------------------------
     * Final Risk Aggregation (SSOT)
     * ---------------------------------- */
    const maxSeverity = points.reduce(
      (m, p) => Math.max(m, p.severity),
      0
    );

    const risk: FailureRisk =
      maxSeverity >= 3
        ? "HIGH"
        : maxSeverity === 2
        ? "MEDIUM"
        : "LOW";

    return { risk, points };
  },
};

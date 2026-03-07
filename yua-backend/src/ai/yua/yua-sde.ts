// src/ai/yua/yua-sde.ts
// -------------------------------------------------------------
// ⚡ YUA-AI SDE v1.1 — Aggregated State Aware (NON-BREAKING)
// -------------------------------------------------------------

import { logger } from "../../utils/logger";

/**
 * SDE 입력 구조 (임시)
 */
export interface SdeInput {
  engineStates: Record<string, any>;   // 각 엔진에서 전달한 상태 정보
  metadata?: Record<string, unknown>;
}

/**
 * SDE 출력 구조 (임시)
 */
export interface SdeOutput {
  healthScore: number;                 // 0 ~ 1
  warnings: string[];                  // 감지된 경고들
  stabilityIndex: number;              // 간단한 안정성 지표
  meta?: Record<string, unknown>;
}

/**
 * Self-Diagnostic Engine
 * - 엔진들의 내부 상태를 점검하고 안정성 지표 계산
 * - aggregatedState(STABLE | SHIFT | RISK)를
 *   "진단 신호"로만 사용 (판단/차단 ❌)
 */
export class YuaSelfDiagnosticEngine {
  constructor() {}

  async run(input: SdeInput): Promise<SdeOutput> {
    logger.info("[YuaSDE] run called", {
      engineCount: Object.keys(input.engineStates || {}).length
    });

    const warnings = this.detectWarnings(input.engineStates);
    const stabilityIndex = this.calculateStability(input.engineStates);
    const healthScore = this.estimateHealth(warnings, stabilityIndex);

    return {
      healthScore,
      warnings,
      stabilityIndex,
      meta: {
        ...input.metadata,
        sdeTimestamp: Date.now()
      }
    };
  }

  // -------------------------------------------------------------
  // Warning Detection
  // -------------------------------------------------------------
  private detectWarnings(states: Record<string, any>): string[] {
    const warnings: string[] = [];

    for (const key of Object.keys(states)) {
      const st = states[key];
      if (!st) continue;

      // -----------------------------------------
      // 기존 진단 로직 (유지)
      // -----------------------------------------
      if (st.jacobian && st.jacobian > 10) {
        warnings.push(`${key}: jacobian explosion detected`);
      }

      if (st.drift && st.drift > 5) {
        warnings.push(`${key}: probability drift too high`);
      }

      if (st.stability && st.stability < 0.3) {
        warnings.push(`${key}: low stability score`);
      }

      // -----------------------------------------
      // 🔥 NEW: Aggregated State Diagnostic (SAFE)
      // -----------------------------------------
      if (key === "aggregatedState") {
        const phase = st.statePhase;
        const confidence = st.trendConfidence;

        if (phase === "RISK") {
          warnings.push(
            `aggregatedState: RISK phase detected (confidence=${confidence?.toFixed?.(2) ?? "n/a"})`
          );
        }

        if (phase === "SHIFT" && confidence !== undefined && confidence < 0.4) {
          warnings.push(
            `aggregatedState: unstable SHIFT phase (confidence=${confidence.toFixed?.(2)})`
          );
        }
      }
    }

    return warnings;
  }

  // -------------------------------------------------------------
  // Stability Index Calculation
  // -------------------------------------------------------------
  private calculateStability(states: Record<string, any>): number {
    const values: number[] = [];

    for (const st of Object.values(states)) {
      if (!st) continue;

      // 기존 안정성 필드
      if (typeof st.stability === "number") {
        values.push(st.stability);
      }

      // 🔥 aggregatedState 기반 보정 (optional)
      if (st.statePhase === "RISK") {
        values.push(0.3);
      } else if (st.statePhase === "SHIFT") {
        values.push(0.6);
      } else if (st.statePhase === "STABLE") {
        values.push(0.8);
      }
    }

    if (!values.length) return 0.5;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.min(1, Math.max(0, avg));
  }

  // -------------------------------------------------------------
  // Health Score Estimation
  // -------------------------------------------------------------
  private estimateHealth(warnings: string[], stability: number): number {
    let score = stability;

    if (warnings.length >= 3) score -= 0.2;
    if (warnings.length >= 5) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  }
}

export const yuaSde = new YuaSelfDiagnosticEngine();
export default yuaSde;

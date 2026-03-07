// src/ai/yua/yua-suv.ts
/**
 * SUV Contract (SSOT)
 * -------------------------------------------------------------
 * - SUV does NOT decide content
 * - SUV does NOT generate language
 *
 * SUV ONLY:
 * - packages final state vectors
 * - exposes results to outer layers
 */

import { logger } from "../../utils/logger";

export interface SuvInput {
  fusedOutput?: any;              // SFE에서 온 결합 결과
  governanceOutput?: any;         // MGL 조정 결과
  consensusOutput?: any;          // CPS 선택 결과
  stabilityState?: any;           // CSK에서 온 안정성 벡터
  metadata?: Record<string, unknown>;
}

export interface SuvOutput {
  finalState: any;                // 최종 통합 상태 벡터
  stability: number;              // 0~1 안정성
  confidence: number;             // 0~1 확신도
  meta?: Record<string, unknown>;
}

/**
 * SUV (State Unification Vector Engine)
 * - 모든 엔진이 산출한 결과를 받아
 *   최종 브레인 상태 벡터를 통합해내는 엔진
 * - YUA-AI의 "최상위 출력 커널"
 */
export class YuaStateUnificationVectorEngine {
  constructor() {}

  async run(input: SuvInput): Promise<SuvOutput> {
    logger.info("[YuaSUV] run called");

    const final = this.unifyState(input);
    const stability = this.estimateStability(input.stabilityState);
    const confidence = this.estimateConfidence(input);

    return {
      finalState: final,
      stability,
      confidence,
      meta: {
        ...input.metadata,
        suvTimestamp: Date.now()
      }
    };
  }

  /**
   * 여기서 "최종 통합 상태 벡터"를 구성
   * - 지금은 스키마 작업 전 → 단순 병합 형태
   * - 나중에 GCP UES 적용하면 이 부분이 진짜 브레인 벡터 생성 로직으로 확장됨
   */
  private unifyState(input: SuvInput): any {
    return {
      fused: input.fusedOutput,
      governance: input.governanceOutput,
      consensus: input.consensusOutput,
      stabilityState: input.stabilityState,
      unified: true
    };
  }

  /**
   * 안정성 계산 (임시)
   */
  private estimateStability(state: any): number {
    if (!state) return 0.6;

    const base = state.stability ?? 0.6;
    return Math.min(1, Math.max(0, base));
  }

  /**
   * 최종 confidence 계산
   * - fused / consensus 존재 여부로 단순 계산
   */
  private estimateConfidence(input: SuvInput): number {
    let score = 0.5;

    if (input.fusedOutput) score += 0.2;
    if (input.consensusOutput) score += 0.2;
    if (input.governanceOutput) score += 0.1;

    return Math.min(1, score);
  }
}

export const yuaSuv = new YuaStateUnificationVectorEngine();
export default yuaSuv;

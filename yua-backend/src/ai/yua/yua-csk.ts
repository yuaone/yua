// src/ai/yua/yua-csk.ts

import { logger } from "../../utils/logger";

export interface CskInput {
  stateVectors: any[];              // 여러 엔진의 상태 벡터 모음
  metadata?: Record<string, unknown>;
}

export interface CskOutput {
  unifiedState: any;
  stability: number;                // 0~1: 인지 안정성 지표
  meta?: Record<string, unknown>;
}
/**
 * CSK Contract (SSOT)
 * -------------------------------------------------------------
 * - CSK is a risk detector
 * - It MUST NOT block or override execution
 *
 * Output is advisory only
 */
export class YuaCognitiveStabilityKernel {
  constructor() {}

  async run(input: CskInput): Promise<CskOutput> {
    logger.info("[YuaCSK] run called", {
      vectors: input.stateVectors.length
    });

    const unified = this.mergeStates(input.stateVectors);
    const stability = this.estimateStability(unified);

    return {
      unifiedState: unified,
      stability,
      meta: {
        ...input.metadata,
        cskTimestamp: Date.now()
      }
    };
  }

  private mergeStates(vectors: any[]): any {
    if (!vectors.length) return {};

    return {
      merged: true,
      count: vectors.length,
      data: vectors
    };
  }

  private estimateStability(unified: any): number {
    if (!unified || !unified.count) return 0.5;

    return Math.min(1, 0.5 + unified.count * 0.05);
  }
}

export const yuaCsk = new YuaCognitiveStabilityKernel();
export default yuaCsk;

// src/ai/yua/yua-mgl.ts

import { logger } from "../../utils/logger";

/**
 * MGL 입력 구조 (임시)
 */
export interface MglInput {
  candidates: any[];          // 여러 엔진 결과 (Gen59, Omega, HPE, etc.)
  metadata?: Record<string, unknown>;
}

/**
 * MGL 출력 구조 (임시)
 */
export interface MglOutput {
  selected: any;              // 선택된 엔진 출력
  strategy: string;           // 선택 전략
  score: number;              // 신뢰 점수
  meta?: Record<string, unknown>;
}

/**
 * Meta Governance Layer
 * - 여러 엔진이 낸 결과 중 가장 일관성 높은 것 선택
 * - 정책 기반 / 휴리스틱 기반 / 안정성 기반
 */
export class YuaMetaGovernanceLayer {
  constructor() {}

  async run(input: MglInput): Promise<MglOutput> {
    logger.info("[YuaMGL] run called", {
      candidates: input.candidates?.length || 0
    });

    const strategy = this.selectStrategy(input);
    const selected = this.pickCandidate(input.candidates, strategy);
    const score = this.estimateScore(selected);

    return {
      selected,
      strategy,
      score,
      meta: {
        ...input.metadata,
        mglTimestamp: Date.now()
      }
    };
  }

  private selectStrategy(input: MglInput): string {
    const count = input.candidates.length;

    if (count > 3) return "consensus";
    if (count === 1) return "direct";
    return "stability";
  }

  private pickCandidate(candidates: any[], strategy: string): any {
    if (!candidates.length) return null;

    switch (strategy) {
      case "direct":
        return candidates[0];

      case "stability":
        return candidates[Math.floor(candidates.length / 2)];

      case "consensus":
        return candidates[candidates.length - 1];

      default:
        return candidates[0];
    }
  }

  private estimateScore(candidate: any): number {
    if (!candidate) return 0.3;

    const meta = candidate.meta ?? {};
    const boost = meta.stabilityScore ? meta.stabilityScore * 0.3 : 0;

    return Math.min(1, 0.6 + boost);
  }
}

export const yuaMgl = new YuaMetaGovernanceLayer();
export default yuaMgl;

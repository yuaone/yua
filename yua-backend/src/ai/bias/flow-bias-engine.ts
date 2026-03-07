// 🔥 YUA Flow Bias Engine — PHASE 8-4 FINAL (SSOT)
// --------------------------------------------------
// ✔ 통계 기반 (FlowAggregationService)
// ✔ 판단 / Rule / Path 개입 ❌
// ✔ Suggestion / Ordering 힌트 ONLY
// ✔ 보수적 bias (-0.15 ~ +0.15)
// ✔ 소표본 / 노이즈 / Drift 안전
// --------------------------------------------------

import type { FlowAnchor } from "../reasoning/reasoning-engine";
import { FlowAggregationService } from "../telemetry/flow-aggregation.service";

/**
 * Bias Hint (READ ONLY)
 */
export type FlowBiasHint = {
  anchorWeight?: Partial<Record<FlowAnchor, number>>;
  generatedAt: number;
  sampleSize: number;
};

let cachedBias: FlowBiasHint | null = null;
let lastFetchedAt = 0;

// 🔒 캐시 TTL (운영 안정성 우선)
const CACHE_TTL_MS = 5 * 60 * 1000;

// 🔒 Bias 상한 (절대 개입 방지)
const MAX_BIAS = 0.15;

// 🔒 최소 표본 수
const MIN_SHOWN = 30;

export const FlowBiasEngine = {
  /**
   * 🔍 실시간 조회 (캐시 우선)
   */
  async getBias(): Promise<FlowBiasHint> {
    const now = Date.now();

    if (cachedBias && now - lastFetchedAt < CACHE_TTL_MS) {
      return cachedBias;
    }

    const bias = await FlowBiasEngine.refreshBias();
    cachedBias = bias;
    lastFetchedAt = now;

    return bias;
  },

  /**
   * 🔁 강제 갱신 (cron / admin)
   */
  async refreshBias(): Promise<FlowBiasHint> {
    const anchors =
      await FlowAggregationService.getAnchorStats();

          // 🔒 SSOT: Signal 병합은 외부에서 주입된 cache만 사용
    const signalBias = cachedBias?.anchorWeight ?? {};

    const anchorWeight: Partial<
      Record<FlowAnchor, number>
    > = {};

    let usedSamples = 0;

    for (const a of anchors) {
      /**
       * a = {
       *   anchor: FlowAnchor
       *   shown: number
       *   clicked: number
       *   ctr: number (0~1)
       * }
       */

      // 1️⃣ 소표본 제거
      if (a.shown < MIN_SHOWN) continue;

      usedSamples += a.shown;

      // 2️⃣ neutral 기준 CTR 보정
      const raw = a.ctr - 0.5;

      // 3️⃣ soft squashing (극단값 완화)
      const softened =
        raw / (1 + Math.abs(raw));

      // 4️⃣ 절대 상한 적용
      anchorWeight[a.anchor] = clamp(
        softened,
        -MAX_BIAS,
        MAX_BIAS
      );
    }

    return {
      anchorWeight,
      generatedAt: Date.now(),
      sampleSize: usedSamples,
    };
  },

  /**
   * 🔒 캐시 직접 접근 (읽기 전용)
   */
  getCachedBias(): FlowBiasHint | null {
    return cachedBias;
  },
};

/* -------------------------------------------------- */
/* Utilities                                          */
/* -------------------------------------------------- */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

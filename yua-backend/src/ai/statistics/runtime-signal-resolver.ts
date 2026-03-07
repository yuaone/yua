import { RuntimeStatsAggregator } from "./runtime-stats-aggregator";
import { FlowAggregationService } from "../telemetry/flow-aggregation.service";
import { pgPool } from "../../db/postgres";

/**
 * 🔒 PHASE 8-1 Runtime Signal Resolver (SSOT)
 *
 * - READ ONLY
 * - Runtime 판단에 영향 ❌
 * - Phase 8 전체 입력 표준
 */
export type RuntimeSignalFrame = {
  path: string;

  // 판단 결과
  verdictHoldRate: number;
  avgConfidence: number;
  avgRisk: number;

  // 안정성
  verifierFailureRate: number;
  avgToolScore: number;

  // 사용자 반응
  nextStepRatio: number;
  confusedToReadyRate: number;

  // 메타
  sampleSize: number;
  windowHours: number;
};

export class RuntimeSignalResolver {
  /**
   * 🔍 특정 path 기준 Runtime Signal Frame
   */
  static async resolveByPath(params: {
    path: string;
    lastHours?: number;
  }): Promise<RuntimeSignalFrame | null> {
    const hours = params.lastHours ?? 24;

    const summary = await RuntimeStatsAggregator.summary(hours);
    const stat = summary.find(s => s.path === params.path);
    if (!stat) return null;

    const flowHealth = await FlowAggregationService.getFlowHealth();

    const verifierFailureRate =
      Number(stat.verifier_failures) / Math.max(Number(stat.total), 1);

    const verdictHoldRate =
      Number(stat.hold_count) / Math.max(Number(stat.total), 1);

    return {
      path: stat.path,

      verdictHoldRate,
      avgConfidence: Number(stat.avg_confidence),
      avgRisk: Number(stat.avg_risk),

      verifierFailureRate,
      avgToolScore: Number(stat.avg_tool_score),

      nextStepRatio: flowHealth.nextStepRatio,
      confusedToReadyRate: flowHealth.confusedToReadyRate,

      sampleSize: Number(stat.total),
      windowHours: hours,
    };
  }

  /**
   * 🔍 전체 Path 요약 (운영 / 리포트 전용)
   */
  static async resolveAll(params?: {
    lastHours?: number;
  }): Promise<RuntimeSignalFrame[]> {
    const hours = params?.lastHours ?? 24;
    const summary = await RuntimeStatsAggregator.summary(hours);
    const flowHealth = await FlowAggregationService.getFlowHealth();

    return summary.map(stat => {
      const verifierFailureRate =
        Number(stat.verifier_failures) / Math.max(Number(stat.total), 1);

      const verdictHoldRate =
        Number(stat.hold_count) / Math.max(Number(stat.total), 1);

      return {
        path: stat.path,

        verdictHoldRate,
        avgConfidence: Number(stat.avg_confidence),
        avgRisk: Number(stat.avg_risk),

        verifierFailureRate,
        avgToolScore: Number(stat.avg_tool_score),

        nextStepRatio: flowHealth.nextStepRatio,
        confusedToReadyRate: flowHealth.confusedToReadyRate,

        sampleSize: Number(stat.total),
        windowHours: hours,
      };
    });
  }
}

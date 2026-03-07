// 📂 src/ai/learning/learning-candidate-generator.ts
import { pgPool } from "../../db/postgres";
import { RuntimeSignalResolver } from "../statistics/runtime-signal-resolver";
import { getRecentDriftStats } from "../memory/repo/get-recent-drift-stats";
import {
  MetadataAggregator,
  AggregatedMetadataSignal,
} from "./metadata/metadata-aggregator";

/**
 * 🔒 PHASE 13-1 Learning Candidate Generator (SSOT)
 *
 * - READ ONLY (except learning_candidates)
 * - NO learning
 * - NO rule change
 * - Candidate emission only
 * - Workspace freeze respected
 */
export class LearningCandidateGenerator {
  static async generateForWorkspace(params: {
    workspaceId: string;
    windowHours?: number;
  }): Promise<void> {
    const { workspaceId } = params;
    const windowHours = params.windowHours ?? 24;

    /* ----------------------------------------
       0️⃣ Workspace Freeze Guard
    ---------------------------------------- */
    const freeze = await pgPool.query<{ is_frozen: boolean }>(
      `
      SELECT is_frozen
      FROM workspace_memory_state
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    if (freeze.rows[0]?.is_frozen) {
      // 🔒 frozen 상태면 후보 생성 중단
      return;
    }

    /* ----------------------------------------
       1️⃣ Runtime Signal Candidates
    ---------------------------------------- */
    const runtimeSignals =
      await RuntimeSignalResolver.resolveAll({
        lastHours: windowHours,
      });

    for (const s of runtimeSignals) {
      // 🔻 Confidence collapse
      if (s.avgConfidence < 0.45 && s.sampleSize >= 50) {
        await this.emitCandidate({
          workspaceId,
          source: "runtime_signal",
          scope: s.path,
          signalType: "confidence_collapse",
          severity: 1 - s.avgConfidence,
          sampleCount: s.sampleSize,
          windowHours,
          meta: {
            avgConfidence: s.avgConfidence,
            verdictHoldRate: s.verdictHoldRate,
          },
        });
      }

      // 🔻 Verifier failure spike
      if (s.verifierFailureRate > 0.25) {
        await this.emitCandidate({
          workspaceId,
          source: "runtime_signal",
          scope: s.path,
          signalType: "verifier_failure_spike",
          severity: s.verifierFailureRate,
          sampleCount: s.sampleSize,
          windowHours,
          meta: {
            verifierFailureRate: s.verifierFailureRate,
          },
        });
      }
    }

    /* ----------------------------------------
       2️⃣ Drift Accumulation Candidates
    ---------------------------------------- */
    const driftStats = await getRecentDriftStats({
      workspaceId,
      sinceHours: windowHours,
    });

    for (const d of driftStats) {
      if (d.highCount >= 5) {
        await this.emitCandidate({
          workspaceId,
          source: "drift",
          scope: d.scope,
          signalType: "drift_accumulation",
          severity: Math.min(d.highCount / 10, 1),
          sampleCount: d.highCount,
          windowHours,
        });
      }
    }

    /* ----------------------------------------
       3️⃣ Metadata Stability Candidates
    ---------------------------------------- */
    const metadataSignals: AggregatedMetadataSignal[] =
      await MetadataAggregator.aggregateWorkspace({
        workspaceId,
        hours: windowHours,
      });

    for (const m of metadataSignals) {
      if (m.instabilityScore > 0.6 && m.frequency >= 10) {
        await this.emitCandidate({
          workspaceId,
          source: "metadata",
          scope: m.scope,
          signalType: "instability_detected",
          severity: m.instabilityScore,
          sampleCount: m.frequency,
          windowHours,
          meta: {
            recency: m.recency,
          },
        });
      }
    }
  }

  /* ----------------------------------------
     Candidate Emit (DB write ONLY)
     - Deduplicated
  ---------------------------------------- */
  private static async emitCandidate(params: {
    workspaceId: string;
    source: string;
    scope: string;
    signalType: string;
    severity: number;
    sampleCount: number;
    windowHours: number;
    meta?: Record<string, any>;
  }): Promise<void> {
    const {
      workspaceId,
      source,
      scope,
      signalType,
      severity,
      sampleCount,
      windowHours,
      meta,
    } = params;

    await pgPool.query(
      `
      INSERT INTO learning_candidates
        (workspace_id,
         source,
         scope,
         signal_type,
         severity,
         sample_count,
         window_hours,
         meta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT DO NOTHING
      `,
      [
        workspaceId,
        source,
        scope,
        signalType,
        severity,
        sampleCount,
        windowHours,
        meta ?? null,
      ]
    );
  }
}

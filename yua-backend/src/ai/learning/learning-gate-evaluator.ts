// 🔒 PHASE 13-2 Learning Gate Evaluator (SSOT)
// -------------------------------------------
// 목적:
// - learning_candidates 기반
// - workspace_learning_gate 평가/갱신
// - 학습 ❌
// - 규칙 변경 ❌
// - 판단 ❌

import { pgPool } from "../../db/postgres";
import { RuntimeSignalResolver } from "../statistics/runtime-signal-resolver";
import { MetadataAggregator } from "./metadata/metadata-aggregator";

export class LearningGateEvaluator {
  /**
   * 🔐 Workspace 학습 자격 평가
   */
  static async evaluateWorkspace(params: {
    workspaceId: string;
    minSamples?: number;
  }): Promise<boolean> {
    const { workspaceId } = params;
    const minSamples = params.minSamples ?? 100;

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
      await this.updateGate({
        workspaceId,
        eligible: false,
        reason: "workspace_frozen",
      });
      return false;
    }

    /* ----------------------------------------
       1️⃣ Learning Candidate 집계
    ---------------------------------------- */
    const candidateRes = await pgPool.query<{
      cnt: number;
    }>(
      `
      SELECT COUNT(*)::int AS cnt
      FROM learning_candidates
      WHERE workspace_id = $1
        AND created_at >= NOW() - INTERVAL '72 hours'
      `,
      [workspaceId]
    );

    const candidateCount = candidateRes.rows[0]?.cnt ?? 0;

    if (candidateCount < minSamples) {
      await this.updateGate({
        workspaceId,
        eligible: false,
        reason: "insufficient_learning_candidates",
      });
      return false;
    }

    /* ----------------------------------------
       2️⃣ Runtime 안정성 확인
    ---------------------------------------- */
    const runtimeSignals =
      await RuntimeSignalResolver.resolveAll({
        lastHours: 24,
      });

    const unstableRuntime = runtimeSignals.some(
      (s) =>
        s.verifierFailureRate > 0.4 ||
        s.avgConfidence < 0.4
    );

    if (unstableRuntime) {
      await this.updateGate({
        workspaceId,
        eligible: false,
        reason: "runtime_unstable",
      });
      return false;
    }

    /* ----------------------------------------
       3️⃣ Metadata 안정성 확인
    ---------------------------------------- */
    const metadataSignals =
      await MetadataAggregator.aggregateWorkspace({
        workspaceId,
        hours: 72,
      });

    const unstableMetadata = metadataSignals.some(
      (m) =>
        m.instabilityScore > 0.75 &&
        m.frequency >= 20
    );

    if (unstableMetadata) {
      await this.updateGate({
        workspaceId,
        eligible: false,
        reason: "metadata_unstable",
      });
      return false;
    }

    /* ----------------------------------------
       ✅ Gate Open
    ---------------------------------------- */
    await this.updateGate({
      workspaceId,
      eligible: true,
      reason: "gate_conditions_satisfied",
    });

    return true;
  }

  /* ----------------------------------------
     Gate Update (DB only)
  ---------------------------------------- */
  private static async updateGate(params: {
    workspaceId: string;
    eligible: boolean;
    reason: string;
  }) {
    const { workspaceId, eligible, reason } = params;

    await pgPool.query(
      `
      UPDATE workspace_learning_gate
      SET
        eligible = $2,
        reason = $3,
        last_evaluated_at = NOW(),
        updated_at = NOW()
      WHERE workspace_id = $1
      `,
      [workspaceId, eligible, reason]
    );
  }
}

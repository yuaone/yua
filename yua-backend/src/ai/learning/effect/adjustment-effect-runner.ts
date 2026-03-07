// 🔒 PHASE 15 Adjustment Effect Runner (SSOT)
// ------------------------------------------
// - BEFORE / AFTER snapshot 비교
// - KEEP / ROLLBACK / FREEZE 결정
// - Rollback Service 연동

import { RuntimeEffectSnapshot } from "./runtime-effect-snapshot";
import { AdjustmentEffectEvaluator } from "./adjustment-effect-evaluator";
import { AdjustmentRollbackService } from "../rollback/adjustment-rollback.service";
import { pgPool } from "../../../db/postgres";

export const AdjustmentEffectRunner = {
  async run(params: {
    workspaceId: string;
    adjustmentId: number;
    scope: string;
  }): Promise<void> {
    const { workspaceId, adjustmentId, scope } = params;

    // 🔹 BEFORE
    const before = await RuntimeEffectSnapshot.take({
      workspaceId,
      scope,
      windowHours: 24,
    });

    // 🔹 AFTER
    const after = await RuntimeEffectSnapshot.take({
      workspaceId,
      scope,
      windowHours: 24,
    });

    const result =
      AdjustmentEffectEvaluator.evaluate({ before, after });

    /* ----------------------------------------
       Effect Log 기록
    ---------------------------------------- */
    await pgPool.query(
      `
      INSERT INTO learning_adjustment_effect_logs
        (workspace_id, adjustment_id, verdict, reason, metrics)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        workspaceId,
        adjustmentId,
        result.verdict,
        result.reason,
        result.metrics,
      ]
    );

    /* ----------------------------------------
       Verdict 처리
    ---------------------------------------- */
    if (result.verdict === "ROLLBACK") {
      await AdjustmentRollbackService.rollback({
        workspaceId,
        adjustmentId,
        reason: result.reason,
        metrics: result.metrics,
      });
    }

    if (result.verdict === "FREEZE") {
      await pgPool.query(
        `
        UPDATE workspace_memory_state
        SET
          is_frozen = true,
          frozen_reason = 'effect_uncertain',
          frozen_at = NOW()
        WHERE workspace_id = $1
        `,
        [workspaceId]
      );
    }
  },
};

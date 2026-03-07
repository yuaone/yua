// 🔒 PHASE 14 Learning Adjustment Applier (SSOT)
// ---------------------------------------------
// - Adjustment "적용 완료" 확정 전용
// - MemoryManager는 READ ONLY consumer
// - Rule / Judgment / Model 변경 ❌
// - APPLY = 상태 전환 + 감사 기록

import { pgPool } from "../../db/postgres";
import { LearningAdjustmentRepo } from "./repo/learning-adjustment.repo";

/* ===================================================
   Types
================================================== */

type PendingAdjustment = {
  id: number;
  workspace_id: string;
  adjustment_type: string;
  scope: string;
  payload: Record<string, any>;
};

/* ===================================================
   Applier
================================================== */

export const LearningAdjustmentApplier = {
  /**
   * 🔧 Workspace 단위 Adjustment 적용
   *
   * 규칙:
   * - status=PENDING 만 대상
   * - 실제 로직은 MemoryManager가 "읽어서 반영"
   * - 여기서는 APPLY 확정만 수행
   */
  async applyPendingAdjustments(params: {
    workspaceId: string;
    appliedBy?: string;
    limit?: number;
  }): Promise<number> {
    const {
      workspaceId,
      appliedBy = "system",
      limit = 10,
    } = params;

    /* ----------------------------------------
       1️⃣ PENDING Adjustment 조회
    ---------------------------------------- */
    const { rows } = await pgPool.query<PendingAdjustment>(
      `
      SELECT
        id,
        workspace_id,
        adjustment_type,
        scope,
        payload
      FROM learning_adjustments
      WHERE workspace_id = $1
        AND status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [workspaceId, limit]
    );

    if (!rows.length) return 0;

    /* ----------------------------------------
       2️⃣ APPLY 처리 (트랜잭션)
    ---------------------------------------- */
    const client = await pgPool.connect();
    let appliedCount = 0;

    try {
      await client.query("BEGIN");

      for (const adj of rows) {
        // ⚠️ 실제 적용은 MemoryManager가 수행
        // 우리는 "이 조정이 활성화되었다"는 사실만 확정

        await client.query(
          `
          UPDATE learning_adjustments
          SET
            status = 'APPLIED',
            applied_at = NOW(),
            applied_by = $2
          WHERE id = $1
          `,
          [adj.id, appliedBy]
        );

        appliedCount++;
      }

      await client.query("COMMIT");
      return appliedCount;

    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};

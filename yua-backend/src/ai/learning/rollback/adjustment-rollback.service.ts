// 🔒 PHASE 15 Adjustment Rollback Service (SSOT)
// ---------------------------------------------
// - Effect 평가 결과 기반
// - Memory / Rule / Learning 직접 수정 ❌
// - learning_adjustments 상태만 변경
// - workspace freeze 연동

import { pgPool } from "../../../db/postgres";
import { WorkspaceMemoryService } from "../../workspace/workspace-memory.service";

export class AdjustmentRollbackService {
  static async rollback(params: {
    workspaceId: string;
    adjustmentId: number;
    reason: string;
    metrics: Record<string, any>;
  }): Promise<void> {
    const { workspaceId, adjustmentId, reason, metrics } = params;

    await pgPool.query("BEGIN");

    try {
      /* ----------------------------------------
         1️⃣ Adjustment 상태 변경
      ---------------------------------------- */
      await pgPool.query(
        `
        UPDATE learning_adjustments
        SET
          status = 'ROLLED_BACK',
          applied_at = NOW()
        WHERE id = $1
          AND workspace_id = $2
        `,
        [adjustmentId, workspaceId]
      );

      /* ----------------------------------------
         2️⃣ Effect Log 기록
      ---------------------------------------- */
      await pgPool.query(
        `
        INSERT INTO learning_adjustment_effect_logs
          (workspace_id, adjustment_id, verdict, reason, metrics)
        VALUES ($1,$2,'ROLLBACK',$3,$4)
        `,
        [workspaceId, adjustmentId, reason, metrics]
      );

      /* ----------------------------------------
         3️⃣ Workspace 강제 안정화 (FREEZE → UNFREEZE)
      ---------------------------------------- */
      await WorkspaceMemoryService.manualUnfreeze(
        workspaceId,
        "rollback_service"
      );

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }
  }
}

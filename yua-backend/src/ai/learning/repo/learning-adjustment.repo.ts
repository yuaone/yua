// 📂 src/ai/learning/repo/learning-adjustment.repo.ts
// 🔒 PHASE 14 Adjustment Repo (SSOT)
//
// - "학습"이 아니라 "조정 기록" 저장
// - payload는 비식별 운영 메타 기반 파라미터만
// - MemoryManager가 '소비'할 수 있는 형태로 기록
// - NO rule change, NO model training

import { pgPool } from "../../../db/postgres";

export type AdjustmentStatus =
  | "PENDING"
  | "APPLIED"
  | "REJECTED"
  | "ROLLED_BACK";

export type LearningAdjustmentRow = {
  id: number;
  workspace_id: string;
  candidate_id: number | null;
  adjustment_type: string;
  scope: string;
  payload: Record<string, any>;
  applied_by: string | null;
  status: AdjustmentStatus;
  created_at: Date;
  applied_at: Date | null;
};

export const LearningAdjustmentRepo = {
  async create(params: {
    workspaceId: string;
    adjustmentType: string;
    scope: string;
    payload: Record<string, any>;
    candidateId?: number | null;
    appliedBy?: string;
  }): Promise<LearningAdjustmentRow> {
    const {
      workspaceId,
      adjustmentType,
      scope,
      payload,
      candidateId,
      appliedBy,
    } = params;

    const { rows } = await pgPool.query<LearningAdjustmentRow>(
      `
      INSERT INTO learning_adjustments
        (workspace_id, candidate_id, adjustment_type, scope, payload, applied_by, status)
      VALUES
        ($1,$2,$3,$4,$5,$6,'PENDING')
      RETURNING *
      `,
      [
        workspaceId,
        candidateId ?? null,
        adjustmentType,
        scope,
        payload,
        appliedBy ?? null,
      ]
    );

    return rows[0];
  },

  async markApplied(params: {
    workspaceId: string;
    adjustmentId: number;
  }): Promise<void> {
    const { workspaceId, adjustmentId } = params;

    await pgPool.query(
      `
      UPDATE learning_adjustments
      SET
        status = 'APPLIED',
        applied_at = NOW()
      WHERE id = $1
        AND workspace_id = $2
      `,
      [adjustmentId, workspaceId]
    );
  },

  async markRejected(params: {
    workspaceId: string;
    adjustmentId: number;
  }): Promise<void> {
    const { workspaceId, adjustmentId } = params;

    await pgPool.query(
      `
      UPDATE learning_adjustments
      SET
        status = 'REJECTED'
      WHERE id = $1
        AND workspace_id = $2
      `,
      [adjustmentId, workspaceId]
    );
  },

  async listPending(params: {
    workspaceId: string;
    limit?: number;
  }): Promise<LearningAdjustmentRow[]> {
    const { workspaceId, limit = 50 } = params;

    const { rows } = await pgPool.query<LearningAdjustmentRow>(
      `
      SELECT *
      FROM learning_adjustments
      WHERE workspace_id = $1
        AND status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [workspaceId, limit]
    );

    return rows;
  },

  async getLatestAppliedByScope(params: {
    workspaceId: string;
    scope: string;
  }): Promise<LearningAdjustmentRow | null> {
    const { workspaceId, scope } = params;

    const { rows } = await pgPool.query<LearningAdjustmentRow>(
      `
      SELECT *
      FROM learning_adjustments
      WHERE workspace_id = $1
        AND scope = $2
        AND status = 'APPLIED'
      ORDER BY applied_at DESC
      LIMIT 1
      `,
      [workspaceId, scope]
    );

    return rows[0] ?? null;
  },
};

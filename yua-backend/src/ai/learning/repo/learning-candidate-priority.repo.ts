// 📂 src/ai/learning/repo/learning-candidate-priority.repo.ts
// 🔒 PHASE 13-3 Priority Repo (SSOT)
//
// - learning_candidate_priority 테이블 전용
// - Deterministic read/write only
// - NO learning
// - NO rule change

import { pgPool } from "../../../db/postgres";

export type PriorityRow = {
  workspace_id: string;
  candidate_id: number;
  priority_score: number;
  rank: number;
  source: string;
  scope: string;
  signal_type: string;
  created_at: Date;
};

export const LearningCandidatePriorityRepo = {
  async clearWorkspace(workspaceId: string): Promise<void> {
    await pgPool.query(
      `
      DELETE FROM learning_candidate_priority
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );
  },

  async insertRow(params: {
    workspaceId: string;
    candidateId: number;
    priorityScore: number;
    rank: number;
    source: string;
    scope: string;
    signalType: string;
  }): Promise<void> {
    const {
      workspaceId,
      candidateId,
      priorityScore,
      rank,
      source,
      scope,
      signalType,
    } = params;

    await pgPool.query(
      `
      INSERT INTO learning_candidate_priority
        (workspace_id, candidate_id, priority_score, rank, source, scope, signal_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        workspaceId,
        candidateId,
        priorityScore,
        rank,
        source,
        scope,
        signalType,
      ]
    );
  },

  async listTop(params: {
    workspaceId: string;
    limit?: number;
  }): Promise<PriorityRow[]> {
    const { workspaceId, limit = 50 } = params;

    const { rows } = await pgPool.query<PriorityRow>(
      `
      SELECT
        workspace_id,
        candidate_id,
        priority_score,
        rank,
        source,
        scope,
        signal_type,
        created_at
      FROM learning_candidate_priority
      WHERE workspace_id = $1
      ORDER BY rank ASC
      LIMIT $2
      `,
      [workspaceId, limit]
    );

    return rows;
  },
};

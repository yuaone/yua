// 📂 src/ai/learning/repo/learning-candidate-review.repo.ts
// 🔒 PHASE 13-4 Candidate Review Repo (SSOT)
//
// - Candidate에 대한 관리자 결정 기록
// - APPROVE/REJECT/DEFER only
// - NO learning
// - NO rule mutation

import { pgPool } from "../../../db/postgres";

export type ReviewDecision = "APPROVE" | "REJECT" | "DEFER";

export type CandidateReviewRow = {
  id: number;
  workspace_id: string;
  candidate_id: number;
  decision: ReviewDecision;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date;
  meta: Record<string, any> | null;
  created_at: Date;
};

export const LearningCandidateReviewRepo = {
  async create(params: {
    workspaceId: string;
    candidateId: number;
    decision: ReviewDecision;
    reviewedBy?: string;
    reason?: string;
    meta?: Record<string, any>;
  }): Promise<CandidateReviewRow> {
    const {
      workspaceId,
      candidateId,
      decision,
      reviewedBy,
      reason,
      meta,
    } = params;

    const { rows } = await pgPool.query<CandidateReviewRow>(
      `
      INSERT INTO learning_candidate_reviews
        (workspace_id, candidate_id, decision, reason, reviewed_by, reviewed_at, meta)
      VALUES
        ($1,$2,$3,$4,$5,NOW(),$6)
      RETURNING *
      `,
      [
        workspaceId,
        candidateId,
        decision,
        reason ?? null,
        reviewedBy ?? null,
        meta ?? null,
      ]
    );

    return rows[0];
  },

  async getLatestDecision(params: {
    workspaceId: string;
    candidateId: number;
  }): Promise<CandidateReviewRow | null> {
    const { workspaceId, candidateId } = params;

    const { rows } = await pgPool.query<CandidateReviewRow>(
      `
      SELECT *
      FROM learning_candidate_reviews
      WHERE workspace_id = $1
        AND candidate_id = $2
      ORDER BY reviewed_at DESC
      LIMIT 1
      `,
      [workspaceId, candidateId]
    );

    return rows[0] ?? null;
  },

  async listRecent(params: {
    workspaceId: string;
    limit?: number;
  }): Promise<CandidateReviewRow[]> {
    const { workspaceId, limit = 50 } = params;

    const { rows } = await pgPool.query<CandidateReviewRow>(
      `
      SELECT *
      FROM learning_candidate_reviews
      WHERE workspace_id = $1
      ORDER BY reviewed_at DESC
      LIMIT $2
      `,
      [workspaceId, limit]
    );

    return rows;
  },
};

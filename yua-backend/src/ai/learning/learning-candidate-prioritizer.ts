// 🔒 PHASE 13-3 Learning Candidate Prioritizer (SSOT)
// --------------------------------------------------
// - READ ONLY (except priority table)
// - NO learning
// - NO rule mutation
// - Deterministic ordering only

import { pgPool } from "../../db/postgres";

type CandidateRow = {
  id: number;
  workspace_id: string;
  source: string;
  scope: string;
  signal_type: string;
  severity: number;
  sample_count: number;
  created_at: Date;
};

const SOURCE_WEIGHT: Record<string, number> = {
  runtime_signal: 1.0,
  drift: 0.8,
  metadata: 0.6,
};

export class LearningCandidatePrioritizer {
  /**
   * 🔢 Workspace 단위 우선순위 계산
   */
  static async prioritizeWorkspace(params: {
    workspaceId: string;
  }): Promise<void> {
    const { workspaceId } = params;

    /* ----------------------------------------
       0️⃣ Gate 확인
    ---------------------------------------- */
    const gate = await pgPool.query<{ eligible: boolean }>(
      `
      SELECT eligible
      FROM workspace_learning_gate
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    if (!gate.rows[0]?.eligible) {
      return;
    }

    /* ----------------------------------------
       1️⃣ 후보 로드
    ---------------------------------------- */
    const { rows } = await pgPool.query<CandidateRow>(
      `
      SELECT *
      FROM learning_candidates
      WHERE workspace_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      `,
      [workspaceId]
    );

    if (!rows.length) return;

    /* ----------------------------------------
       2️⃣ Score 계산
    ---------------------------------------- */
    const scored = rows.map((c) => {
      const severityScore = c.severity * 0.4;

      const sampleScore =
        Math.log(c.sample_count + 1) /
        Math.log(100) *
        0.25;

      const sourceWeight =
        (SOURCE_WEIGHT[c.source] ?? 0.5) * 0.2;

      const ageHours =
        (Date.now() - new Date(c.created_at).getTime()) /
        1000 /
        3600;

      const recencyScore =
        Math.max(0, 1 - ageHours / 72) * 0.15;

      const priorityScore =
        severityScore +
        sampleScore +
        sourceWeight +
        recencyScore;

      return {
        candidate: c,
        priorityScore: Number(priorityScore.toFixed(4)),
      };
    });

    /* ----------------------------------------
       3️⃣ 정렬
    ---------------------------------------- */
    scored.sort(
      (a, b) => b.priorityScore - a.priorityScore
    );

    /* ----------------------------------------
       4️⃣ 저장 (idempotent)
    ---------------------------------------- */
    await pgPool.query(
      `
      DELETE FROM learning_candidate_priority
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    let rank = 1;

    for (const s of scored) {
      const c = s.candidate;

      await pgPool.query(
        `
        INSERT INTO learning_candidate_priority
          (workspace_id,
           candidate_id,
           priority_score,
           rank,
           source,
           scope,
           signal_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          workspaceId,
          c.id,
          s.priorityScore,
          rank++,
          c.source,
          c.scope,
          c.signal_type,
        ]
      );
    }
  }
}

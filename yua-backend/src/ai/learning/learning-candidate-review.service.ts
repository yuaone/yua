// 🔒 PHASE 13-4 Learning Candidate Review Service (SSOT)
// -----------------------------------------------------
// - Review → Adjustment 생성 오케스트레이션
// - NO learning
// - NO rule mutation
// - MemoryManager ❌ (PHASE 14에서 연결)
// - 모든 결정은 기록된다 (Audit First)

import { pgPool } from "../../db/postgres";
import {
  LearningCandidateReviewRepo,
  ReviewDecision,
} from "./repo/learning-candidate-review.repo";
import {
  LearningAdjustmentRepo,
} from "./repo/learning-adjustment.repo";

/* ===================================================
   Types
================================================== */

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

/* ===================================================
   Service
================================================== */

export class LearningCandidateReviewService {
  /**
   * 🔍 후보 리뷰 + (조건부) Adjustment 생성
   *
   * 규칙:
   * - 모든 decision은 기록된다
   * - APPROVE → Adjustment(PENDING) 생성
   * - REJECT/DEFER → 기록만
   */
  static async reviewCandidate(params: {
    workspaceId: string;
    candidateId: number;
    decision: ReviewDecision;
    reviewer?: string; // admin | system
    reason?: string;
  }): Promise<void> {
    const {
      workspaceId,
      candidateId,
      decision,
      reviewer,
      reason,
    } = params;

    /* ----------------------------------------
       0️⃣ Candidate 존재 확인
    ---------------------------------------- */
    const { rows } = await pgPool.query<CandidateRow>(
      `
      SELECT *
      FROM learning_candidates
      WHERE id = $1
        AND workspace_id = $2
      `,
      [candidateId, workspaceId]
    );

    const candidate = rows[0];
    if (!candidate) {
      throw new Error("learning_candidate_not_found");
    }

    /* ----------------------------------------
       1️⃣ 최신 결정 중복 방지
    ---------------------------------------- */
    const latest =
      await LearningCandidateReviewRepo.getLatestDecision({
        workspaceId,
        candidateId,
      });

    if (latest && latest.decision === decision) {
      // 같은 결정 반복 → 무시 (idempotent)
      return;
    }

    /* ----------------------------------------
       2️⃣ Review 기록 (무조건)
    ---------------------------------------- */
    await LearningCandidateReviewRepo.create({
      workspaceId,
      candidateId,
      decision,
      reviewedBy: reviewer ?? "admin",
      reason,
      meta: {
        source: candidate.source,
        severity: candidate.severity,
        sampleCount: candidate.sample_count,
      },
    });

    /* ----------------------------------------
       3️⃣ APPROVE → Adjustment 생성
    ---------------------------------------- */
    if (decision !== "APPROVE") return;

    /**
     * ⚠️ 여기서 "무엇을 조정할지"는
     * - 절대 Rule 아님
     * - 절대 판단 아님
     * - 메타 기반 파라미터 ONLY
     */

    const adjustmentType = this.resolveAdjustmentType(
      candidate.signal_type
    );

    const payload = this.buildAdjustmentPayload(candidate);

    await LearningAdjustmentRepo.create({
      workspaceId,
      candidateId: candidate.id,
      adjustmentType,
      scope: candidate.scope,
      payload,
      appliedBy: reviewer ?? "admin",
    });
  }

  /* ===================================================
     Internal Helpers
  =================================================== */

  /**
   * 📌 signal_type → adjustment_type 매핑
   * (SSOT, 확장 가능)
   */
  private static resolveAdjustmentType(
    signalType: string
  ): string {
    switch (signalType) {
      case "confidence_collapse":
        return "confidence_calibration";
      case "verifier_failure_spike":
        return "verifier_weight_adjustment";
      case "drift_accumulation":
        return "stability_bias_adjustment";
      case "instability_detected":
        return "decay_parameter_tuning";
      default:
        return "generic_safety_adjustment";
    }
  }

  /**
   * 📦 Adjustment Payload 생성
   * - 비식별
   * - 운영 메타만 포함
   */
  private static buildAdjustmentPayload(
    candidate: CandidateRow
  ): Record<string, any> {
    return {
      source: candidate.source,
      signalType: candidate.signal_type,
      severity: candidate.severity,
      sampleCount: candidate.sample_count,

      // ⚠️ 숫자만, 의미 없음
      suggestedWeight:
        Math.min(1, candidate.severity * 0.8),

      createdAt: candidate.created_at.toISOString(),
    };
  }
}

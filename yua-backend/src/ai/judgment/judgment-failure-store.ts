// 🔒 STEP 2: Failure + Uncertainty Store (SSOT PHASE 4-D FINAL)

import crypto from "crypto";
import type { PathType } from "../../routes/path-router";
import type {
  JudgmentFailureLog,
  FailureStage,
} from "./judgment-failure-log";
import { judgmentMetrics } from "./judgment-metrics";
import type { TPUInputVector } from "./tpu/tpu-input-vector";
import { pgPool } from "../../db/postgres";

/**
 * 🔒 JudgmentFailureStore
 *
 * - 메모리 캐시 + PostgreSQL 영속화
 * - Failure INSERT의 단일 책임자 (SSOT)
 */
export class JudgmentFailureStore {
  private failures: JudgmentFailureLog[] = [];

  /* -------------------------------------------------- */
  /* Core API                                          */
  /* -------------------------------------------------- */

  add(log: JudgmentFailureLog): void {
    this.failures.push(log);
  }

  /**
   * 🔥 PHASE 6
   * Claim Boundary Violation 기록 (DB 저장 ❌)
   * - 온라인 Rule 보정 전용
   */
  record(params: {
    traceId: string;
    type: "CLAIM_BOUNDARY_VIOLATION";
    reason: string;
    path: PathType;
    boundary?: "CANNOT_ASSERT" | "CAN_SUGGEST" | "CAN_ASSERT";
  }): void {
    const log: JudgmentFailureLog = {
      id: crypto.randomUUID(),
      input: params.reason,
      path: params.path,
      confidence: 0,
      reason: params.reason,
      type: "claim-boundary",
      stage: "generation",
      boundary: params.boundary,
      timestamp: Date.now(),
    };

    this.add(log);
    judgmentMetrics.recordFailure(params.reason, "soft");
  }

  getRecent(limit = 50): JudgmentFailureLog[] {
    return this.failures.slice(-limit);
  }

  findByHint(hint: string): JudgmentFailureLog[] {
    return this.failures.filter((f) =>
      f.input.toLowerCase().includes(hint.toLowerCase())
    );
  }

  /* -------------------------------------------------- */
  /* Soft Failure (불확실성 / 교정)                     */
  /* -------------------------------------------------- */

  async addSoftFailure(params: {
    instanceId: string;
    input: string;
    originalPath: PathType;
    correctedPath?: PathType;
    confidence: number;
    reason: string;
    stage?: unknown;
  }): Promise<void> {
    const log: JudgmentFailureLog = {
      id: crypto.randomUUID(),
      input: params.input,
      path: params.originalPath,
      correctedPath: params.correctedPath,
      confidence: params.confidence,
      reason: params.reason,
      type: "soft",
      stage: normalizeFailureStage(params.stage),
      timestamp: Date.now(),
    };

    this.add(log);
    judgmentMetrics.recordFailure(params.reason, "soft");

    await insertFailureToDB(params.instanceId, log);
  }

  /* -------------------------------------------------- */
  /* Hard Failure (차단 / 규칙 위반)                    */
  /* -------------------------------------------------- */

  async addHardFailure(params: {
    instanceId: string;
    input: string;
    originalPath: PathType;
    correctedPath?: PathType;
    reason: string;
    stage?: unknown;
  }): Promise<void> {
    const log: JudgmentFailureLog = {
      id: crypto.randomUUID(),
      input: params.input,
      path: params.originalPath,
      correctedPath: params.correctedPath,
      confidence: 0,
      reason: params.reason,
      type: "hard",
      stage: normalizeFailureStage(params.stage),
      timestamp: Date.now(),
    };

    this.add(log);
    judgmentMetrics.recordFailure(params.reason, "hard");

    await insertFailureToDB(params.instanceId, log);
  }

  /* -------------------------------------------------- */
  /* 🔥 PHASE 3: TPU Input Vector 변환                  */
  /* -------------------------------------------------- */

  toTPUInputVector(params: {
    inputEmbedding: number[];
    domain: string;
    difficulty: number;
    documentCount?: number;
    researchIntent?: boolean;
    hasUrl?: boolean;
  }): TPUInputVector | null {
    const last = this.failures.at(-1);
    if (!last) return null;

    return {
      inputEmbedding: params.inputEmbedding,
      domain: params.domain,
      difficulty: params.difficulty,
      pathHint: last.path,

      softFailure: last.type === "soft",
      hardFailure: last.type === "hard",
      failureReason: last.reason,
      failureStage: last.stage,

      pathCorrected: Boolean(last.correctedPath),
      originalPath: last.path,
      correctedPath: last.correctedPath,

      confidence: last.confidence,
      documentCount: params.documentCount,
      researchIntent: params.researchIntent,
      hasUrl: params.hasUrl,

      timestamp: last.timestamp,
    };
  }
}

/* -------------------------------------------------- */
/* 🔒 FailureStage Normalizer                          */
/* -------------------------------------------------- */

function normalizeFailureStage(stage?: unknown): FailureStage {
  if (
    stage === "path-router" ||
    stage === "document" ||
    stage === "generation" ||
    stage === "vision" ||
    stage === "engine" ||
    stage === "capability"
  ) {
    return stage;
  }
  return "capability";
}

/* -------------------------------------------------- */
/* 🐘 PostgreSQL INSERT (SSOT)                         */
/* -------------------------------------------------- */

async function insertFailureToDB(
  instanceId: string,
  log: JudgmentFailureLog
): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO judgment_failures (
      id,
      instance_id,
      input,
      path,
      corrected_path,
      confidence,
      reason,
      type,
      stage,
      created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      to_timestamp($10 / 1000.0)
    )
    `,
    [
      log.id,
      instanceId,
      log.input,
      log.path,
      log.correctedPath ?? null,
      log.confidence,
      log.reason,
      log.type,
      log.stage,
      log.timestamp,
    ]
  );
}

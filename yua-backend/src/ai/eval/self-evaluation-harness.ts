// 🔒 PHASE 8-10 — Self Evaluation Harness (SSOT FINAL)
// --------------------------------------------------
// ✔ Read-only evaluation
// ✔ No mutation / No learning
// ✔ Human-review output only
// --------------------------------------------------

import { pgPool } from "../../db/postgres";

export type EvaluationReport = {
  windowHours: number;
  sampleSize: number;

  confidenceCalibration: {
    bin: number;
    samples: number;
    successRate: number;
  }[];

  pathDistribution: {
    path: string;
    count: number;
    successRate: number;
  }[];

  verifierHealth: {
    failRate: number;
    avgBudgetUsed: number;
  };

  driftWarnings: string[];
  generatedAt: string;
};

export async function runSelfEvaluation(
  windowHours = 48
): Promise<EvaluationReport> {
  const since = `${windowHours} hours`;

  // -----------------------------
  // 1️⃣ Confidence Calibration
  // -----------------------------
  const { rows: confBins } = await pgPool.query(
    `
    SELECT
      floor(confidence * 10) / 10 AS bin,
      COUNT(*) AS samples,
      AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS success_rate
    FROM runtime_statistics
    WHERE created_at >= NOW() - INTERVAL '${since}'
    GROUP BY bin
    ORDER BY bin
    `
  );

  // -----------------------------
  // 2️⃣ Path Distribution
  // -----------------------------
  const { rows: pathStats } = await pgPool.query(
    `
    SELECT
      path,
      COUNT(*) AS count,
      AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS success_rate
    FROM runtime_statistics
    WHERE created_at >= NOW() - INTERVAL '${since}'
    GROUP BY path
    ORDER BY count DESC
    `
  );

  // -----------------------------
  // 3️⃣ Verifier Health
  // -----------------------------
  const { rows: verifier } = await pgPool.query(
    `
    SELECT
      AVG(CASE WHEN verifier_failed THEN 1 ELSE 0 END) AS fail_rate,
      AVG(verifier_used) AS avg_used
    FROM runtime_statistics
    WHERE created_at >= NOW() - INTERVAL '${since}'
    `
  );

  // -----------------------------
  // 4️⃣ Drift Detection (soft)
  // -----------------------------
  const driftWarnings: string[] = [];

  for (let i = 1; i < confBins.length; i++) {
    const prev = confBins[i - 1];
    const curr = confBins[i];

    if (
      prev.samples >= 3 &&
      curr.samples >= 3 &&
      prev.success_rate > curr.success_rate
    ) {
      driftWarnings.push(
        `confidence_drift: ${prev.bin} > ${curr.bin}`
      );
    }
  }

  return {
    windowHours,
    sampleSize: confBins.reduce(
      (a, b) => a + Number(b.samples),
      0
    ),

    confidenceCalibration: confBins.map((r) => ({
      bin: Number(r.bin),
      samples: Number(r.samples),
      successRate: Number(r.success_rate),
    })),

    pathDistribution: pathStats.map((r) => ({
      path: r.path,
      count: Number(r.count),
      successRate: Number(r.success_rate),
    })),

    verifierHealth: {
      failRate: Number(verifier[0]?.fail_rate ?? 0),
      avgBudgetUsed: Number(verifier[0]?.avg_used ?? 0),
    },

    driftWarnings,
    generatedAt: new Date().toISOString(),
  };
}

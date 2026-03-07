/**
 * 🔒 Phase 2 — Training Dataset Extractor
 * - JudgmentFailureLog → ML 학습 데이터
 * - Embedding은 의미 요약용으로만 사용
 * - Rule / 사고흐름 노출 ❌
 */

import "dotenv/config";

import fs from "fs";
import path from "path";

import { pgPool } from "../../../db/postgres";
import type { TPUInputVector } from "../../judgment/tpu/tpu-input-vector";
import { embed } from "../../vector/embedder";

/* -------------------------------------------------- */
/* Output Path (확정)                                 */
/* -------------------------------------------------- */

const OUTPUT = path.resolve(
  process.cwd(),               // 🔒 실행 위치 기준
  "src/ai/ml/dataset/samples.jsonl"
);

/* -------------------------------------------------- */
/* Embedding Text Builder (의미 요약 전용)             */
/* -------------------------------------------------- */

function buildEmbeddingText(r: {
  path: string;
  corrected_path?: string | null;
  type: string;
  reason: string;
  stage: string;
}): string {
  return [
    `path=${r.path}`,
    r.corrected_path ? `corrected=${r.corrected_path}` : "",
    `type=${r.type}`,
    `reason=${r.reason}`,
    `stage=${r.stage}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/* -------------------------------------------------- */
/* Extractor                                          */
/* -------------------------------------------------- */

export async function extractDataset(limit = 1000): Promise<void> {
  // 0️⃣ 출력 디렉터리 보장
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  // 1️⃣ 데이터 로드 (schema 주의)
  const { rows } = await pgPool.query(
    `
    SELECT
      path,
      corrected_path,
      confidence,
      reason,
      type,
      stage,
      extract(epoch from created_at) * 1000 AS timestamp
    FROM judgment_failures
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  if (!rows || rows.length === 0) {
    console.warn("⚠️ No judgment failures found. Dataset not created.");
    return;
  }

  // 2️⃣ Write Stream
  const stream = fs.createWriteStream(OUTPUT, {
    flags: "w",
    encoding: "utf-8",
  });

  // 3️⃣ Row → TPUInputVector
  for (const r of rows) {
    const embeddingText = buildEmbeddingText(r);

    const embeddingResult = await embed(embeddingText);

    const sample: TPUInputVector = {
      inputEmbedding: embeddingResult.vector, // ✅ 1536-dim
      domain: "unknown",
      difficulty: r.type === "hard" ? 1 : 0.5,
      pathHint: r.path,

      softFailure: r.type === "soft",
      hardFailure: r.type === "hard",
      failureReason: r.reason,
      failureStage: r.stage,

      pathCorrected: Boolean(r.corrected_path),
      originalPath: r.path,
      correctedPath: r.corrected_path ?? undefined,

      confidence: r.confidence,
      timestamp: r.timestamp,
    };

    stream.write(JSON.stringify(sample) + "\n");
  }

  stream.end();

  console.log("✅ Dataset extracted with embeddings:");
  console.log("   →", OUTPUT);
}

/* -------------------------------------------------- */
/* CLI Entry                                          */
/* -------------------------------------------------- */

if (require.main === module) {
  extractDataset()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ Dataset extraction failed:", err);
      process.exit(1);
    });
}

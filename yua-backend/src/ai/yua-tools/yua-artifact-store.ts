import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { pgPool } from "../../db/postgres";

const ARTIFACT_ROOT = process.env.YUA_TOOL_ARTIFACT_ROOT || "/mnt/yua/tool-artifacts";

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extFor(type: "CSV" | "JSON" | "PDF" | "DOCX"): string {
  if (type === "CSV") return "csv";
  if (type === "JSON") return "json";
  if (type === "PDF") return "pdf";
  return "docx";
}

export async function saveToolArtifact(params: {
  toolRunId: string;
  artifactType: "CSV" | "JSON" | "PDF" | "DOCX";
  content: Buffer | string;
  name?: string; // optional suffix (e.g. "diff", "table_p1_t0")
}): Promise<{ uri: string; hash: string }> {
  ensureDirSync(ARTIFACT_ROOT);

  const ext = extFor(params.artifactType);
  const fileName = params.name
    ? `${params.toolRunId}.${params.name}.${ext}`
    : `${params.toolRunId}.${ext}`;

  const uri = path.join(ARTIFACT_ROOT, fileName);

  const contentBuffer =
    typeof params.content === "string" ? Buffer.from(params.content, "utf8") : params.content;

  // 1) 파일 먼저 씀 (DB 실패시 삭제 롤백)
  await fs.promises.writeFile(uri, contentBuffer);

  const hash = sha256Hex(contentBuffer);

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

// 🔒 동일 hash artifact 중복 방지
const exists = await client.query(
  `SELECT uri FROM tool_artifacts
   WHERE tool_run_id = $1 AND hash = $2
   LIMIT 1`,
  [params.toolRunId, hash]
);

if (exists.rows.length > 0) {
  await client.query("ROLLBACK");
  await fs.promises.rm(uri, { force: true });
  return { uri: exists.rows[0].uri, hash };
}
    await client.query(
      `INSERT INTO tool_artifacts (tool_run_id, artifact_type, uri, hash)
       VALUES ($1, $2, $3, $4)`,
      [params.toolRunId, params.artifactType, uri, hash]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    await fs.promises.rm(uri, { force: true }); // 파일 롤백
    throw e;
  } finally {
    client.release();
  }

  return { uri, hash };
}

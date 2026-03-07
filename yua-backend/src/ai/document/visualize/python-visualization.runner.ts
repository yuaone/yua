import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const LOCAL_ASSET_ROOT = "/mnt/yua/assets";

/**
 * 🔒 FACTUAL VISUALIZATION ONLY
 * - Python 계산 결과 시각화
 * - 감성/연상/LLM 금지
 */
export async function runPythonVisualization(args: {
  sectionId: number;
  script: string;
  payload: unknown;
}): Promise<{ uri: string; hash: string }> {
  const { sectionId, script, payload } = args;

  const proc = spawn("python3", ["-c", script], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();

  const chunks: Buffer[] = [];
  for await (const chunk of proc.stdout) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const dir = path.join(LOCAL_ASSET_ROOT, "visualizations");
  const filePath = path.join(
    dir,
    `section-${sectionId}-${hash}.png`
  );
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return {
    uri: `file://${filePath}`,
    hash,
  };
}

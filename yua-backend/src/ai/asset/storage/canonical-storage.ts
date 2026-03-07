import fs from "fs";
import path from "path";

export async function writeCanonicalJSON(params: {
  assetId: string;
  version: number;
  filename: string; // "canonical.json"
  data: unknown;
}): Promise<{ contentRef: string }> {
  const { assetId, version, filename, data } = params;

  const dir = path.resolve("storage", "assets", assetId, `v${version}`);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  // SSOT: content_ref는 로컬 파일 path로 시작 (나중에 blob로 바뀌어도 contract는 유지)
  return { contentRef: filePath };
}

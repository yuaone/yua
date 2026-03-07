import { ExtractedJsonFile } from "../types";
import { readUtf8, safeJsonStringify, ensureAllowedPath } from "../utils/fs";

export async function extractJson(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
}): Promise<ExtractedJsonFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);

  return {
    ...args,
    kind: "JSON",
    warnings,
    readJsonText: async () => {
      const raw = await readUtf8(args.localPath, 20_000_000);
      try {
        const obj = JSON.parse(raw);
        return safeJsonStringify(obj, 200_000);
      } catch {
        warnings.push("JSON parse failed; returning raw text.");
        return raw;
      }
    },
  };
}

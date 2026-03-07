import { ExtractedTextFile } from "../types";
import { readUtf8, ensureAllowedPath } from "../utils/fs";

export async function extractText(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
}): Promise<ExtractedTextFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);
  return {
    ...args,
    kind: "TEXT",
    warnings,
    readText: async () => readUtf8(args.localPath),
  };
}

// 📂 src/ai/file/file-io/pdf-extractor.ts
// ✅ Type-safe + ESM-safe + no TS errors version

import type { ExtractedPdfFile } from "../types";
import fs from "node:fs/promises";
import { ensureAllowedPath } from "../utils/fs";

export async function extractPdf(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
}): Promise<ExtractedPdfFile> {
  const warnings: string[] = [];

  // 🔒 path guard
  ensureAllowedPath(args.localPath);

  return {
    ...args,
    kind: "PDF",
    warnings,

    readText: async () => {
      try {
        // ✅ ESM safe dynamic import
        const mod: any = await import("pdf-parse");
        const pdfParse = mod.default ?? mod;

        const data = await fs.readFile(args.localPath);
        const result = await pdfParse(data);

        const text = (result?.text ?? "").toString();

        if (!text.trim()) {
          warnings.push("PDF text extraction returned empty text.");
        }

        return text;
      } catch (err: any) {
        warnings.push(`PDF parse error: ${err?.message ?? String(err)}`);
        return "";
      }
    },
  };
}

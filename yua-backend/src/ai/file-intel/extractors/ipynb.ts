import { ExtractedNotebookFile } from "../types";
import { readUtf8, ensureAllowedPath } from "../utils/fs";

export async function extractIpynb(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
}): Promise<ExtractedNotebookFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);

  const raw = await readUtf8(args.localPath, 10_000_000);
  try {
    const json = JSON.parse(raw);
    const cells: string[] = [];
    const jCells = Array.isArray(json?.cells) ? json.cells : [];
    for (const c of jCells) {
      const src = c?.source;
      if (Array.isArray(src)) cells.push(src.join(""));
      else if (typeof src === "string") cells.push(src);
    }
    return { ...args, kind: "NOTEBOOK", warnings, cells };
  } catch {
    warnings.push("IPYNB parse failed; treating as plain text cell.");
    return { ...args, kind: "NOTEBOOK", warnings, cells: [raw] };
  }
}

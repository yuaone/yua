import { FileIntelAttachment, ExtractedFile } from "../types";
import { createFileId, extLower, statSize, ensureAllowedPath } from "../utils/fs";
import { extractZip } from "./zip";
import { extractCsv } from "./csv";
import { extractXlsx } from "./xlsx";
import { extractIpynb } from "./ipynb";
import { extractPdf } from "./pdf";
import { extractText } from "./text";
import { extractJson } from "./json";

export async function extractAll(attachments: FileIntelAttachment[]): Promise<ExtractedFile[]> {
  const out: ExtractedFile[] = [];
  for (const a of attachments) {
    try {
      out.push(await extractByPath(a));
    } catch (e) {
      console.error("[FILE_EXTRACT_ERROR]", {
        fileName: a.fileName,
        error: String(e),
      });
    }
  }
  return out;
}

export async function extractByPath(input: {
  fileName: string;
  localPath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  id?: string;
  fileTypeOverride?: string;
}): Promise<ExtractedFile> {
  ensureAllowedPath(input.localPath);

  const fileId = input.id ?? createFileId();
  const fileType = input.fileTypeOverride ?? extLower(input.fileName);
  const sizeBytes = typeof input.sizeBytes === "number" ? input.sizeBytes : await statSize(input.localPath);

  const base = {
    fileId,
    fileName: input.fileName,
    fileType,
    mimeType: input.mimeType ?? null,
    sizeBytes,
    localPath: input.localPath,
  };

  switch (fileType) {
    case "zip":
      return extractZip({ ...base, maxEntries: 200 });

    case "csv":
    case "tsv":
      return extractCsv({ ...base, hasHeader: true });

    case "xlsx":
    case "xls":
      return extractXlsx({ ...base, maxRowsPerSheet: 200_000 });

    case "ipynb":
      return extractIpynb(base);

    case "pdf":
      return extractPdf(base);

    case "json":
      return extractJson(base);

    default:
      return extractText(base);
  }
}

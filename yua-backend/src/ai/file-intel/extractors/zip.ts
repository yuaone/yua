import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { ExtractedArchiveFile, ExtractedFile } from "../types";
import { mkTempDir, extLower, statSize, ensureAllowedPath, rmrf } from "../utils/fs";
import { extractByPath } from "./router";

export async function extractZip(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
  maxEntries?: number;
}): Promise<ExtractedArchiveFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);

  const maxEntries = args.maxEntries ?? 200;

  let unzipper: any;
  try {
    unzipper = await import("unzipper");
  } catch {
    throw new Error("Missing dependency: unzipper");
  }

  const tempDir = await mkTempDir("yua-zip-");
  const entries: ExtractedFile[] = [];

  try {
    const directory = await unzipper.Open.file(args.localPath);
    const files = directory.files?.filter((f: any) => f.type === "File") ?? [];

    if (files.length > maxEntries) warnings.push(`ZIP entries capped: ${files.length} -> ${maxEntries}`);

    for (const f of files.slice(0, maxEntries)) {
      const outPath = path.join(tempDir, f.path);
      try {
        await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

        const readStream = f.stream();
        const writeStream = fs.createWriteStream(outPath);
        await pipeline(readStream, writeStream);

        const child = await extractByPath({
          fileName: path.basename(f.path),
          localPath: outPath,
          mimeType: null,
          sizeBytes: await statSize(outPath),
          id: `${args.fileId}::${f.path}`,
          fileTypeOverride: extLower(f.path),
        });

        entries.push(child);
      } catch (e) {
        console.error("[FILE_EXTRACT_ERROR]", {
          file: f.path,
          error: String(e),
        });
        warnings.push(`ZIP entry failed: ${f.path}`);
      }
    }

    return { ...args, kind: "ARCHIVE", warnings, entries, tempDir };
  } catch (e) {
    await rmrf(tempDir);
    throw e;
  }
}

import { ExtractedFile } from "../types";
import { rmrf } from "./fs";

export async function cleanupExtractedTemps(extracted: ExtractedFile[]): Promise<void> {
  const dirs = new Set<string>();

  const walk = (f: ExtractedFile) => {
    if (f.kind === "ARCHIVE") {
      if (f.tempDir) dirs.add(f.tempDir);
      for (const e of f.entries) walk(e);
    }
  };

  for (const f of extracted) walk(f);

  for (const d of dirs) {
    try {
      await rmrf(d);
    } catch {
      // best-effort cleanup
    }
  }
}

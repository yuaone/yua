import { DetectedSchema, ExtractedFile, FileChunk } from "../types";
import { chunkText } from "./chunk-text";
import { chunkTableWindows } from "./chunk-table";

export async function* adaptiveChunk(extracted: ExtractedFile, schema: DetectedSchema): AsyncGenerator<FileChunk> {
  let idx = 0;

  const renumber = (c: FileChunk): FileChunk => ({ ...c, chunkIndex: idx++ });

  if (schema.kind === "TABLE" && extracted.kind === "TABLE") {
    for (const t of extracted.tables) {
      const cols = t.columns?.length ? t.columns : (schema.columns ?? []);
      for await (const c of chunkTableWindows({ columns: cols, rowIterator: t.rowIterator, windowRows: 200, sheet: t.sheet })) {
        yield renumber(c);
      }
    }
    return;
  }

  if (schema.kind === "TEXT") {
    const text =
      extracted.kind === "TEXT"
        ? await extracted.readText()
        : extracted.kind === "JSON"
        ? await extracted.readJsonText()
        : "";
    for (const c of chunkText({ text })) yield renumber(c);
    return;
  }

  if (schema.kind === "NOTEBOOK" && extracted.kind === "NOTEBOOK") {
    for (const cell of extracted.cells) {
      yield renumber({ chunkIndex: 0, chunkType: "NB_CELL", content: cell, metadata: {} });
    }
    return;
  }

  if (schema.kind === "PDF" && extracted.kind === "PDF") {
    const text = await extracted.readText();
    for (const c of chunkText({ text })) {
      yield renumber({ ...c, chunkType: "PDF_TEXT" });
    }
    return;
  }

  if (schema.kind === "ARCHIVE" && extracted.kind === "ARCHIVE") {
    for (const entry of extracted.entries) {
      yield renumber({
        chunkIndex: 0,
        chunkType: "ARCHIVE_ENTRY",
        content: `Archive entry: ${entry.fileName} (${entry.fileType}, ${entry.sizeBytes} bytes)`,
        metadata: { entryType: entry.fileType },
      });
    }
    return;
  }
}

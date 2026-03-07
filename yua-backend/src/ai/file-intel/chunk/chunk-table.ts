import { FileChunk } from "../types";
import { approxTokenEstimate } from "../utils/fs";

export async function* chunkTableWindows(input: {
  columns: string[];
  rowIterator: () => AsyncGenerator<Record<string, any>>;
  windowRows?: number;
  maxWindows?: number;
  sheet?: string;
}): AsyncGenerator<FileChunk> {
  const windowRows = input.windowRows ?? 200;
  const maxWindows = input.maxWindows ?? 10_000;

  const cols = input.columns;
  const it = input.rowIterator();

  let buffer: Record<string, any>[] = [];
  let windows = 0;

  for await (const row of it) {
    buffer.push(row);
    if (buffer.length >= windowRows) {
      yield makeWindowChunk(cols, buffer, input.sheet);
      buffer = [];
      windows++;
      if (windows >= maxWindows) break;
    }
  }

  if (buffer.length) yield makeWindowChunk(cols, buffer, input.sheet);
}

function makeWindowChunk(columns: string[], rows: Record<string, any>[], sheet?: string): FileChunk {
  const header = columns.join(", ");
  const body = rows
    .map((r) => columns.map((c) => stringifyCell(r?.[c])).join(", "))
    .join("\n");

  const content =
    (sheet ? `[SHEET: ${sheet}]\n` : "") +
    `[COLUMNS]\n${header}\n\n[ROWS]\n${body}`;

  return {
    chunkIndex: 0, // will be re-numbered by adaptive chunker
    chunkType: "TABLE_WINDOW",
    content,
    tokenEstimate: approxTokenEstimate(content),
    metadata: { sheet, rows: rows.length, columns: columns.length },
  };
}

function stringifyCell(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

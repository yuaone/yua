import { DetectedSchema, ExtractedFile } from "../../types";

export async function detectSchema(extracted: ExtractedFile): Promise<DetectedSchema> {
  switch (extracted.kind) {
    case "TEXT":
    case "JSON":
      return { kind: "TEXT" };
    case "NOTEBOOK":
      return { kind: "NOTEBOOK" };
    case "PDF":
      return { kind: "PDF" };
    case "ARCHIVE":
      return { kind: "ARCHIVE" };
    case "TABLE": {
      const table = extracted.tables?.[0];
      if (!table) return { kind: "TABLE", columns: [] };
      const cols = table.columns?.length ? table.columns : await peekColumns(table.rowIterator);
      return { kind: "TABLE", columns: cols };
    }
    default:
      return { kind: "TEXT" };
  }
}

async function peekColumns(rowIteratorFactory: () => AsyncGenerator<Record<string, any>>): Promise<string[]> {
  const it = rowIteratorFactory();
  const first = await it.next();
  if (first.done || !first.value) return [];
  return Object.keys(first.value);
}

import { ExtractedTableFile } from "../types";
import { ensureAllowedPath } from "../utils/fs";
import fs from "node:fs/promises";

export async function extractXlsx(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
  maxRowsPerSheet?: number; // preview cap (warning only)
}): Promise<ExtractedTableFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);

  let XLSX: any;
  try {
    const mod: any = await import("xlsx");
    XLSX = mod.default ?? mod;
  } catch {
    throw new Error("Missing dependency: xlsx");
  }

  let wb: any;
  try {
    const data = await fs.readFile(args.localPath);
    wb = XLSX.read(data, { type: "buffer", cellDates: true });
  } catch (e: any) {
    warnings.push(`XLSX read error: ${e?.message ?? String(e)}`);
    return { ...args, kind: "TABLE", warnings, tables: [] };
  }
  const sheetNames: string[] = wb.SheetNames || [];

  const tables = sheetNames.map((name: string) => {
    const sheet = wb.Sheets[name];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const capped =
      typeof args.maxRowsPerSheet === "number" ? rows.slice(0, args.maxRowsPerSheet) : rows;
    const columns = inferColumnsFromRows(capped);

    async function* rowIterator() {
      // NOTE: xlsx library loads sheet rows into memory.
      // For extremely huge xlsx, swap to a streaming lib later.
      for (const r of rows) yield normalizeRow(columns, r);
    }

    if (typeof args.maxRowsPerSheet === "number" && rows.length > args.maxRowsPerSheet) {
      warnings.push(`XLSX "${name}" preview capped at ${args.maxRowsPerSheet}, total rows=${rows.length}.`);
    }

    return { sheet: name, columns, rowIterator, rowCountEstimate: rows.length };
  });

  return { ...args, kind: "TABLE", warnings, tables };
}

function inferColumnsFromRows(rows: any[]): string[] {
  const set = new Set<string>();
  for (const r of rows) Object.keys(r || {}).forEach((k) => set.add(k));
  return Array.from(set);
}

function normalizeRow(columns: string[], row: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const c of columns) out[c] = row?.[c] ?? null;
  return out;
}

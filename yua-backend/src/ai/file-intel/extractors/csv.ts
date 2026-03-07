import fs from "node:fs";
import { parse } from "csv-parse";
import { ExtractedTableFile } from "../types";
import { ensureAllowedPath } from "../utils/fs";

export async function extractCsv(args: {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
  hasHeader?: boolean;
  maxColumns?: number;
}): Promise<ExtractedTableFile> {
  const warnings: string[] = [];
  ensureAllowedPath(args.localPath);

  const hasHeader = args.hasHeader ?? true;
  const maxColumns = args.maxColumns ?? 500;

  async function* rowIterator(): AsyncGenerator<Record<string, any>> {
    const stream = fs.createReadStream(args.localPath);
    const parser = stream.pipe(
      parse({
        columns: hasHeader ? true : false,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    let generatedColumns: string[] | null = null;

    for await (const record of parser) {
      if (hasHeader) {
        const obj = record as Record<string, any>;
        const keys = Object.keys(obj);
        if (keys.length > maxColumns) warnings.push(`CSV columns capped at ${maxColumns} (had ${keys.length}).`);
        yield capColumns(obj, maxColumns);
      } else {
        const arr = record as any[];
        if (!generatedColumns) {
          generatedColumns = arr.map((_, i) => `col_${i + 1}`);
          if (generatedColumns.length > maxColumns) {
            warnings.push(`CSV columns capped at ${maxColumns} (had ${generatedColumns.length}).`);
          }
        }
        const obj: Record<string, any> = {};
        for (let i = 0; i < Math.min(arr.length, maxColumns); i++) obj[generatedColumns[i]] = arr[i];
        yield obj;
      }
    }
  }

  return {
    ...args,
    kind: "TABLE",
    warnings,
    tables: [
      {
        sheet: undefined,
        columns: [], // will be filled by schema peek
        rowIterator,
      },
    ],
  };
}

function capColumns(row: Record<string, any>, maxColumns: number): Record<string, any> {
  const keys = Object.keys(row);
  if (keys.length <= maxColumns) return row;
  const out: Record<string, any> = {};
  for (let i = 0; i < maxColumns; i++) out[keys[i]] = row[keys[i]];
  return out;
}

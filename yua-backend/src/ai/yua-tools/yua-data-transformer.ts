import fs from "fs";
import { createHash } from "crypto";
import { pgPool } from "../../db/postgres";
import { saveToolArtifact } from "./yua-artifact-store";
import { TableModel } from "./yua-table-model";
export type DataTransformPayload = {
  sourceToolRunId: string;
  operations: TransformOperation[];
  outputFormat?: "CSV" | "JSON";
};

export type TransformOperation =
  | { type: "SELECT_COLUMNS"; columns: string[] }
  | { type: "RENAME_COLUMN"; from: string; to: string }
  | { type: "FILTER"; column: string; op: ">" | "<" | "=" | "contains"; value: any }
  | { type: "DEDUPLICATE"; by: string[] }
  | { type: "FILL_NULL"; column: string; value: any }
  | { type: "DROP_NULL"; column: string }
  | { type: "JOIN"; otherToolRunId: string; on: string };


export type TransformDiff = {
  rowBefore: number;
  rowAfter: number;
  colBefore: number;
  colAfter: number;
  removedColumns?: string[];
  addedColumns?: string[];
  filteredRows?: number;
  duplicatesRemoved?: number;
  joinedRows?: number;
};

export type DataTransformOutput = {
  artifactRef: string;
  diff: TransformDiff;
  transformLog: Array<{ op: TransformOperation; note: string }>;
};

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function stableStringify(v: any): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",")}}`;
}

function rowsToCsv(columns: string[], rows: Record<string, any>[]): string {
  const esc = (s: string) => {
    const t = s ?? "";
    if (/[,"\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  const header = columns.map(esc).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(String(r[c] ?? ""))).join(","))
    .join("\n");
  return header + (body ? "\n" + body : "");
}

function parseCsv(text: string): TableModel {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) {
    return {
      id: "parsed",
      columns: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      sourceHash: "",
      provenance: {
        sourceToolRunId: "unknown",
      },
    };
  }

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (!inQuotes && ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };

  const cols = parseLine(lines[0]).map((s) => s.trim());
  const rows: Record<string, any>[] = [];

  for (const line of lines.slice(1)) {
    const vals = parseLine(line);
    const r: Record<string, any> = {};
    cols.forEach((c, i) => (r[c] = vals[i] ?? ""));
    rows.push(r);
  }

return {
  id: "parsed",
  columns: cols,
  rows,
  rowCount: rows.length,
  columnCount: cols.length,
  sourceHash: "",
  provenance: {
    sourceToolRunId: "unknown",
  },
};
}

function parseJson(text: string): TableModel {
  const data = JSON.parse(text);
  // array-of-objects
  if (Array.isArray(data) && data.length && typeof data[0] === "object" && !Array.isArray(data[0])) {
    const keys = new Set<string>();
    data.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    const columns = Array.from(keys);
return {
  id: "parsed",
  columns,
  rows: data as any[],
  rowCount: (data as any[]).length,
  columnCount: columns.length,
  sourceHash: "",
  provenance: {
    sourceToolRunId: "unknown",
  },
};
  }
  // {rows:[...], gridMeta?...}
  if (data && typeof data === "object" && Array.isArray((data as any).rows)) {
    const rows = (data as any).rows as any[];
    // array-of-array → column names col_1...
    if (Array.isArray(rows[0])) {
      const cols = rows[0].length;
      const columns = Array.from({ length: cols }, (_, i) => `col_${i + 1}`);
      const outRows = rows.map((arr: any[]) => {
        const r: Record<string, any> = {};
        columns.forEach((c, i) => (r[c] = arr[i] ?? ""));
        return r;
      });
return {
  id: "parsed",
  columns,
  rows: outRows,
  rowCount: outRows.length,
  columnCount: columns.length,
  sourceHash: "",
  provenance: {
    sourceToolRunId: "unknown",
  },
};
    }
  }
  // array-of-array
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const cols = (data[0] as any[]).length;
    const columns = Array.from({ length: cols }, (_, i) => `col_${i + 1}`);
    const outRows = (data as any[]).map((arr: any[]) => {
      const r: Record<string, any> = {};
      columns.forEach((c, i) => (r[c] = arr[i] ?? ""));
      return r;
    });
return {
  id: "parsed",
  columns,
  rows: outRows,
  rowCount: outRows.length,
  columnCount: columns.length,
  sourceHash: "",
  provenance: {
    sourceToolRunId: "unknown",
  },
};
  }

  // fallback
return {
  id: "parsed",
  columns: [],
  rows: [],
  rowCount: 0,
  columnCount: 0,
  sourceHash: "",
  provenance: {
    sourceToolRunId: "unknown",
  },
};
}

async function loadLatestArtifact(toolRunId: string): Promise<{ uri: string; artifactType: string; bytesHash: string }> {
  const r = await pgPool.query<{
    uri: string;
    artifact_type: string;
  }>(
    `SELECT uri, artifact_type
     FROM tool_artifacts
     WHERE tool_run_id = $1
     ORDER BY created_at DESC NULLS LAST, uri DESC
     LIMIT 1`,
    [toolRunId]
  );

  const row = r.rows[0];
  if (!row?.uri) throw new Error(`No artifact found for toolRunId=${toolRunId}`);

  const buf = await fs.promises.readFile(row.uri);
  return { uri: row.uri, artifactType: row.artifact_type, bytesHash: sha256Hex(buf) };
}

export async function computeDataTransformInputsHash(payload: DataTransformPayload): Promise<{ inputsHash: string }> {
  const src = await loadLatestArtifact(payload.sourceToolRunId);

  // JOIN이 있으면 other도 포함
  const joins = payload.operations.filter((o) => o.type === "JOIN") as Array<{ type: "JOIN"; otherToolRunId: string; on: string }>;
  const joinHashes: Array<{ otherToolRunId: string; bytesHash: string }> = [];
  for (const j of joins) {
    const other = await loadLatestArtifact(j.otherToolRunId);
    joinHashes.push({ otherToolRunId: j.otherToolRunId, bytesHash: other.bytesHash });
  }

  const inputsHash = sha256Hex(
    stableStringify({
      task: "DATA_TRANSFORM",
      payload,
      source: { toolRunId: payload.sourceToolRunId, bytesHash: src.bytesHash },
      joins: joinHashes,
    })
  );

  return { inputsHash };
}

function applyOps(model: TableModel, ops: TransformOperation[]) {
  const log: Array<{ op: TransformOperation; note: string }> = [];
  const diff: TransformDiff = {
    rowBefore: model.rows.length,
    rowAfter: model.rows.length,
    colBefore: model.columns.length,
    colAfter: model.columns.length,
  };

  let filteredRows = 0;
  let dupRemoved = 0;
  let joinedRows = 0;

  const ensureCol = (c: string) => {
    if (!model.columns.includes(c)) throw new Error(`Column not found: ${c}`);
  };

  for (const op of ops) {
    if (op.type === "SELECT_COLUMNS") {
      const keep = op.columns;
      model.columns.forEach((c) => {
        if (!keep.includes(c)) {
          // removed columns
        }
      });
      const removed = model.columns.filter((c) => !keep.includes(c));
      model.columns = model.columns.filter((c) => keep.includes(c));
      model.rows = model.rows.map((r) => {
        const out: Record<string, any> = {};
        model.columns.forEach((c) => (out[c] = r[c]));
        return out;
      });
      diff.removedColumns = [...new Set([...(diff.removedColumns ?? []), ...removed])];
      log.push({ op, note: `selected ${model.columns.length} columns (removed ${removed.length})` });
    }

    if (op.type === "RENAME_COLUMN") {
      ensureCol(op.from);
      const exists = model.columns.includes(op.to);
      if (exists && op.to !== op.from) throw new Error(`Rename target exists: ${op.to}`);
      model.columns = model.columns.map((c) => (c === op.from ? op.to : c));
      model.rows = model.rows.map((r) => {
        if (!(op.from in r)) return r;
        const { [op.from]: v, ...rest } = r;
        return { ...rest, [op.to]: v };
      });
      log.push({ op, note: `renamed ${op.from} -> ${op.to}` });
    }

    if (op.type === "FILTER") {
      ensureCol(op.column);
      const before = model.rows.length;
      const val = op.value;

      const keep = (row: Record<string, any>) => {
        const v = row[op.column];
        if (op.op === "contains") return String(v ?? "").includes(String(val ?? ""));
        const n1 = Number(v);
        const n2 = Number(val);
        if (op.op === "=") return String(v ?? "") === String(val ?? "");
        if (!Number.isFinite(n1) || !Number.isFinite(n2)) return false;
        if (op.op === ">") return n1 > n2;
        if (op.op === "<") return n1 < n2;
        return false;
      };

      model.rows = model.rows.filter(keep);
      const after = model.rows.length;
      filteredRows += before - after;
      log.push({ op, note: `filtered rows: -${before - after} (now ${after})` });
    }

    if (op.type === "DEDUPLICATE") {
      op.by.forEach(ensureCol);
      const before = model.rows.length;
      const seen = new Set<string>();
      const out: Record<string, any>[] = [];
      for (const r of model.rows) {
        const key = op.by.map((c) => String(r[c] ?? "")).join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
      model.rows = out;
      const after = model.rows.length;
      dupRemoved += before - after;
      log.push({ op, note: `dedup removed ${before - after} rows (now ${after})` });
    }

    if (op.type === "FILL_NULL") {
      ensureCol(op.column);
      let changed = 0;
      model.rows = model.rows.map((r) => {
        const v = r[op.column];
        const empty = v === null || v === undefined || String(v).trim() === "";
        if (!empty) return r;
        changed++;
        return { ...r, [op.column]: op.value };
      });
      log.push({ op, note: `filled ${changed} null/empty cells in ${op.column}` });
    }

    if (op.type === "DROP_NULL") {
      ensureCol(op.column);
      const before = model.rows.length;
      model.rows = model.rows.filter((r) => {
        const v = r[op.column];
        const empty = v === null || v === undefined || String(v).trim() === "";
        return !empty;
      });
      const after = model.rows.length;
      filteredRows += before - after;
      log.push({ op, note: `dropped ${before - after} rows where ${op.column} is null/empty` });
    }

    if (op.type === "JOIN") {
      // 실제 조인은 runDataTransform 내부에서 other 모델 넣어줘야 해서 여기서는 placeholder
      throw new Error("JOIN op must be expanded with other table inside runDataTransform (handled there).");
    }

    diff.rowAfter = model.rows.length;
    diff.colAfter = model.columns.length;
  }

  diff.filteredRows = filteredRows || undefined;
  diff.duplicatesRemoved = dupRemoved || undefined;
  diff.joinedRows = joinedRows || undefined;
model.rowCount = model.rows.length;
model.columnCount = model.columns.length;

  return { model, diff, log };
}

function joinOn(model: TableModel, other: TableModel, on: string) {
  if (!model.columns.includes(on)) throw new Error(`JOIN key missing in left: ${on}`);
  if (!other.columns.includes(on)) throw new Error(`JOIN key missing in right: ${on}`);

  const rightCols = other.columns.filter((c) => c !== on);
  const renamedRightCols = rightCols.map((c) => (model.columns.includes(c) ? `${c}_right` : c));

  const index = new Map<string, Record<string, any>>();
  for (const r of other.rows) {
    index.set(String(r[on] ?? ""), r);
  }

  const newCols = [...model.columns, ...renamedRightCols];
  const outRows = model.rows.map((r) => {
    const key = String(r[on] ?? "");
    const rr = index.get(key);
    if (!rr) {
      const pad: Record<string, any> = {};
      renamedRightCols.forEach((c) => (pad[c] = ""));
      return { ...r, ...pad };
    }
    const add: Record<string, any> = {};
    rightCols.forEach((c, i) => (add[renamedRightCols[i]] = rr[c]));
    return { ...r, ...add };
  });

return {
  id: model.id,
  columns: newCols,
  rows: outRows,
  rowCount: outRows.length,
  columnCount: newCols.length,
  sourceHash: model.sourceHash,
  provenance: model.provenance,
};
}

export async function runDataTransform(
  toolRunId: string,
  payload: DataTransformPayload
): Promise<{
  output: DataTransformOutput;
  inputsHash: string;
  artifactUris: string[];
  sources?: Array<{ kind: "FILE" | "DB" | "WEB" | "API" | "MEMORY"; ref: string }>;
  metrics?: { rows?: number; cols?: number };
  warnings?: string[];
}> {
  const warnings: string[] = [];
  const artifactUris: string[] = [];

  const { inputsHash } = await computeDataTransformInputsHash(payload);

  const src = await loadLatestArtifact(payload.sourceToolRunId);
  const srcText = await fs.promises.readFile(src.uri, "utf8");

  let model: TableModel;
  if ((src.artifactType || "").toUpperCase() === "CSV") model = parseCsv(srcText);
  else model = parseJson(srcText);

// 🔒 SSOT: provenance 확정
model.id = payload.sourceToolRunId;
model.sourceHash = src.bytesHash;
model.rowCount = model.rows.length;
model.columnCount = model.columns.length;
model.provenance = {
  sourceToolRunId: payload.sourceToolRunId,
  sourceArtifactUri: src.uri,
  extractedFrom:
    src.artifactType?.toUpperCase() === "CSV"
      ? "CSV"
      : "JSON",
};

  // JOIN 먼저 처리 (순서 보장)
  const ops = [...payload.operations];
  const joinOps = ops.filter((o) => o.type === "JOIN") as Array<{ type: "JOIN"; otherToolRunId: string; on: string }>;
  const nonJoinOps = ops.filter((o) => o.type !== "JOIN");

  const transformLog: Array<{ op: TransformOperation; note: string }> = [];
  const diff: TransformDiff = {
    rowBefore: model.rows.length,
    rowAfter: model.rows.length,
    colBefore: model.columns.length,
    colAfter: model.columns.length,
  };

  for (const j of joinOps) {
    const otherA = await loadLatestArtifact(j.otherToolRunId);
    const otherText = await fs.promises.readFile(otherA.uri, "utf8");
    const otherModel =
      (otherA.artifactType || "").toUpperCase() === "CSV" ? parseCsv(otherText) : parseJson(otherText);

    const beforeCols = model.columns.length;
    model = joinOn(model, otherModel, j.on);
    diff.colAfter = model.columns.length;
    diff.joinedRows = model.rows.length;
    transformLog.push({ op: j, note: `joined otherToolRunId=${j.otherToolRunId} on=${j.on} (+${model.columns.length - beforeCols} cols)` });
  }

  const { model: afterOps, diff: d2, log } = applyOps(model, nonJoinOps);
  transformLog.push(...log);

  // diff merge
  diff.rowAfter = afterOps.rows.length;
  diff.colAfter = afterOps.columns.length;
  diff.removedColumns = d2.removedColumns;
// 🔒 addedColumns 자동 계산
const beforeCols = new Set(model.columns);
const afterCols = new Set(afterOps.columns);
diff.addedColumns = [...afterCols].filter((c) => !beforeCols.has(c));
  diff.filteredRows = d2.filteredRows;
  diff.duplicatesRemoved = d2.duplicatesRemoved;

  // write transformed artifact
  const outputFormat = payload.outputFormat ?? "CSV";
  let artifactRef = "";

  if (outputFormat === "CSV") {
    const csv = rowsToCsv(afterOps.columns, afterOps.rows);
    const a = await saveToolArtifact({ toolRunId, artifactType: "CSV", name: "data", content: csv });
    artifactUris.push(a.uri);
    artifactRef = a.uri;
  } else {
    const json = JSON.stringify({ columns: afterOps.columns, rows: afterOps.rows }, null, 2);
    const a = await saveToolArtifact({ toolRunId, artifactType: "JSON", name: "data", content: json });
    artifactUris.push(a.uri);
    artifactRef = a.uri;
  }

  // save diff + log as JSON artifacts
  const diffA = await saveToolArtifact({
    toolRunId,
    artifactType: "JSON",
    name: "diff",
    content: JSON.stringify(diff, null, 2),
  });
  artifactUris.push(diffA.uri);

  const logA = await saveToolArtifact({
    toolRunId,
    artifactType: "JSON",
    name: "log",
    content: JSON.stringify(transformLog, null, 2),
  });
  artifactUris.push(logA.uri);

  const output: DataTransformOutput = { artifactRef, diff, transformLog };

  return {
    inputsHash,
    artifactUris,
    output,
    sources: [
      { kind: "MEMORY", ref: payload.sourceToolRunId },
      { kind: "FILE", ref: src.uri },
    ],
    metrics: { rows: afterOps.rows.length, cols: afterOps.columns.length },
    warnings: warnings.length ? warnings : undefined,
  };
}

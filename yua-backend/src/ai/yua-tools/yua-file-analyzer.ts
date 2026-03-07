import { createHash } from "crypto";
import fs from "fs";
import path from "path";

type FileType = "csv" | "xlsx" | "json" | "txt" | "unknown";

export type FileAnalysisPayload = {
  // 최소 요구: 파일 경로 기반 (fileId 해석은 프로젝트마다 다르니 일단 path로 고정)
  filePaths: string[];

  profile?: "QUICK" | "NORMAL" | "AUDIT";
  goals?: Array<"summary" | "types" | "stats" | "outliers" | "trend">;

  maxRowsSample?: number; // default 5000
  maxBytes?: number; // default 50MB
};

export type FileAnalysisOutput = {
  files: Array<{
    filePath: string;
    type: "csv" | "xlsx" | "json" | "txt" | "unknown";
    sha256?: string;
    schema?: {
      columns: Array<{
        name: string;
        dtype: string;
        nullRate: number;
        example: string;
      }>;
    };
    stats?: {
      rowCount?: number;
      totalRowCount?: number;
      colCount?: number;
      numeric?: Record<
        string,
        { mean: number; p50: number; p95: number; min: number; max: number }
      >;
    };
    sampleRows?: Record<string, any>[];
    sheetInfo?: Array<{ name: string; rowCount: number; colCount: number }>;
    anomalies?: {
      outliers?: Array<{
        column: string;
        rule: string;
        examples: any[];
      }>;
    };
    trend?: {
      timeColumn?: string;
      headline?: string;
      points?: Array<{ t: string; value: number }>;
    };
    notes?: string[];
  }>;
};

function stableStringify(v: any): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",")}}`;
}

function detectFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv" || ext === ".tsv") return "csv";
  if (ext === ".xlsx" || ext === ".xls") return "xlsx";
  if (ext === ".json") return "json";
  if (ext === ".txt" || ext === ".md" || ext === ".log") return "txt";
  return "unknown";
}

function ensureAllowedPath(p: string) {
  const roots = (process.env.YUA_ALLOWED_FILE_ROOTS ?? "/mnt,/tmp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const resolved = path.resolve(p);
  const ok = roots.some((r) => resolved.startsWith(path.resolve(r) + path.sep) || resolved === path.resolve(r));
  if (!ok) {
    throw new Error(
      `Disallowed file path. Set YUA_ALLOWED_FILE_ROOTS to include it. path=${resolved}`
    );
  }
}

async function hashFileSha256(filePath: string, maxBytes: number): Promise<{ sha256: string; truncated: boolean }> {
  const st = await fs.promises.stat(filePath);
  const size = st.size;

  const h = createHash("sha256");
  const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });

  let read = 0;
  let truncated = false;

  await new Promise<void>((resolve, reject) => {
 stream.on("data", (chunk) => {
   const buf: Buffer =
     typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as any);
      if (truncated) return;
      read += buf.length;
      if (read <= maxBytes) {
        h.update(buf);
      } else {
        // 초과하면 해시를 완전 재현할 수 없으니: size+prefix only 전략으로 고정
        truncated = true;
     const remaining = Math.max(0, maxBytes - (read - buf.length));
     if (remaining > 0) {
       const slice = buf.subarray(0, remaining);
       h.update(slice);
     }
        h.update(Buffer.from(`|TRUNCATED|SIZE=${size}`));
        stream.destroy();
      }
    });
    stream.on("error", reject);
    stream.on("close", () => resolve());
    stream.on("end", () => resolve());
  });

  return { sha256: h.digest("hex"), truncated };
}

// CSV 파서(따옴표/콤마 기본 지원)
function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function pickDelimiter(headerLine: string): string {
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const c = headerLine.split(d).length - 1;
    if (c > bestCount) {
      bestCount = c;
      best = d;
    }
  }
  return best;
}

function resolveLocalPath(p: string): string {
  // Strip query string (e.g. ?token=...&exp=...) before resolving
  const clean = p.split("?")[0];

  // 이미 절대 로컬 경로면 그대로 사용
  if (clean.startsWith("/mnt/") || clean.startsWith("/tmp/")) {
    return clean;
  }

  // 업로드 API 경로 → 로컬 파일 시스템 경로 변환
  if (clean.startsWith("/api/assets/uploads/")) {
    return clean.replace(
      "/api/assets/uploads/",
      "/mnt/yua/assets/uploads/"
    );
  }

  // 그 외는 그대로 반환 (ensureAllowedPath에서 차단됨)
  return clean;
}

function inferDtype(values: string[]): string {
  const nonEmpty = values.map((v) => v.trim()).filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return "empty";

  const isBool = nonEmpty.every((v) => /^(true|false|0|1)$/i.test(v));
  if (isBool) return "boolean";

  const isInt = nonEmpty.every((v) => /^-?\d+$/.test(v));
  if (isInt) return "int";

  const isFloat = nonEmpty.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (isFloat) return "float";

  const isDate = nonEmpty.every((v) => {
    const t = Date.parse(v);
    return Number.isFinite(t);
  });
  if (isDate) return "date";

  return "string";
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function numericStats(nums: number[]) {
  const clean = nums.filter((n) => Number.isFinite(n));
  clean.sort((a, b) => a - b);
  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = clean.length ? sum / clean.length : NaN;
  const p50 = quantile(clean, 0.5);
  const p95 = quantile(clean, 0.95);
  const min = clean[0] ?? NaN;
  const max = clean[clean.length - 1] ?? NaN;
  return { mean, p50, p95, min, max, sorted: clean };
}

function findOutliersIqr(nums: number[]) {
  const s = numericStats(nums).sorted;
  if (s.length < 8) return { rule: "IQR", out: [] as number[] };

  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const out = s.filter((x) => x < lo || x > hi);
  return { rule: `IQR(lo=${lo.toFixed(3)},hi=${hi.toFixed(3)})`, out };
}

type GoalSet = Set<string>;
const ALL_GOALS: GoalSet = new Set(["summary", "types", "stats", "outliers", "trend"]);

function resolveGoals(payload: FileAnalysisPayload): GoalSet {
  if (!payload.goals?.length) return ALL_GOALS;
  return new Set(payload.goals);
}

function wantGoal(goals: GoalSet, goal: string): boolean {
  return goals.has(goal);
}

const MAX_SAMPLE_ROWS = 20;

/** Shared tabular analysis: schema, stats, sampleRows, anomalies, trend */
function analyzeTabularData(
  header: string[],
  rows: string[][],
  totalRowCount: number,
  goals: GoalSet,
) {
  const colCount = header.length;
  const colValues: string[][] = Array.from({ length: colCount }, () => []);

  for (const r of rows) {
    for (let c = 0; c < colCount; c++) {
      colValues[c].push((r[c] ?? "").toString());
    }
  }

  const columns = header.map((name, idx) => {
    const vals = colValues[idx];
    const dtype = inferDtype(vals);
    const nonEmpty = vals.map((v) => v.trim()).filter((v) => v.length > 0);
    const nullRate = vals.length ? 1 - nonEmpty.length / vals.length : 0;
    const example = nonEmpty[0] ?? "";
    return { name: name || `col_${idx + 1}`, dtype, nullRate, example };
  });

  // sampleRows: first MAX_SAMPLE_ROWS rows as Record<string, any>
  const sampleRows: Record<string, any>[] = [];
  const sampleLimit = Math.min(rows.length, MAX_SAMPLE_ROWS);
  for (let i = 0; i < sampleLimit; i++) {
    const row: Record<string, any> = {};
    for (let c = 0; c < colCount; c++) {
      const val = (rows[i][c] ?? "").toString();
      const col = columns[c];
      const key = col.name;
      if (col.dtype === "int") row[key] = val ? parseInt(val, 10) : null;
      else if (col.dtype === "float") row[key] = val ? parseFloat(val) : null;
      else row[key] = val || null;
    }
    sampleRows.push(row);
  }

  const result: any = {
    schema: { columns },
    stats: {
      rowCount: rows.length,
      totalRowCount,
      colCount,
    },
    sampleRows,
  };

  if (wantGoal(goals, "stats")) {
    const numeric: Record<string, any> = {};
    columns.forEach((c, idx) => {
      if (c.dtype === "int" || c.dtype === "float") {
        const nums = colValues[idx]
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        const st = numericStats(nums);
        numeric[c.name] = { mean: st.mean, p50: st.p50, p95: st.p95, min: st.min, max: st.max };
      }
    });
    if (Object.keys(numeric).length) result.stats.numeric = numeric;
  }

  if (wantGoal(goals, "outliers")) {
    const outliers: Array<{ column: string; rule: string; examples: any[] }> = [];
    columns.forEach((c, idx) => {
      if (c.dtype === "int" || c.dtype === "float") {
        const nums = colValues[idx]
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        const o = findOutliersIqr(nums);
        if (o.out.length) {
          outliers.push({ column: c.name, rule: o.rule, examples: o.out.slice(0, 5) });
        }
      }
    });
    if (outliers.length) result.anomalies = { outliers };
  }

  if (wantGoal(goals, "trend")) {
    const dateCols = columns.map((c, i) => ({ ...c, idx: i })).filter((c) => c.dtype === "date");
    const numCols = columns.map((c, i) => ({ ...c, idx: i })).filter((c) => c.dtype === "int" || c.dtype === "float");

    if (dateCols.length && numCols.length) {
      const tcol = dateCols[0];
      const vcol = numCols[0];
      const buckets = new Map<string, number>();
      for (const r of rows) {
        const tRaw = (r[tcol.idx] ?? "").toString();
        const vRaw = (r[vcol.idx] ?? "").toString();
        const t = Date.parse(tRaw);
        const v = Number(vRaw);
        if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
        const day = new Date(t);
        day.setHours(0, 0, 0, 0);
        const key = day.toISOString().slice(0, 10);
        buckets.set(key, (buckets.get(key) ?? 0) + v);
      }
      const points = Array.from(buckets.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([t, value]) => ({ t, value }));
      if (points.length) {
        result.trend = {
          timeColumn: tcol.name,
          headline: `${tcol.name} 기준 ${vcol.name} 합계 트렌드`,
          points: points.slice(-90),
        };
      }
    }
  }

  return result;
}

async function analyzeCsv(filePath: string, payload: FileAnalysisPayload) {
  const maxRows = payload.maxRowsSample ?? 5000;
  const goals = resolveGoals(payload);

  const text = await fs.promises.readFile(filePath, "utf8");
  const allLines = text.split(/\r?\n/).filter((l) => l.length > 0);

  if (allLines.length === 0) {
    return { notes: ["empty file"] };
  }

  const delimiter = pickDelimiter(allLines[0]);
  const header = parseCsvLine(allLines[0], delimiter).map((s) => s.trim());
  const totalRowCount = allLines.length - 1; // exclude header
  const rows = allLines.slice(1, 1 + maxRows).map((l) => parseCsvLine(l, delimiter));

  return analyzeTabularData(header, rows, totalRowCount, goals);
}

async function analyzeJson(filePath: string, payload: FileAnalysisPayload) {
  const maxRows = payload.maxRowsSample ?? 5000;
  const goals = resolveGoals(payload);
  const raw = await fs.promises.readFile(filePath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    return { notes: ["JSON root is not an array; treated as document"] };
  }

  const totalRowCount = data.length;
  const dataRows = data.slice(0, maxRows);
  const keys = new Set<string>();
  dataRows.forEach((r: any) => {
    if (r && typeof r === "object" && !Array.isArray(r)) {
      Object.keys(r).forEach((k) => keys.add(k));
    }
  });

  const header = Array.from(keys);

  // Convert object rows to string[][] for shared helper
  const rows: string[][] = dataRows.map((r: any) => {
    return header.map((k) => {
      const v = (r && typeof r === "object" && !Array.isArray(r)) ? (r as any)[k] : undefined;
      return v === null || v === undefined ? "" : String(v);
    });
  });

  return analyzeTabularData(header, rows, totalRowCount, goals);
}

async function analyzeTxt(filePath: string) {
  const raw = await fs.promises.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const chars = raw.length;
  const nonEmpty = lines.filter((l) => l.trim().length > 0).length;

  return {
    notes: [
      `lines=${lines.length} (nonEmpty=${nonEmpty})`,
      `chars=${chars}`,
      `preview=${raw.slice(0, 160).replace(/\s+/g, " ")}`,
    ],
  };
}

// XLSX: multi-sheet, merged cell handling, no temp file
async function analyzeXlsx(filePath: string, payload: FileAnalysisPayload) {
  let XLSX: any;
  try {
    const mod: any = await import("xlsx");
    XLSX = mod.default ?? mod;
  } catch {
    throw new Error("Missing dependency: xlsx. Install with: pnpm add xlsx");
  }

  const maxRows = payload.maxRowsSample ?? 5000;
  const goals = resolveGoals(payload);
  const data = await fs.promises.readFile(filePath);
  const wb = XLSX.read(data, { type: "buffer", cellDates: true });

  const sheetNames: string[] = wb.SheetNames || [];
  if (!sheetNames.length) return { notes: ["xlsx has no sheets"] };

  const sheetInfo: Array<{ name: string; rowCount: number; colCount: number }> = [];
  const notes: string[] = [];

  // Analyze all sheets, combine results from the primary (first) sheet
  let primaryResult: any = null;

  for (let si = 0; si < sheetNames.length; si++) {
    const sheetName = sheetNames[si];
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    // Handle merged cells: fill merged regions with the top-left value
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = ws["!merges"] || [];
    for (const merge of merges) {
      const topLeftRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const topLeftCell = ws[topLeftRef];
      const fillValue = topLeftCell?.v ?? topLeftCell?.w ?? "";
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { v: fillValue, t: "s", w: String(fillValue) };
        }
      }
    }

    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
    const totalRowCount = json.length;

    // Collect sheet info
    const keys = new Set<string>();
    json.forEach((r: any) => { if (r && typeof r === "object") Object.keys(r).forEach((k) => keys.add(k)); });
    sheetInfo.push({ name: sheetName, rowCount: totalRowCount, colCount: keys.size });

    if (merges.length > 0) {
      notes.push(`Sheet "${sheetName}": ${merges.length} merged cell region(s) expanded`);
    }

    // Only full-analyze primary sheet (or all sheets if < 4)
    if (si > 0 && sheetNames.length >= 4) continue;

    const header = Array.from(keys);
    const sampledJson = json.slice(0, maxRows);
    const rows: string[][] = sampledJson.map((r: any) =>
      header.map((k) => {
        const v = r?.[k];
        return v === null || v === undefined ? "" : String(v);
      })
    );

    const sheetResult = analyzeTabularData(header, rows, totalRowCount, goals);

    if (si === 0) {
      primaryResult = sheetResult;
    } else {
      // Append extra sheet sample rows with sheet name prefix
      if (sheetResult.sampleRows?.length) {
        notes.push(`Sheet "${sheetName}": ${totalRowCount} rows, ${header.length} cols (sample included)`);
      }
    }
  }

  if (!primaryResult) {
    return { notes: ["xlsx: no analyzable sheets found"] };
  }

  primaryResult.sheetInfo = sheetInfo;
  if (notes.length) primaryResult.notes = [...(primaryResult.notes ?? []), ...notes];
  return primaryResult;
}

// 🔹 FILE_ANALYSIS 전용: 해시만 계산 (분석 없음)
export async function computeFileInputsHash(
  payload: FileAnalysisPayload
): Promise<{
  inputsHash: string;
  fileHashes: Array<{ path: string; sha256: string; truncated: boolean }>;
}> {
  const maxBytes = payload.maxBytes ?? 50 * 1024 * 1024;

  if (!payload.filePaths?.length) {
    throw new Error("FILE_ANALYSIS requires payload.filePaths[]");
  }

  const fileHashes: Array<{
    path: string;
    sha256: string;
    truncated: boolean;
  }> = [];

  for (const p of payload.filePaths) {
    const localPath = resolveLocalPath(p);
    ensureAllowedPath(localPath);
    const { sha256, truncated } = await hashFileSha256(localPath, maxBytes);
    fileHashes.push({ path: localPath, sha256, truncated });
  }

  const inputsHash = createHash("sha256")
    .update(
      stableStringify({
        task: "FILE_ANALYSIS",
        payload,
        fileHashes,
      })
    )
    .digest("hex");

  return { inputsHash, fileHashes };
}

export async function runFileAnalysis(payload: FileAnalysisPayload): Promise<{
  output: FileAnalysisOutput;
  inputsHash: string;
  sources: Array<{ kind: "FILE"; ref: string }>;
  metrics: { rows?: number; cols?: number; files: number };
  warnings: string[];
}> {
  const warnings: string[] = [];
  const maxBytes = payload.maxBytes ?? 50 * 1024 * 1024;

  if (!payload.filePaths?.length) {
    throw new Error("FILE_ANALYSIS requires payload.filePaths[]");
  }

  const files = [];
  let totalRows = 0;
  let totalCols = 0;

  // inputsHash = stable(payload) + each file sha256 (SSOT)
  const fileHashes: Array<{ path: string; sha256: string; truncated: boolean }> = [];

  for (const p of payload.filePaths) {
    const localPath = resolveLocalPath(p);
    ensureAllowedPath(localPath);
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }

    const { sha256, truncated } = await hashFileSha256(localPath, maxBytes);
    fileHashes.push({ path: localPath, sha256, truncated });
    if (truncated) warnings.push(`hash truncated (maxBytes=${maxBytes}): ${p}`);
  }

  const inputsHash = createHash("sha256")
    .update(stableStringify({ task: "FILE_ANALYSIS", payload, fileHashes }))
    .digest("hex");

  for (const f of fileHashes) {
    const type = detectFileType(f.path);
    const notes: string[] = [];

    let analysis: any = {};
    if (type === "csv") analysis = await analyzeCsv(f.path, payload);
    else if (type === "json") analysis = await analyzeJson(f.path, payload);
    else if (type === "txt") analysis = await analyzeTxt(f.path);
    else if (type === "xlsx") {
      try {
        analysis = await analyzeXlsx(f.path, payload);
      } catch (e: any) {
        notes.push(`xlsx dependency missing or parse error: ${e?.message ?? String(e)}`);
        analysis = { notes };
      }
    } else {
      notes.push("unknown file type; skipped");
      analysis = { notes };
    }

    const rowCount = analysis?.stats?.rowCount;
    const colCount = analysis?.stats?.colCount;
    if (typeof rowCount === "number") totalRows += rowCount;
    if (typeof colCount === "number") totalCols += colCount;

    files.push({
      filePath: f.path,
      type,
      sha256: f.sha256,
      ...analysis,
      notes: [...(analysis?.notes ?? []), ...(notes.length ? notes : [])],
    });
  }

  return {
    output: { files },
    inputsHash,
    sources: payload.filePaths.map((p) => ({ kind: "FILE" as const, ref: p })),
    metrics: {
      rows: totalRows || undefined,
      cols: totalCols || undefined,
      files: payload.filePaths.length,
    },
    warnings,
  };
}

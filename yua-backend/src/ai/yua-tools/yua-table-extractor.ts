import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { saveToolArtifact } from "./yua-artifact-store";
import sharp from "sharp";
import { runOcr } from "../vision/tools/ocr";

type FileType = "pdf";

export type TableExtractionPayload = {
  filePath: string;
  pages?: number[];      // 1-based
  maxTables?: number;    // default 5
  outputFormat?: "CSV" | "JSON";
  dpi?: number;          // default 300
  maxBytes?: number;     // default 50MB (hashing)
};

export type TableExtractionOutput = {
  tables: Array<{
    page: number;
    rows: number;
    cols: number;
    confidence: number;
    artifactRef: string;
    gridMeta?: {
      width: number;
      height: number;
      horizontalLines: number[];
      verticalLines: number[];
      rowVariance: number;
      colVariance: number;
      emptyRate: number;
      votes?: { maxV: number; maxH: number };
    };
  }>;
};

function now() {
  return Date.now();
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function stableStringify(v: any): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",")}}`;
}

function ensureAllowedPath(p: string) {
  const roots = (process.env.YUA_ALLOWED_FILE_ROOTS ?? "/mnt,/tmp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const resolved = path.resolve(p);
  const ok = roots.some((r) => {
    const rr = path.resolve(r);
    return resolved === rr || resolved.startsWith(rr + path.sep);
  });

  if (!ok) {
    throw new Error(`Disallowed file path. Set YUA_ALLOWED_FILE_ROOTS. path=${resolved}`);
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
      const buf: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);
      if (truncated) return;

      read += buf.length;
      if (read <= maxBytes) {
        h.update(buf);
      } else {
        truncated = true;
        const remaining = Math.max(0, maxBytes - (read - buf.length));
        if (remaining > 0) h.update(buf.subarray(0, remaining));
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

/**
 * ✅ TABLE_EXTRACTION inputsHash = stable(payload without dpi/maxTables ordering ok) + fileHash
 */
export async function computeTableInputsHash(payload: TableExtractionPayload): Promise<{
  inputsHash: string;
  fileHash: string;
  truncated: boolean;
}> {
  if (!payload.filePath) throw new Error("TABLE_EXTRACTION requires payload.filePath");
  ensureAllowedPath(payload.filePath);

  const maxBytes = payload.maxBytes ?? 50 * 1024 * 1024;
  const { sha256: fileHash, truncated } = await hashFileSha256(payload.filePath, maxBytes);

  const inputsHash = sha256Hex(
    stableStringify({
      task: "TABLE_EXTRACTION",
      payload: {
        ...payload,
        // 캐시에 영향 없는 기본값은 normalize 해도 되지만,
        // 지금은 payload 그대로 + fileHash로 충분.
      },
      fileHash,
      truncated,
    })
  );

  return { inputsHash, fileHash, truncated };
}

function computeVariance(arr: number[]): number {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
}

function computeConfidence(meta: {
  rowVariance: number;
  colVariance: number;
  emptyRate: number;
  lineDensityScore: number;
}) {
  const gridRegularityScore = 1 - Math.min(1, (meta.rowVariance + meta.colVariance) / 1200);
  const headerScore = 0.5; // OCR 붙이면 개선
  const numericConsistencyScore = 0.5;

  return (
    0.3 * gridRegularityScore +
    0.2 * headerScore +
    0.2 * numericConsistencyScore +
    0.2 * (1 - meta.emptyRate) +
    0.1 * meta.lineDensityScore
  );
}

function execFileAsync(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} failed: ${err.message}\n${stderr}`));
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function extractCellText(params: {
  fullImagePath: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  toolRunId: string;
  page: number;
  row: number;
  col: number;
}): Promise<string> {
  const { fullImagePath, bbox } = params;

  const width = Math.max(1, bbox.x2 - bbox.x1);
  const height = Math.max(1, bbox.y2 - bbox.y1);

  if (width < 10 || height < 10) {
    return "";
  }

  const cropBuffer = await sharp(fullImagePath)
    .extract({
      left: Math.max(0, bbox.x1),
      top: Math.max(0, bbox.y1),
      width,
      height,
    })
    .png()
    .toBuffer();

 const ocr = await runOcr(
   { buffer: cropBuffer, message: "extract table cell text" },
   { lowConfidence: true }
 );

  return ocr?.text?.trim() ?? "";
}

async function rasterizePdfPageToPng(params: {
  pdfPath: string;
  page: number; // 1-based
  outPngPath: string;
  dpi: number;
}) {
  // pdftoppm -f {p} -l {p} -png -r 300 -singlefile input.pdf /tmp/outprefix
  const outPrefix = params.outPngPath.replace(/\.png$/i, "");
  const dir = path.dirname(params.outPngPath);
  await fs.promises.mkdir(dir, { recursive: true });

  await execFileAsync("pdftoppm", [
    "-f", String(params.page),
    "-l", String(params.page),
    "-png",
    "-r", String(params.dpi),
    "-singlefile",
    params.pdfPath,
    outPrefix,
  ]);

  // pdftoppm outputs `${outPrefix}.png`
  const produced = `${outPrefix}.png`;
  if (produced !== params.outPngPath) {
    // normalize name
    await fs.promises.rename(produced, params.outPngPath).catch(() => {});
  }
  if (!fs.existsSync(params.outPngPath)) throw new Error(`Rasterize failed: ${params.outPngPath}`);
}

async function readPngGrayscale(pngPath: string): Promise<{ gray: Uint8Array; width: number; height: number }> {
  // dynamic require (types/deps safety)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PNG } = require("pngjs");

  const buf = await fs.promises.readFile(pngPath);
  const png = PNG.sync.read(buf);

  const { width, height, data } = png; // RGBA
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // luminance
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
  }

  return { gray, width, height };
}

function sobelEdges(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  // compute mean magnitude to set threshold
  let sumMag = 0;
  let cnt = 0;

  const mags = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      let ki = 0;
      for (let yy = -1; yy <= 1; yy++) {
        for (let xx = -1; xx <= 1; xx++) {
          const v = gray[(y + yy) * width + (x + xx)];
          gx += v * gxK[ki];
          gy += v * gyK[ki];
          ki++;
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      mags[y * width + x] = mag;
      sumMag += mag;
      cnt++;
    }
  }

  const mean = cnt ? sumMag / cnt : 0;
  const thr = mean * 2.5;

  for (let i = 0; i < mags.length; i++) {
    out[i] = mags[i] > thr ? 1 : 0;
  }
  return out;
}

function houghLinesLimited(params: {
  edge: Uint8Array;
  width: number;
  height: number;
  orientation: "VERTICAL" | "HORIZONTAL";
  angleDegWindow?: number;  // default 3
  voteThresholdRatio?: number; // default 0.6
}): { rhos: number[]; maxVotes: number } {
  const { edge, width, height } = params;
  const angleWin = params.angleDegWindow ?? 3;
  const thrRatio = params.voteThresholdRatio ?? 0.6;

  // theta selection (limited)
  const thetas: number[] = [];
  if (params.orientation === "VERTICAL") {
    for (let d = -angleWin; d <= angleWin; d++) thetas.push((d * Math.PI) / 180);
  } else {
    const base = Math.PI / 2;
    for (let d = -angleWin; d <= angleWin; d++) thetas.push(base + (d * Math.PI) / 180);
  }

  // accumulator per rho (we collapse theta by summing votes)
  const acc = new Map<number, number>();
  let maxVotes = 0;

  // sample stride to reduce cost (tunable)
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 900)); // ~900px 기준
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (!edge[y * width + x]) continue;

      for (const theta of thetas) {
        const rho = Math.round(x * Math.cos(theta) + y * Math.sin(theta));
        const v = (acc.get(rho) ?? 0) + 1;
        acc.set(rho, v);
        if (v > maxVotes) maxVotes = v;
      }
    }
  }

  if (maxVotes === 0) return { rhos: [], maxVotes: 0 };

  const thr = Math.floor(maxVotes * thrRatio);

  // pick local maxima
  const candidates = Array.from(acc.entries())
    .filter(([, v]) => v >= thr)
    .sort((a, b) => b[1] - a[1]);

  const picked: number[] = [];
  const pickedSet = new Set<number>();
  const minDist = 8;

  for (const [rho] of candidates) {
    if (pickedSet.has(rho)) continue;
    // suppress near rhos
    let ok = true;
    for (const p of picked) {
      if (Math.abs(p - rho) < minDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    picked.push(rho);
    pickedSet.add(rho);
    if (picked.length > 80) break;
  }

  return { rhos: picked.sort((a, b) => a - b), maxVotes };
}

function clusterLines(lines: number[], mergePx = 6): number[] {
  if (!lines.length) return [];
  const out: number[] = [];
  let cluster: number[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const v = lines[i];
    const last = cluster[cluster.length - 1];
    if (Math.abs(v - last) <= mergePx) cluster.push(v);
    else {
      const mean = cluster.reduce((a, b) => a + b, 0) / cluster.length;
      out.push(Math.round(mean));
      cluster = [v];
    }
  }
  const mean = cluster.reduce((a, b) => a + b, 0) / cluster.length;
  out.push(Math.round(mean));
  return out;
}

function estimateEmptyRateByEdges(params: {
  edge: Uint8Array;
  width: number;
  height: number;
  hLines: number[];
  vLines: number[];
}): number {
  const { edge, width, hLines, vLines } = params;
  const rows = Math.max(0, hLines.length - 1);
  const cols = Math.max(0, vLines.length - 1);
  if (!rows || !cols) return 1;

  let empty = 0;
  let total = 0;

  for (let r = 0; r < rows; r++) {
    const y1 = Math.max(0, hLines[r]);
    const y2 = Math.min(params.height - 1, hLines[r + 1]);
    for (let c = 0; c < cols; c++) {
      const x1 = Math.max(0, vLines[c]);
      const x2 = Math.min(params.width - 1, vLines[c + 1]);
      const area = Math.max(1, (x2 - x1) * (y2 - y1));

      let ink = 0;
      // sample inside cell
      const sx = Math.max(1, Math.floor((x2 - x1) / 20));
      const sy = Math.max(1, Math.floor((y2 - y1) / 20));
      for (let y = y1; y < y2; y += sy) {
        for (let x = x1; x < x2; x += sx) {
          ink += edge[y * width + x] ? 1 : 0;
        }
      }
      const samples = Math.floor((x2 - x1) / sx) * Math.floor((y2 - y1) / sy);
      const inkRate = samples ? ink / samples : 0;

      // threshold: very low edge density => empty-ish
      if (inkRate < 0.02) empty++;
      total++;
    }
  }

  return total ? empty / total : 1;
}

function rowsToCsv(rows: string[][]): string {
  const esc = (s: string) => {
    const t = s ?? "";
    if (/[,"\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  return rows.map((r) => r.map((c) => esc(String(c ?? ""))).join(",")).join("\n");
}

/**
 * ✅ 실제 실행: Hough 기반 라인 검출 → grid → (OCR은 나중에)
 */
export async function runTableExtraction(
  toolRunId: string,
  payload: TableExtractionPayload
): Promise<{
  output: TableExtractionOutput;
  inputsHash: string;
  artifactUris: string[];
  warnings?: string[];
}> {
  const warnings: string[] = [];
  const startedAt = now();

  if (!payload.filePath) throw new Error("TABLE_EXTRACTION requires payload.filePath");
  ensureAllowedPath(payload.filePath);
  if (!fs.existsSync(payload.filePath)) throw new Error(`File not found: ${payload.filePath}`);

  const { inputsHash, truncated } = await computeTableInputsHash(payload);
  if (truncated) warnings.push("file hash truncated (maxBytes). cache key includes truncation marker.");

  const dpi = payload.dpi ?? 300;
  const pages = payload.pages?.length ? payload.pages : [1];
  const maxTables = payload.maxTables ?? 5;

  const artifactUris: string[] = [];
  const tables: TableExtractionOutput["tables"] = [];

  for (const page of pages) {
    if (tables.length >= maxTables) break;

    const tmpDir = path.join("/tmp", "yua-table-extract", toolRunId);
    const pngPath = path.join(tmpDir, `page_${page}.png`);

    await rasterizePdfPageToPng({
      pdfPath: payload.filePath,
      page,
      outPngPath: pngPath,
      dpi,
    });

    const { gray, width, height } = await readPngGrayscale(pngPath);
    const edge = sobelEdges(gray, width, height);

    const v = houghLinesLimited({ edge, width, height, orientation: "VERTICAL" });
    const h = houghLinesLimited({ edge, width, height, orientation: "HORIZONTAL" });

    // convert rho to x/y positions (angle 제한형이라 rho≈x or rho≈y)
    let vLines = v.rhos.map((r) => Math.max(0, Math.min(width - 1, r)));
    let hLines = h.rhos.map((r) => Math.max(0, Math.min(height - 1, r)));

    vLines = clusterLines(vLines, 8);
    hLines = clusterLines(hLines, 8);

 function filterSmallGaps(lines: number[], minGap = 12): number[] {
   if (lines.length < 2) return lines;
   const out = [lines[0]];
   for (let i = 1; i < lines.length; i++) {
     if (lines[i] - out[out.length - 1] >= minGap) {
       out.push(lines[i]);
     }
   }
   return out;
 }

 vLines = filterSmallGaps(vLines, 15);
 hLines = filterSmallGaps(hLines, 15);

if (vLines.length > 120 || hLines.length > 120) {
  warnings.push(`page ${page}: excessive grid lines pruned`);
  vLines = vLines.slice(0, 120);
  hLines = hLines.slice(0, 120);
}

 

    // basic sanity: need at least 2 lines each
    if (vLines.length < 2 || hLines.length < 2) {
      warnings.push(`page ${page}: insufficient lines detected (v=${vLines.length}, h=${hLines.length})`);
      const emptyRef = await saveToolArtifact({
        toolRunId,
        artifactType: "JSON",
        name: `table_p${page}_no_grid`,
        content: JSON.stringify({ error: "no_grid", vLines, hLines }, null, 2),
      });
      artifactUris.push(emptyRef.uri);
      tables.push({
        page,
        rows: 0,
        cols: 0,
        confidence: 0.15,
        artifactRef: emptyRef.uri,
        gridMeta: {
          width,
          height,
          horizontalLines: hLines,
          verticalLines: vLines,
          rowVariance: 0,
          colVariance: 0,
          emptyRate: 1,
          votes: { maxV: v.maxVotes, maxH: h.maxVotes },
        },
      });
      continue;
    }

    // grid sizes
    const rowHeights = [];
    for (let i = 0; i < hLines.length - 1; i++) rowHeights.push(hLines[i + 1] - hLines[i]);
    const colWidths = [];
    for (let j = 0; j < vLines.length - 1; j++) colWidths.push(vLines[j + 1] - vLines[j]);

    const rowVariance = computeVariance(rowHeights);
    const colVariance = computeVariance(colWidths);

    // estimate empty rate by edges (OCR 없이도 쓸 수 있음)
    const emptyRate = estimateEmptyRateByEdges({ edge, width, height, hLines, vLines });

    const lineDensityScore = Math.min(1, (vLines.length + hLines.length) / 120);


    const rowsCount = hLines.length - 1;
    const colsCount = vLines.length - 1;

const matrix: string[][] = Array.from({ length: rowsCount }, () =>
   Array.from({ length: colsCount }, () => "")
 );

 const MAX_OCR_CELLS = 400;
 let filledCells = 0;
 const totalCells = rowsCount * colsCount;

 if (totalCells > MAX_OCR_CELLS) {
   warnings.push(`page ${page}: OCR skipped (too many cells: ${totalCells})`);
 } else {
   for (let r = 0; r < rowsCount; r++) {
     for (let c = 0; c < colsCount; c++) {
       const bbox = {
         x1: vLines[c],
         x2: vLines[c + 1],
         y1: hLines[r],
         y2: hLines[r + 1],
       };

       try {
         const text = await extractCellText({
           fullImagePath: pngPath,
           bbox,
           toolRunId,
           page,
           row: r,
           col: c,
         });

         matrix[r][c] = text;

         if (text && text.trim().length > 0) {
           filledCells++;
         }
       } catch {
         matrix[r][c] = "";
       }
     }
   }
 }

 const baseConfidence = computeConfidence({
   rowVariance,
   colVariance,
   emptyRate,
   lineDensityScore,
 });

 let confidence = baseConfidence;

 if (totalCells > 0 && totalCells <= MAX_OCR_CELLS) {
   const ocrFillRate = filledCells / totalCells;
  confidence = Math.min(
    1,
    baseConfidence * 0.6 +
    ocrFillRate * 0.4
  );
 }

 function detectHeaderRow(matrix: string[][]): number {
   if (!matrix.length) return -1;
   const first = matrix[0];
   let textCount = 0;
   let numCount = 0;
   for (const cell of first) {
     if (!cell) continue;
     if (/^\d+(\.\d+)?$/.test(cell.trim())) numCount++;
     else textCount++;
   }
   return textCount > numCount ? 0 : -1;
 }

 const headerRowIndex = detectHeaderRow(matrix);

 function inferColumnTypes(matrix: string[][]): string[] {
   if (!matrix.length) return [];
   const cols = matrix[0].length;
   const types: string[] = [];
   for (let c = 0; c < cols; c++) {
     let numeric = 0;
     let total = 0;
     for (let r = 1; r < matrix.length; r++) {
       const v = matrix[r][c];
       if (!v) continue;
       total++;
       if (/^\d+(\.\d+)?$/.test(v.trim())) numeric++;
     }
     types.push(total && numeric / total > 0.8 ? "numeric" : "text");
   }
   return types;
 }

 const columnTypes = inferColumnTypes(matrix);

 function computeNumericSummary(
  matrix: string[][],
  columnTypes: string[],
  headerRowIndex: number
) {
  const summary: Record<string, any> = {};
  if (!matrix.length) return summary;

  const startRow = headerRowIndex === 0 ? 1 : 0;

  for (let c = 0; c < columnTypes.length; c++) {
    if (columnTypes[c] !== "numeric") continue;

    const values: number[] = [];
    for (let r = startRow; r < matrix.length; r++) {
      const v = Number(matrix[r][c]);
      if (Number.isFinite(v)) values.push(v);
    }

    if (!values.length) continue;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    summary[`col_${c + 1}`] = {
      count: values.length,
      sum,
      avg,
      min,
      max,
    };
  }

  return summary;
}

const numericSummary = computeNumericSummary(
  matrix,
  columnTypes,
  headerRowIndex
);

    // artifact content
    let artifactType: "CSV" | "JSON";
    let content: string;

    if (payload.outputFormat === "CSV") {
      artifactType = "CSV";
      content = rowsToCsv(matrix);
    } else {
      artifactType = "JSON";
      content = JSON.stringify(
        {
          rows: matrix,
          headerRowIndex,
          columnTypes,
          numericSummary,
          gridMeta: {
            width,
            height,
            horizontalLines: hLines,
            verticalLines: vLines,
            rowVariance,
            colVariance,
            emptyRate,
            votes: { maxV: v.maxVotes, maxH: h.maxVotes },
          },
        },
        null,
        2
      );
    }

    const { uri } = await saveToolArtifact({
      toolRunId,
      artifactType,
      name: `table_p${page}_t0`,
      content,
    });

    artifactUris.push(uri);

    tables.push({
      page,
      rows: rowsCount,
      cols: colsCount,
      confidence,
      artifactRef: uri,
      gridMeta: {
        width,
        height,
        horizontalLines: hLines,
        verticalLines: vLines,
        rowVariance,
        colVariance,
        emptyRate,
        votes: { maxV: v.maxVotes, maxH: h.maxVotes },
      },
    });
  }

  const endedAt = now();
  void endedAt;
  tables.sort((a, b) => b.confidence - a.confidence);

  return {
    inputsHash,
    artifactUris,
    output: { tables },
    warnings: warnings.length ? warnings : undefined,
  };
}

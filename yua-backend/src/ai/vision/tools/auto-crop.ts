import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type CropBox = { x: number; y: number; w: number; h: number };

export type AutoCropResult = {
  newUrl: string | null;
  cropBox?: CropBox;
  confidenceDelta?: number;
};

export type AutoCropDeps = {
  /**
   * sharp가 없으면 autoCrop은 no-op
   * (deps로 sharp instance를 넣으면 테스트/런타임 모두 안정)
   */
  sharp?: any;
};

const UPLOAD_RE = /\/api\/assets\/uploads\/([^/]+)\/([^/]+)\/([^/?#]+)/;

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function parseInternalUpload(url: string): null | {
  workspaceId: string;
  userId: string;
  fileName: string;
  absolutePath: string;
  urlBase: string; // /api/assets/uploads/{ws}/{user}/
  originPrefix: string; // https://host (optional)
} {
  const m = url.match(UPLOAD_RE);
  if (!m) return null;

  const [full, workspaceId, userId, fileName] = m;
  const idx = url.indexOf(full);
  const originPrefix = idx >= 0 ? url.slice(0, idx) : "";
  const urlBase = `/api/assets/uploads/${workspaceId}/${userId}/`;
  const absolutePath = path.resolve("/mnt/yua/assets/uploads", workspaceId, userId, fileName);

  return { workspaceId, userId, fileName, absolutePath, urlBase, originPrefix };
}

/**
 * Gradient density 기반 ROI 추정 (deterministic)
 * - downscale grayscale raw pixels에서 gradient magnitude를 계산
 * - 슬라이딩 윈도우로 gradient 밀도가 높은 영역 선택
 */
async function computeAutoCropBox(sharp: any, buf: Buffer): Promise<CropBox | null> {
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (W <= 0 || H <= 0) return null;

  // 너무 작은 이미지는 crop 의미 없음
  if (W < 600 || H < 400) return null;

  // downscale target
  const targetW = 320;
  const scale = targetW / W;
  const smallW = targetW;
  const smallH = Math.max(1, Math.floor(H * scale));

  const { data, info } = await sharp(buf)
    .resize({ width: smallW })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  if (w <= 2 || h <= 2) return null;

  // gradient map
  const grad = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const c = data[idx];
      const gx = Math.abs(c - data[idx - 1]) + Math.abs(c - data[idx + 1]);
      const gy = Math.abs(c - data[idx - w]) + Math.abs(c - data[idx + w]);
      grad[idx] = gx + gy;
    }
  }

  // integral image for fast window sum
  const integ = new Float32Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rowSum = 0;
    for (let x = 1; x <= w; x++) {
      const g = grad[(y - 1) * w + (x - 1)];
      rowSum += g;
      integ[y * (w + 1) + x] = integ[(y - 1) * (w + 1) + x] + rowSum;
    }
  }

  function rectSum(x0: number, y0: number, x1: number, y1: number): number {
    // [x0,x1), [y0,y1)
    const A = integ[y0 * (w + 1) + x0];
    const B = integ[y0 * (w + 1) + x1];
    const C = integ[y1 * (w + 1) + x0];
    const D = integ[y1 * (w + 1) + x1];
    return D - B - C + A;
  }

  // candidate window sizes (ratio)
  const ratios = [0.6, 0.75, 0.9];
  let bestScore = -1;
  let best: { x: number; y: number; ww: number; hh: number } | null = null;

  for (const r of ratios) {
    const ww = Math.max(40, Math.floor(w * r));
    const hh = Math.max(40, Math.floor(h * r));
    const stepX = Math.max(6, Math.floor(ww * 0.08));
    const stepY = Math.max(6, Math.floor(hh * 0.08));

    for (let y0 = 0; y0 + hh <= h; y0 += stepY) {
      for (let x0 = 0; x0 + ww <= w; x0 += stepX) {
        const s = rectSum(x0, y0, x0 + ww, y0 + hh);
        const density = s / (ww * hh);
        if (density > bestScore) {
          bestScore = density;
          best = { x: x0, y: y0, ww, hh };
        }
      }
    }
  }

  if (!best) return null;

  // full density 대비 개선이 거의 없으면 crop 생략
  const full = rectSum(0, 0, w, h) / (w * h);
  if (bestScore < full * 1.08) {
    return null;
  }

  // map back to original coords + padding
  const pad = 0.05;
  const x = Math.floor((best.x - best.ww * pad) / scale);
  const y = Math.floor((best.y - best.hh * pad) / scale);
  const ww = Math.floor((best.ww * (1 + 2 * pad)) / scale);
  const hh = Math.floor((best.hh * (1 + 2 * pad)) / scale);

  const X = clampInt(x, 0, W - 2);
  const Y = clampInt(y, 0, H - 2);
  const WW = clampInt(ww, 2, W - X);
  const HH = clampInt(hh, 2, H - Y);

  // 너무 과한 crop 방지: 최소 55% 이상 유지
  if (WW < W * 0.55 || HH < H * 0.55) return null;

  return { x: X, y: Y, w: WW, h: HH };
}

export async function autoCrop(
  input: { url: string; message: string; ocrText: string | null },
  deps: AutoCropDeps
): Promise<AutoCropResult> {
  try {
    const parsed = parseInternalUpload(input.url);
    if (!parsed) return { newUrl: null };

    const sharp = deps.sharp ?? (await (async () => {
      try { return (await import("sharp")).default; } catch { return null; }
    })());
    if (!sharp) return { newUrl: null };

    const buf = await fs.readFile(parsed.absolutePath);
    if (!buf || buf.length === 0) return { newUrl: null };

    const cropBox = await computeAutoCropBox(sharp, buf);
    if (!cropBox) return { newUrl: null };

    const version = "autocrop_v1_grad";
    const key = sha256(`${parsed.fileName}|${cropBox.x},${cropBox.y},${cropBox.w},${cropBox.h}|${version}`);
    const outName = `vision__crop__${key.slice(0, 16)}.png`;
    const outPath = path.resolve("/mnt/yua/assets/uploads", parsed.workspaceId, parsed.userId, outName);

    // cache
    try {
      await fs.access(outPath);
    } catch {
      await sharp(buf)
        .extract({ left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h })
        .png()
        .toFile(outPath);
    }

    const newUrl = `${parsed.originPrefix}${parsed.urlBase}${outName}`;
    return { newUrl, cropBox, confidenceDelta: 0.12 };
  } catch {
    return { newUrl: null };
  }
}

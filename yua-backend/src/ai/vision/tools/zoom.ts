import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type ZoomResult = {
  newUrl: string | null;
  confidenceDelta?: number;
};

export type ZoomDeps = {
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
  urlBase: string;
  originPrefix: string;
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

export async function zoomImage(
  input: { url: string; factor: number; reason: string },
  deps: ZoomDeps
): Promise<ZoomResult> {
  try {
    const parsed = parseInternalUpload(input.url);
    if (!parsed) return { newUrl: null };

    const sharp = deps.sharp ?? (await (async () => {
      try { return (await import("sharp")).default; } catch { return null; }
    })());
    if (!sharp) return { newUrl: null };

    const buf = await fs.readFile(parsed.absolutePath);
    if (!buf || buf.length === 0) return { newUrl: null };

    const meta = await sharp(buf).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (W <= 0 || H <= 0) return { newUrl: null };

    const factor = clampInt(input.factor, 2, 4);
    const maxSide = 2200; // 과도한 업스케일 방지
    const outW = clampInt(W * factor, W, maxSide);
    const outH = clampInt(H * factor, H, maxSide);

    // 너무 큰 이미지는 zoom 의미가 적고 비용만 큼
    if (outW === W && outH === H) return { newUrl: null };

    const version = "zoom_v1";
    const key = sha256(`${parsed.fileName}|${outW}x${outH}|${input.reason}|${version}`);
    const outName = `vision__zoom__${key.slice(0, 16)}.png`;
    const outPath = path.resolve("/mnt/yua/assets/uploads", parsed.workspaceId, parsed.userId, outName);

    // cache
    try {
      await fs.access(outPath);
    } catch {
      await sharp(buf)
        .resize({ width: outW, height: outH, fit: "fill" })
        .png()
        .toFile(outPath);
    }

    const newUrl = `${parsed.originPrefix}${parsed.urlBase}${outName}`;
    return { newUrl, confidenceDelta: 0.08 };
  } catch {
    return { newUrl: null };
  }
}

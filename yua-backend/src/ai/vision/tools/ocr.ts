import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type OCRResult = {
  text: string;
  confidence: number; // 0~1
  provider: "STUB" | "TESSERACT" | "CLOUD";
};

export type OcrDeps = {
  allowStub?: boolean;
  cloudEndpoint?: string;

  /**
   * 🔥 실행 조건
   * - LOW_CONFIDENCE일 때 true
   */
  lowConfidence?: boolean;
};

const UPLOAD_RE =
  /\/api\/assets\/uploads\/([^/]+)\/([^/]+)\/([^/?#]+)/;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseInternalUpload(url: string): null | {
  workspaceId: string;
  userId: string;
  fileName: string;
  absolutePath: string;
} {
  const m = url.match(UPLOAD_RE);
  if (!m) return null;

  const [, workspaceId, userId, fileName] = m;
  const absolutePath = path.resolve(
    "/mnt/yua/assets/uploads",
    workspaceId,
    userId,
    fileName
  );

  return { workspaceId, userId, fileName, absolutePath };
}

/* ------------------------------------------------------------------ */
/* 🔥 OCR 실행 조건 (2번 + 3번만) */
/* ------------------------------------------------------------------ */

function shouldRunOcr(message: string, lowConfidence?: boolean) {
  const m = (message ?? "").toLowerCase();

  const keywordTrigger = [
    "error",
    "exception",
    "stack",
    "trace",
    "console",
    "log",
    "코드",
    "typescript",
    "javascript",
    "ts",
    "js",
    "오류",
    "에러",
  ].some((k) => m.includes(k));

  return Boolean(lowConfidence || keywordTrigger);
}

/* ------------------------------------------------------------------ */
/* 🔥 Worker Singleton */
/* ------------------------------------------------------------------ */

let sharedWorker: any | null = null;

async function getWorker() {
  if (sharedWorker) return sharedWorker;

  const mod: any = await import("tesseract.js");
  const createWorker: any = mod.createWorker;

  // 🔥 타입 충돌 방지
  const worker = await createWorker();

  sharedWorker = worker;
  return worker;
}

/* ------------------------------------------------------------------ */
/* 🔥 이미지 크기 제한 (대형 이미지 안정화) */
/* ------------------------------------------------------------------ */

async function maybeResizeBuffer(buf: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();

    const W = meta.width ?? 0;
    const H = meta.height ?? 0;

    // 4000px 이상이면 OCR 폭발 가능 → 축소
    if (W > 2500 || H > 2500) {
      return await sharp(buf)
        .resize({ width: 1600 }) // aspect ratio 유지
        .png()
        .toBuffer();
    }

    return buf;
  } catch {
    return buf;
  }
}


/* ------------------------------------------------------------------ */
/* 🔒 Deterministic OCR entry */
/* ------------------------------------------------------------------ */

export async function runOcr(
  input: { url?: string; buffer?: Buffer; message: string },
  deps: OcrDeps
): Promise<OCRResult | null> {
  try {
    // 🔥 서버 전용 가드
    if (typeof window !== "undefined") return null;

 let buf: Buffer | null = null;

 if (input.buffer) {
   buf = input.buffer;
 } else if (input.url) {
   const parsed = parseInternalUpload(input.url);
   if (!parsed) return null;
   buf = await fs.readFile(parsed.absolutePath);
 }

 if (!buf || buf.length === 0) return null;

    // 🔥 조건 2번 + 3번
    if (!shouldRunOcr(input.message, deps.lowConfidence)) {
      return null;
    }

    // 1️⃣ STUB
    if (deps.allowStub) {
      const m = (input.message ?? "").toLowerCase();
      const text =
        m.includes("error") || m.includes("오류")
          ? "error: something failed\nat foo(bar)\nstack trace"
          : m.includes("code") || m.includes("코드")
          ? "const x = 1;\nfunction test(){ return x }"
          : "stub-ocr-text";

      return {
        text,
        confidence: 0.8,
        provider: "STUB",
      };
    }

    // 2️⃣ REAL TESSERACT (v2-safe)
// 2️⃣ REAL TESSERACT
try {
  const worker = await getWorker();

  const safeBuf = await maybeResizeBuffer(buf);

  const { data } = await worker.recognize(safeBuf, {
    lang: "eng+kor",
  });

  const text = String(data?.text ?? "").trim();
  if (!text) return null;

  const rawConf =
    typeof data?.confidence === "number"
      ? data.confidence / 100
      : 0.5;

  return {
    text,
    confidence: clamp01(rawConf),
    provider: "TESSERACT",
  };
} catch (e) {
  console.warn("[OCR][TESSERACT_FAIL]", String(e));
  return null;
}
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 🔥 Graceful shutdown (선택) */
/* ------------------------------------------------------------------ */

process.on("SIGINT", async () => {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {}
  }
  process.exit(0);
});

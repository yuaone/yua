// src/ai/upload/chat-upload.service.ts

import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

// CSV / TSV encoding normalisation
import jschardet from "jschardet";
import iconv from "iconv-lite";

export type UploadResult = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

/** Extensions that should be normalised to UTF-8 */
const SPREADSHEET_EXTS = new Set([".csv", ".tsv"]);

/** UTF-8 BOM bytes */
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export const ChatUploadService = {
  async saveAttachment(
    file: Express.Multer.File,
    opts?: { userId: number; workspaceId?: string }
  ): Promise<UploadResult> {
    // Audio / video forbidden
    if (
      file.mimetype?.startsWith("audio/") ||
      file.mimetype?.startsWith("video/")
    ) {
      throw new Error("MEDIA_NOT_ALLOWED");
    }

    const ext = path.extname(file.originalname) || ".png";
    const id = crypto.randomUUID();

    const workspaceId = opts?.workspaceId ?? "unknown";
    const userId = opts?.userId ?? 0;
    const safeUser = Number.isFinite(userId) ? String(userId) : "0";

    const uploadName = `${id}${ext}`;
    const dir = path.join(
      "/mnt/yua/assets/uploads",
      workspaceId,
      safeUser
    );

    await fs.mkdir(dir, { recursive: true });

    // Determine the buffer to write
    let bufferToWrite = file.buffer;

    // CSV / TSV encoding normalisation (EUC-KR, CP949, Shift_JIS, etc. → UTF-8)
    if (SPREADSHEET_EXTS.has(ext.toLowerCase())) {
      bufferToWrite = normaliseToUtf8(file.buffer);
    }

    const filePath = path.join(dir, uploadName);
    await fs.writeFile(filePath, bufferToWrite);

    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: bufferToWrite.length,
      url: `/api/assets/uploads/${workspaceId}/${safeUser}/${uploadName}`,
    };
  },
};

/**
 * Detect encoding with jschardet and convert to UTF-8 + BOM.
 * If already UTF-8 (or detection fails), just prepend BOM if missing.
 */
function normaliseToUtf8(buf: Buffer): Buffer {
  const detection = jschardet.detect(buf);
  const encoding = detection?.encoding ?? "UTF-8";
  const confidence = detection?.confidence ?? 0;

  console.log("[CSV_ENCODING]", {
    detected: encoding,
    confidence: confidence.toFixed(2),
    size: buf.length,
  });

  let utf8Buf: Buffer;

  // If the detected encoding is not UTF-8 and we have reasonable confidence,
  // transcode via iconv-lite
  const isUtf8 = /^utf-?8$/i.test(encoding);
  if (!isUtf8 && confidence > 0.3 && iconv.encodingExists(encoding)) {
    const decoded = iconv.decode(buf, encoding);
    utf8Buf = iconv.encode(decoded, "UTF-8");
  } else {
    utf8Buf = buf;
  }

  // Prepend UTF-8 BOM if not already present
  if (
    utf8Buf.length < 3 ||
    utf8Buf[0] !== 0xef ||
    utf8Buf[1] !== 0xbb ||
    utf8Buf[2] !== 0xbf
  ) {
    utf8Buf = Buffer.concat([UTF8_BOM, utf8Buf]);
  }

  return utf8Buf;
}

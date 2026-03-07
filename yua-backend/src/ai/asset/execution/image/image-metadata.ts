// 🔒 Image Metadata Processor — PHASE 4 (GCS SAFE)

import sharp from "sharp";
import fetch from "node-fetch";

export interface ImageMetadataResult {
  width: number;
  height: number;
  dpi: number;
  colorSpace: string;
  printSafe: boolean;
}

/**
 * GCS / HTTPS 이미지 메타데이터 분석
 * ⚠️ 이미지 자체는 수정하지 않음 (SSOT)
 */
export async function processImageMetadata(params: {
  imageUrl: string; // 🔥 file path ❌
  dpi: number;
}): Promise<ImageMetadataResult> {
  const { imageUrl, dpi } = params;

  console.log("[IMAGE_METADATA][FETCH]", { imageUrl });

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`IMAGE_FETCH_FAILED:${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  const img = sharp(buffer);
  const meta = await img.metadata();

  if (!meta.width || !meta.height) {
    throw new Error("IMAGE_METADATA_INVALID");
  }

  const printSafe =
    dpi >= 300 &&
    meta.width >= 2480 &&
    meta.height >= 3508;

  const result: ImageMetadataResult = {
    width: meta.width,
    height: meta.height,
    dpi,
    colorSpace: meta.space ?? "unknown",
    printSafe,
  };

  console.log("[IMAGE_METADATA][DONE]", result);

  return result;
}

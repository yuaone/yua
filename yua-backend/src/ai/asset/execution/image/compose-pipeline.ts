// 🔥 Image Compose Pipeline — PHASE 3 (SERVICE READY)

import sharp from "sharp";
import fs from "fs";
import path from "path";
import type { ImageSpec, ImageSource } from "../../canonical/image-spec.types";

/**
 * COMPOSE
 * - base image + overlay images
 * - position 지원 (opacity는 이미지 알파로 처리)
 */
export async function composePipeline(params: {
  spec: ImageSpec;
  outputPath: string;
}): Promise<string> {
  const { spec, outputPath } = params;

  if (!spec.sourceImages || spec.sourceImages.length < 2) {
    throw new Error("COMPOSE_REQUIRES_MULTIPLE_SOURCES");
  }

  const [base, ...layers]: ImageSource[] = spec.sourceImages;

  if (!fs.existsSync(base.uri)) {
    throw new Error(`BASE_IMAGE_NOT_FOUND:${base.uri}`);
  }

  const baseImage = sharp(base.uri, { failOnError: false });

  const composites: sharp.OverlayOptions[] = [];

  for (const layer of layers) {
    if (!fs.existsSync(layer.uri)) continue;

    composites.push({
      input: layer.uri,
      gravity: "centre",
    });
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await baseImage
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return outputPath;
}

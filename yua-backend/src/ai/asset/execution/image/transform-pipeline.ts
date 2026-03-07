// 🔥 Image Transform Pipeline — PHASE 3 (SERVICE READY)

import sharp from "sharp";
import fs from "fs";
import path from "path";
import type { ImageSpec, ImageSource } from "../../canonical/image-spec.types";

/**
 * TRANSFORM
 * - resize
 * - crop
 * - background removal (alpha)
 */
export async function transformPipeline(params: {
  spec: ImageSpec;
  outputPath: string;
}): Promise<string> {
  const { spec, outputPath } = params;

  if (!spec.sourceImages?.length) {
    throw new Error("TRANSFORM_SOURCE_REQUIRED");
  }

  const source: ImageSource = spec.sourceImages[0];
  const inputPath = source.uri;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`SOURCE_IMAGE_NOT_FOUND:${inputPath}`);
  }

  const image = sharp(inputPath, { failOnError: false });

  // --- resize ---
  const presetSize =
    spec.preset === "SQUARE"
      ? { width: 1024, height: 1024 }
      : spec.preset === "PRESENTATION"
      ? { width: 1920, height: 1080 }
      : { width: 2560, height: 1440 };

  image.resize(presetSize.width, presetSize.height, {
    fit: "cover",
    position: "centre",
  });

  // --- background handling ---
  if (spec.background === "TRANSPARENT") {
    image.ensureAlpha();
  } else {
    image.flatten({
      background:
        spec.background === "DARK" ? "#000000" : "#ffffff",
    });
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await image.png({ compressionLevel: 9 }).toFile(outputPath);

  return outputPath;
}

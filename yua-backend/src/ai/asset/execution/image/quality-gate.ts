// 🔒 Image Quality Gate — PHASE 4 (URL BASED, HARD BLOCK)

import sharp from "sharp";
import fetch from "node-fetch";
import type { ImageSpec } from "../../canonical/image-spec.types";

export interface ImageQualityReport {
  passed: boolean;
  reasons?: string[];
}

export async function runImageQualityGate(params: {
  imageUrl: string;
  spec: ImageSpec;
}): Promise<ImageQualityReport> {
  const { imageUrl, spec } = params;

  console.log("[IMAGE_QUALITY_GATE][ENTER]", { imageUrl });

  // 🔥 URL → buffer
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`IMAGE_FETCH_FAILED:${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const img = sharp(buffer);
  const meta = await img.metadata();

  const reasons: string[] = [];

  if (!meta.width || !meta.height) {
    reasons.push("INVALID_DIMENSIONS");
  } else {
    if (meta.width < 512 || meta.height < 512) {
      reasons.push("RESOLUTION_TOO_LOW");
    }

    if (spec.preset === "SQUARE" && meta.width !== meta.height) {
      reasons.push("PRESET_MISMATCH_SQUARE");
    }
  }

  if (spec.dpi === 300) {
    if (
      !meta.width ||
      !meta.height ||
      meta.width < 2000 ||
      meta.height < 2000
    ) {
      reasons.push("PRINT_DPI_INSUFFICIENT");
    }
  }

  if (spec.background === "TRANSPARENT") {
    if (!meta.hasAlpha) {
      reasons.push("TRANSPARENT_REQUIRED_BUT_NO_ALPHA");
    }
  }

  const passed = reasons.length === 0;

  console.log("[IMAGE_QUALITY_GATE][RESULT]", {
    passed,
    reasons,
  });

  return {
    passed,
    reasons: passed ? undefined : reasons,
  };
}

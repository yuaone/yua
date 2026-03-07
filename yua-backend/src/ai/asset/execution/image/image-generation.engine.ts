// 🔥 ImageGenerationEngine — PHASE 4 (QUALITY + METADATA, GCS FINAL)

import type { ImageSpec } from "../../canonical/image-spec.types";
import { renderImage } from "./image-renderer";
import {
  attachRenderedImage,
  attachSourceImages,
} from "./image-storage";
import { runImageQualityGate } from "./quality-gate";
import { processImageMetadata } from "./image-metadata";

export class ImageGenerationEngine {
  async execute(params: {
    assetId: string;
    version: number;
    spec: ImageSpec;
  }): Promise<{ imageUrl: string }> {
    const { assetId, version, spec } = params;

    console.log("[IMAGE_GEN_ENGINE][ENTER]", {
      assetId,
      version,
      mode: spec.mode,
      preset: spec.preset,
    });

    /* --------------------------------------------------
     * Render (🔥 returns HTTPS URL now)
     * -------------------------------------------------- */

    let imageUrl: string;

    switch (spec.mode) {
      case "GENERATE":
      case "TRANSFORM":
      case "COMPOSE": {
        imageUrl = await renderImage({
          spec,
          // ⚠️ outputPath는 논리 키로만 사용
          outputPath: `assets/${assetId}/v${version}.png`,
        });
        break;
      }

      default: {
        const _never: never = spec.mode;
        throw new Error(`UNSUPPORTED_IMAGE_MODE:${_never}`);
      }
    }

    console.log("[IMAGE_GEN_ENGINE][RENDER_DONE]", {
      imageUrl,
    });

    /* --------------------------------------------------
     * Quality Gate (🔥 URL 기반으로 동작해야 함)
     * -------------------------------------------------- */

    const quality = await runImageQualityGate({
      imageUrl,
      spec,
    });

    if (!quality.passed) {
      console.error("[IMAGE_GEN_ENGINE][QUALITY_FAILED]", {
        reasons: quality.reasons,
      });
      throw new Error(
        `IMAGE_QUALITY_FAILED:${quality.reasons?.join(",")}`
      );
    }

    console.log("[IMAGE_GEN_ENGINE][QUALITY_OK]");

    /* --------------------------------------------------
     * Metadata Processing (🔥 URL 기반)
     * -------------------------------------------------- */

    const metadata = await processImageMetadata({
      imageUrl,
      dpi: spec.dpi,
    });

    console.log("[IMAGE_GEN_ENGINE][METADATA]", metadata);

    /* --------------------------------------------------
     * Persist Final Image (SSOT)
     * -------------------------------------------------- */

    await attachRenderedImage({
      assetId,
      version,
      imagePath: imageUrl, // 🔥 이제 path = URL
      mode: spec.mode,
    });

    console.log("[IMAGE_GEN_ENGINE][ATTACHED_FINAL]");

    /* --------------------------------------------------
     * Source Trace (UPLOAD / REFERENCE)
     * -------------------------------------------------- */

    if (spec.sourceImages?.length) {
      await attachSourceImages({
        assetId,
        version,
        sources: spec.sourceImages,
      });

      console.log("[IMAGE_GEN_ENGINE][ATTACHED_SOURCES]", {
        count: spec.sourceImages.length,
      });
    }

    return { imageUrl };
  }
}

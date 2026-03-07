import { createHash } from "crypto";
import { StreamEngine } from "../engines/stream-engine";
import { StreamStage } from "yua-shared/stream/stream-stage";
import { analyzeVisionInput } from "./scene/vision-analyzer";
import { buildSceneFromText } from "./scene/scene-builder";
import { renderSemanticImage } from "./render/openai-image-renderer";
import { runPythonVisualization } from "../document/visualize/python-visualization.runner";
import { writeDocumentSectionAsset } from "../../db/document-section-asset-writer";
import { composeCompositeImage } from "./composite/composite-image";
import { findCompositeByHash } from "../../db/document-section-asset-reader";
import { BAR_CHART_SCRIPT } from "../document/visualize/python-scripts/bar-chart";
import { parseImageOptions } from "../input/image-option-parser";

const LAYOUT_VERSION = "v1-fixed-60-40";

export async function runMediaPipeline(args: {
  threadId: number;
  traceId: string;
  sectionId: number;
  sectionType: string;
  message: string;
  computed?: {
    series: number[];
    title?: string;
    maxIndex?: number;
    maxValue?: number;
  };
  attachments?: { kind: "image"; url: string }[];
}) {
  let imageCompleted = false;

  try {
    console.log("[MEDIA_PIPELINE][ENTER]", {
      threadId: args.threadId,
      sectionId: args.sectionId,
      hasComputed: Boolean(args.computed),
      attachments: args.attachments?.length ?? 0,
    });

    await StreamEngine.publish(args.threadId, {
      event: "stage",
      stage: StreamStage.ANALYZING_IMAGE,
      traceId: args.traceId,
    });

    const hasComputed = Boolean(args.computed);
    const hasAttachments = Boolean(args.attachments?.length);

    const visionHint =
      args.attachments && args.attachments.length > 0
        ? await analyzeVisionInput(args.attachments)
        : undefined;

    const scene = buildSceneFromText({
      message: args.message,
      sectionType: args.sectionType,
      visionHint,
    });

    console.log("[MEDIA_PIPELINE][SCENE_GRAPH]", {
  entities: scene.entities.map(e => ({
    id: e.id,
    type: e.type,
    attributes: e.attributes,
  })),
});

    /* ---------------- SEMANTIC ---------------- */
    if (!hasComputed) {
      const img = await renderSemanticImage(scene);
      if (!img?.url) throw new Error("SEMANTIC_IMAGE_EMPTY_URL");

      await writeDocumentSectionAsset({
        sectionId: args.sectionId,
        assetType: "SEMANTIC_IMAGE",
        uri: img.url,
        hash: img.hash,
      });

      await finalizeImageMessage(args);
      imageCompleted = true;
      return;
    }

    /* ---------------- FACTUAL ---------------- */
    // 🔒 FACTUAL: computed만 존재
    if (hasComputed && !hasAttachments) {
      if (!args.computed) return;

      const { series, title, maxIndex, maxValue } = args.computed;
      const imageOptions = parseImageOptions(args.message);

      const factual = await runPythonVisualization({
        sectionId: args.sectionId,
        script: BAR_CHART_SCRIPT,
        payload: {
          data: series,
          title,
          dpi: imageOptions.highQuality ? 300 : undefined,
          purpose: imageOptions.purpose,
          highlight: imageOptions.emphasize
            ? { x: maxIndex, y: maxValue }
            : undefined,
        },
      });

      await writeDocumentSectionAsset({
        sectionId: args.sectionId,
        assetType: "FACTUAL_VISUALIZATION",
        uri: factual.uri,
        hash: factual.hash,
      });

      await finalizeImageMessage(args);
      imageCompleted = true;
      return;
    }

    /* ---------------- COMPOSITE ---------------- */
    if (hasComputed && hasAttachments && args.computed) {
      const factual = await runPythonVisualization({
        sectionId: args.sectionId,
        script: BAR_CHART_SCRIPT,
        payload: { data: args.computed.series },
      });

      const semantic = await renderSemanticImage(scene);
      if (!semantic?.url) return;

      const isLocal =
        factual.uri.startsWith("file://") ||
        semantic.url.startsWith("file://");

      if (isLocal) {
        await writeDocumentSectionAsset({
          sectionId: args.sectionId,
          assetType: "FACTUAL_VISUALIZATION",
          uri: factual.uri,
          hash: factual.hash,
        });

        await writeDocumentSectionAsset({
          sectionId: args.sectionId,
          assetType: "SEMANTIC_IMAGE",
          uri: semantic.url,
          hash: semantic.hash,
        });

        await finalizeImageMessage(args);
        imageCompleted = true;
        return;
      }

      const cacheKey = createHash("sha256")
        .update(factual.hash)
        .update(semantic.hash)
        .update(LAYOUT_VERSION)
        .digest("hex");

      const cached = await findCompositeByHash(cacheKey);
      if (cached) {
        await finalizeImageMessage(args);
        return;
      }

      const composite = await composeCompositeImage({
        sectionId: args.sectionId,
        factualUri: semanticSafeUri(factual.uri),
        semanticUri: semantic.url,
      });

      await writeDocumentSectionAsset({
        sectionId: args.sectionId,
        assetType: "COMPOSITE_IMAGE",
        uri: composite.uri,
        hash: composite.hash,
      });

      await finalizeImageMessage(args);
      imageCompleted = true;
    }
  } catch (err) {
    console.error("[MEDIA_PIPELINE][DEGRADED]", err);

    if (!imageCompleted) {
      await StreamEngine.publish(args.threadId, {
        event: "stage",
        stage: StreamStage.SYSTEM,
        traceId: args.traceId,
        meta: {
          imageLoading: false,
          imageError: true,
        },
      });
    }
    throw err;
  }
}

/* ---------------------------------- */

function semanticSafeUri(uri: string): string {
  if (uri.startsWith("http")) return uri;
  throw new Error("FACTUAL URI must be resolved to http(s)");
}

async function finalizeImageMessage(args: {
  threadId: number;
  traceId: string;
  sectionId: number;
}) {
  await StreamEngine.publish(args.threadId, {
    event: "stage",
    stage: StreamStage.PREPARING_STUDIO,
    traceId: args.traceId,
  });

  await StreamEngine.publish(args.threadId, {
    event: "stage",
    stage: StreamStage.STUDIO_READY,
    traceId: args.traceId,
    meta: {
      studio: {
        sectionId: args.sectionId,
        assetType: "IMAGE",
      },
      imageLoading: false,
    },
  });
}

// 🔥 YUA Asset Planner — FINAL (SSOT, PHASE 1-B)

import crypto from "crypto";
import type { InputAttachment } from "../../input/input-types";

/* -------------------------------------------------- */
/* Types                                              */
/* -------------------------------------------------- */

export type AssetType = "DOCUMENT" | "IMAGE" | "VIDEO";
export type AssetPlanStatus = "READY" | "BLOCKED";

export type CanonicalFormatType =
  | "MARKDOWN_AST"
  | "IMAGE_SPEC"
  | "VIDEO_SCRIPT";

export interface CanonicalFormat {
  type: CanonicalFormatType;
  schemaVersion: "v1";
}

/* DOCUMENT output */
export type DocumentOutputFormat = "PDF" | "DOCX" | "HWP";

/* IMAGE mode */
export type ImageGenerationMode =
  | "GENERATE"
  | "TRANSFORM"
  | "COMPOSE";

export interface CanonicalPlanMeta {
  format: CanonicalFormat;

  imageMode?: ImageGenerationMode;
  outputFormat?: DocumentOutputFormat;
}

export interface AssetPlan {
  planId: string;

  asset: {
    id: string;
    type: AssetType;
  };

  canonical: CanonicalPlanMeta;

  engines: {
    primary: string;
    secondary?: string[];
  };

  costEstimate: {
    unit: "USD";
    estimated: number;
    hardLimit: number;
  };

  judgmentPayload: {
    assetType: AssetType;
    reason: string;
    estimatedCost: number;
  };

  status: AssetPlanStatus;
}

/* -------------------------------------------------- */
/* Planner                                            */
/* -------------------------------------------------- */

export class AssetPlanner {
  static plan(params: {
    input: string;
    attachments?: InputAttachment[];
    workspaceId: string;
    userId: number;
  }): AssetPlan {
    const { input, attachments = [] } = params;
    const normalized = input.toLowerCase();

    /* 1️⃣ Asset Type */
    let assetType: AssetType;

    if (/(영상|비디오|video|mp4)/i.test(normalized)) {
      assetType = "VIDEO";
    } else if (
      /(이미지|그림|image|png|jpg|사진|합성)/i.test(normalized) ||
      attachments.some((a) => a.type === "IMAGE")
    ) {
      assetType = "IMAGE";
    } else {
      assetType = "DOCUMENT";
    }

    /* 2️⃣ Asset ID */
    const assetId =
      assetType === "DOCUMENT"
        ? `asset-doc-${crypto.randomUUID()}`
        : assetType === "IMAGE"
        ? `asset-img-${crypto.randomUUID()}`
        : `asset-vid-${crypto.randomUUID()}`;

    /* 3️⃣ Canonical format */
    const canonicalFormat: CanonicalFormat =
      assetType === "DOCUMENT"
        ? { type: "MARKDOWN_AST", schemaVersion: "v1" }
        : assetType === "IMAGE"
        ? { type: "IMAGE_SPEC", schemaVersion: "v1" }
        : { type: "VIDEO_SCRIPT", schemaVersion: "v1" };

    /* 4️⃣ DOCUMENT output format */
    let outputFormat: DocumentOutputFormat | undefined;

    if (assetType === "DOCUMENT") {
      if (/(hwp|한글)/i.test(normalized)) {
        outputFormat = "HWP";
      } else if (/(docx|워드|word)/i.test(normalized)) {
        outputFormat = "DOCX";
      } else {
        outputFormat = "PDF";
      }
    }

    /* 5️⃣ IMAGE mode */
    let imageMode: ImageGenerationMode | undefined;

    if (assetType === "IMAGE") {
      const hasImage = attachments.some((a) => a.type === "IMAGE");

      if (hasImage && /(합성|같이|추가)/i.test(normalized)) {
        imageMode = "COMPOSE";
      } else if (hasImage) {
        imageMode = "TRANSFORM";
      } else {
        imageMode = "GENERATE";
      }
    }

    /* 6️⃣ Engine routing */
    const engines =
      assetType === "DOCUMENT"
        ? { primary: "DocumentExecutionEngine" }
        : assetType === "IMAGE"
        ? { primary: "ImageGenerationEngine" }
        : { primary: "VideoScriptEngine" };

    /* 7️⃣ Cost */
    const cost =
      assetType === "DOCUMENT"
        ? { estimated: 0.02, hardLimit: 0.1 }
        : assetType === "IMAGE"
        ? { estimated: 0.08, hardLimit: 0.3 }
        : { estimated: 1.2, hardLimit: 3.0 };

    return {
      planId: `plan-${crypto.randomUUID()}`,

      asset: {
        id: assetId,
        type: assetType,
      },

      canonical: {
        format: canonicalFormat,
        imageMode,
        outputFormat,
      },

      engines,

      costEstimate: {
        unit: "USD",
        estimated: cost.estimated,
        hardLimit: cost.hardLimit,
      },

      judgmentPayload: {
        assetType,
        reason: `asset_generation_${assetType.toLowerCase()}`,
        estimatedCost: cost.estimated,
      },

      status: "READY",
    };
  }
}

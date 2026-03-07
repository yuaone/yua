// 📂 src/ai/asset/execution/asset-execution.types.ts
// 🔒 Asset Execution Contracts — SSOT FINAL (PHASE 0 → 4.3)

import type { AssetType, CanonicalFormat } from "../planner/asset-planner";
import type { DecisionVerdict } from "../../../types/decision";
import type { CanonicalType } from "../types/asset.types";

/* -------------------------------------------------- */
/* Common Types                                       */
/* -------------------------------------------------- */

export type DocumentOutputFormat = "PDF" | "DOCX" | "HWP";

/* -------------------------------------------------- */
/* Execution Request                                  */
/* -------------------------------------------------- */

export interface AssetExecutionRequest {
  planId: string;

  assetId: string;
  assetType: AssetType;

  canonicalFormat: CanonicalFormat;

  canonical?: {
    outputFormat?: DocumentOutputFormat;
    [key: string]: unknown;
  };

  /** ✅ DOCUMENT 렌더링 원문 (MARKDOWN) */
  input?: string;

  workspaceId: string;
  projectId?: string | null;

  requestedByUserId: number;

  costLimitUSD: number;

  judgmentVerdict: DecisionVerdict;
  traceId: string;
}

/* -------------------------------------------------- */
/* Execution Context                                  */
/* -------------------------------------------------- */

export interface AssetExecutionContext {
  assetId: string;
  version: number;

  input?: string;

  canonical?: unknown;
  canonicalType?: CanonicalType;

  outputFormat?: DocumentOutputFormat;

  createdBy?: number;
  traceId?: string;

  [key: string]: unknown;
}

/* -------------------------------------------------- */
/* Execution Result                                   */
/* -------------------------------------------------- */

export type AssetExecutionStatus = "SUCCESS" | "FAILED" | "PARTIAL";

export interface AssetExecutionResult {
  assetId: string;
  version: number;

  status: AssetExecutionStatus;

  contentRef: string | null;

  metadata: {
    /** 🔒 반드시 포함 (SSOT) */
    format: string;

    sizeBytes?: number;
    pageCount?: number;

    width?: number;
    height?: number;
    durationSec?: number;

    [key: string]: unknown;
  };

  costUsedUSD: number;
  executionTimeMs: number;
}

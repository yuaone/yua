import type { Request, Response, NextFunction, RequestHandler } from "express";
import type {
  AssetExecutionRequest,
  DocumentOutputFormat,
} from "../../ai/asset/execution/asset-execution.types";

type CanonicalFormatType = "MARKDOWN_AST" | "IMAGE_SPEC" | "VIDEO_SCRIPT";
type AssetType = "DOCUMENT" | "IMAGE" | "VIDEO";

const ALLOWED_CANONICAL_TYPES: readonly CanonicalFormatType[] = [
  "MARKDOWN_AST",
  "IMAGE_SPEC",
  "VIDEO_SCRIPT",
] as const;

const ALLOWED_ASSET_TYPES: readonly AssetType[] = [
  "DOCUMENT",
  "IMAGE",
  "VIDEO",
] as const;

const ALLOWED_DOC_OUTPUT: readonly DocumentOutputFormat[] = [
  "PDF",
  "DOCX",
  "HWP",
] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function canonicalTypeMatchesAssetType(
  assetType: AssetType,
  canonicalType: CanonicalFormatType
) {
  if (assetType === "DOCUMENT") return canonicalType === "MARKDOWN_AST";
  if (assetType === "IMAGE") return canonicalType === "IMAGE_SPEC";
  return canonicalType === "VIDEO_SCRIPT";
}

export type ValidatedAssetExecutionRequest = AssetExecutionRequest & {
  canonical: NonNullable<AssetExecutionRequest["canonical"]>;
  input?: string;
};

export const validateAssetExecution: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;

    if (!isPlainObject(body)) {
      return res.status(400).json({ ok: false, error: "invalid_body" });
    }

    const {
      planId,
      assetId,
      assetType,
      canonicalFormat,
      workspaceId,
      requestedByUserId,
      costLimitUSD,
      judgmentVerdict,
      traceId,
      input,
    } = body;

    if (!isNonEmptyString(planId)) {
      return res.status(400).json({ ok: false, error: "planId_required" });
    }
    if (!isNonEmptyString(assetId)) {
      return res.status(400).json({ ok: false, error: "assetId_required" });
    }
    if (!ALLOWED_ASSET_TYPES.includes(assetType as any)) {
      return res.status(400).json({ ok: false, error: "assetType_invalid" });
    }
    if (!isPlainObject(canonicalFormat)) {
      return res.status(400).json({ ok: false, error: "canonicalFormat_invalid" });
    }
    if (!ALLOWED_CANONICAL_TYPES.includes(canonicalFormat.type as any)) {
      return res.status(400).json({ ok: false, error: "canonicalFormat_type_invalid" });
    }
    if (canonicalFormat.schemaVersion !== "v1") {
      return res.status(400).json({ ok: false, error: "canonicalFormat_schemaVersion_invalid" });
    }
    if (!isNonEmptyString(workspaceId)) {
      return res.status(400).json({ ok: false, error: "workspaceId_required" });
    }
    if (!isFiniteNumber(requestedByUserId) || requestedByUserId <= 0) {
      return res.status(400).json({ ok: false, error: "requestedByUserId_invalid" });
    }
    if (!isFiniteNumber(costLimitUSD) || costLimitUSD <= 0 || costLimitUSD > 20) {
      return res.status(400).json({ ok: false, error: "costLimitUSD_invalid" });
    }
    if (!isNonEmptyString(traceId) || traceId.length > 128) {
      return res.status(400).json({ ok: false, error: "traceId_invalid" });
    }
    if (judgmentVerdict !== "APPROVE") {
      return res.status(403).json({ ok: false, error: "execution_blocked" });
    }

    const canonicalType = canonicalFormat.type as CanonicalFormatType;
    const at = assetType as AssetType;
    if (!canonicalTypeMatchesAssetType(at, canonicalType)) {
      return res.status(400).json({ ok: false, error: "assetType_canonical_mismatch" });
    }

    const canonicalMetaRaw = isPlainObject(body.canonical) ? body.canonical : {};
    const outputFormatRaw = asString(canonicalMetaRaw.outputFormat);
    const outputFormat =
      outputFormatRaw && ALLOWED_DOC_OUTPUT.includes(outputFormatRaw as any)
        ? (outputFormatRaw as DocumentOutputFormat)
        : undefined;

    const safeCanonicalMeta =
      at === "DOCUMENT"
        ? { ...canonicalMetaRaw, outputFormat }
        : { ...canonicalMetaRaw, outputFormat: undefined };

    const safeInput =
      at === "DOCUMENT" && isNonEmptyString(input) ? String(input) : undefined;

    const safeProjectId =
      isNonEmptyString(body.projectId) ? body.projectId : null;

    const validated: ValidatedAssetExecutionRequest = {
      planId: String(planId),
      assetId: String(assetId),
      assetType: at,
      canonicalFormat: canonicalFormat as any,
      canonical: safeCanonicalMeta as any,
      input: safeInput,
      workspaceId: String(workspaceId),
      projectId: safeProjectId,
      requestedByUserId: Number(requestedByUserId),
      costLimitUSD: Number(costLimitUSD),
      judgmentVerdict: "APPROVE",
      traceId: String(traceId),
    };

    (req as any).validatedAssetExecution = validated;
    next();
  } catch (e) {
    next(e);
  }
};

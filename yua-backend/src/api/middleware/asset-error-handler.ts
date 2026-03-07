// 📂 src/api/middleware/asset-error-handler.ts
// ✅ Asset Error Handler (PROD)

import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

function toMessage(err: unknown): string {
  if (!err) return "unknown_error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || err.name || "error";
  try {
    return JSON.stringify(err);
  } catch {
    return "unknown_error";
  }
}

function mapStatus(message: string): { status: number; code: string } {
  // Execution gate
  if (message.includes("execution_blocked_by_judgment") || message === "execution_blocked") {
    return { status: 403, code: "execution_blocked" };
  }

  // Document quality
  if (message.startsWith("DOCUMENT_QUALITY_HARD_FAIL:")) {
    return { status: 422, code: "document_quality_hard_fail" };
  }
  if (message.startsWith("DOCUMENT_QUALITY_FAILED:")) {
    return { status: 422, code: "document_quality_failed" };
  }

  // Common validation / input
  if (
    message.includes("DOCUMENT_INPUT_EMPTY") ||
    message.includes("DOCUMENT_AST_EMPTY") ||
    message.includes("invalid_") ||
    message.includes("_required") ||
    message.includes("_invalid") ||
    message.includes("_mismatch")
  ) {
    return { status: 400, code: "bad_request" };
  }

  // Cost
  if (message.includes("cost_limit_exceeded")) {
    return { status: 402, code: "cost_limit_exceeded" };
  }

  // Not found
  if (message.includes("asset_not_found")) {
    return { status: 404, code: "asset_not_found" };
  }

  // Default
  return { status: 500, code: "internal_error" };
}

export const assetErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const message = toMessage(err);
  const { status, code } = mapStatus(message);

  // response already started
  if (res.headersSent) return next(err);

  // 운영용: traceId 있으면 같이 내려서 추적 가능
  const traceId =
    (req as any).validatedAssetExecution?.traceId ||
    (req as any).traceId ||
    undefined;

  return res.status(status).json({
    ok: false,
    error: code,
    message,
    traceId,
  });
};

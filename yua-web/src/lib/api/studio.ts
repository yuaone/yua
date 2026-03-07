"use client";

import type { StudioMode } from "@/components/studio/useStudioState";

export type AssetType = "DOCUMENT" | "IMAGE" | "VIDEO";

function resolveAssetType(mode: StudioMode): AssetType {
  if (mode === "image") return "IMAGE";
  if (mode === "video") return "VIDEO";
  return "DOCUMENT";
}

function resolveCanonicalFormat(mode: StudioMode) {
  if (mode === "image") {
    return { type: "IMAGE_SPEC", schemaVersion: "v1" };
  }
  if (mode === "video") {
    return { type: "VIDEO_SCRIPT", schemaVersion: "v1" };
  }
  return { type: "MARKDOWN_AST", schemaVersion: "v1" };
}

/* -----------------------------
 * Planner
 * ---------------------------- */
export async function planAsset(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  input: string
) {
  const res = await authFetch("/api/assets/plan", {
    method: "POST",
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    throw new Error("asset_plan_failed");
  }

  return res.json();
}

/* -----------------------------
 * Judge
 * ---------------------------- */
export async function judgeAsset(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  plan: any
) {
  const res = await authFetch("/api/assets/judge", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    throw new Error("asset_judge_failed");
  }

  return res.json();
}

/* -----------------------------
 * Execute
 * ---------------------------- */
export async function executeAsset(
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  params: {
    mode: StudioMode;
    plan: any;
    workspaceId: string;
    userId: number;
    costLimitUSD?: number;
    traceId: string;
  }
) {
  const payload = {
    planId: params.plan.planId,
    assetId: params.plan.assetId,
    assetType: resolveAssetType(params.mode),
    canonicalFormat: resolveCanonicalFormat(params.mode),
    canonical: params.plan.canonical ?? {},
    outputFormat: "PDF", // or undefined, but 명시가 안전
    workspaceId: params.workspaceId,
    requestedByUserId: params.userId,
    costLimitUSD: params.costLimitUSD ?? 5,
    judgmentVerdict: "APPROVE",
    traceId: params.traceId,
  };

  const res = await authFetch("/api/assets/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("asset_execute_failed");
  }

  return res.json();
}

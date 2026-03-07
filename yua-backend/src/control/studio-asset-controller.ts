// 📂 src/control/studio-asset-controller.ts
// 🔥 Studio Asset Controller — PROD READY (DOCUMENT / IMAGE)

import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { pgPool } from "../db/postgres";

import { AssetExecutor } from "../ai/asset/execution/asset-executor";
import type { AssetExecutionRequest } from "../ai/asset/execution/asset-execution.types";

/* -------------------------------------------------- */
/* 🔒 권한 유틸 (간단판 — 나중에 확장 가능)           */
/* -------------------------------------------------- */
async function assertWorkspaceAccess(params: {
  workspaceId: string;
  userId: number;
  requiredRole?: "VIEWER" | "EDITOR" | "OWNER";
}) {
  const { rows } = await pgPool.query(
    `
    SELECT role
    FROM workspace_users
    WHERE workspace_id = $1 AND user_id = $2
    `,
    [params.workspaceId, params.userId]
  );

  if (!rows.length) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[ASSERT_WS][INPUT]", {
        workspaceId: params.workspaceId,
        userId: params.userId,
      });
      console.log("[ASSERT_WS][RESULT]", rows);
    }
    throw new Error("workspace_access_denied");
  }

  const role = rows[0].role as "VIEWER" | "EDITOR" | "OWNER";

  if (params.requiredRole === "EDITOR" && role === "VIEWER") {
    throw new Error("workspace_permission_denied");
  }
}

function mapSectionAssetUri(row: {
  id: number;
  sectionId: number;
  uri: string;
}) {
  if (typeof row.uri === "string" && row.uri.startsWith("file://")) {
    return {
      ...row,
      uri: `/api/sections/${row.sectionId}/assets?assetId=${row.id}`,
    };
  }
  return row;
}

/* -------------------------------------------------- */
/* 📦 Controller                                     */
/* -------------------------------------------------- */
export const studioAssetController = {
  /* -------------------------------------------------- */
  /* GET /api/studio/images                             */
  /* -------------------------------------------------- */
  async listImages(req: Request, res: Response) {
    const scope = String(req.query.scope ?? "workspace");
    const threadId = Number(req.query.threadId);
 const userId = (req as any).user?.id ?? (req as any).user?.userId;
 const workspaceId =
   (req as any).workspaceId ?? (req as any).workspace?.id;

 if (!userId || !workspaceId) {
   return res.status(401).json({ ok: false, error: "unauthorized" });
 }

    try {
      await assertWorkspaceAccess({
        workspaceId,
        userId,
        requiredRole: "VIEWER",
      });

      let rows: any[] = [];
      if (scope === "thread") {
        if (!Number.isFinite(threadId)) {
          return res.status(400).json({ ok: false, error: "threadId required" });
        }
        const r = await pgPool.query(
          `
          SELECT
            dsa.id,
            dsa.section_id AS "sectionId",
            dsa.asset_type AS asset_type,
            dsa.uri,
            dsa.created_at AS "createdAt",
            d.thread_id AS "threadId",
            d.id AS "documentId"
          FROM document_section_assets dsa
          JOIN document_sections ds ON ds.id = dsa.section_id
          JOIN documents d ON d.id = ds.document_id
          JOIN conversation_threads ct ON ct.id = d.thread_id
          WHERE d.thread_id = $1
            AND ct.workspace_id = $2
          ORDER BY dsa.created_at DESC
          `,
          [threadId, workspaceId]
        );
        rows = r.rows;
      } else if (scope === "user") {
        const r = await pgPool.query(
          `
          SELECT
            dsa.id,
            dsa.section_id AS "sectionId",
            dsa.asset_type AS asset_type,
            dsa.uri,
            dsa.created_at AS "createdAt",
            d.thread_id AS "threadId",
            d.id AS "documentId"
          FROM document_section_assets dsa
          JOIN document_sections ds ON ds.id = dsa.section_id
          JOIN documents d ON d.id = ds.document_id
          JOIN conversation_threads t ON t.id = d.thread_id
          WHERE t.workspace_id = $1
            AND t.user_id = $2
          ORDER BY dsa.created_at DESC
          `,
          [workspaceId, userId]
        );
        rows = r.rows;
      } else {
        const r = await pgPool.query(
          `
          SELECT
            dsa.id,
            dsa.section_id AS "sectionId",
            dsa.asset_type AS asset_type,
            dsa.uri,
            dsa.created_at AS "createdAt",
            d.thread_id AS "threadId",
            d.id AS "documentId"
          FROM document_section_assets dsa
          JOIN document_sections ds ON ds.id = dsa.section_id
          JOIN documents d ON d.id = ds.document_id
          JOIN conversation_threads ct ON ct.id = d.thread_id
          WHERE ct.workspace_id = $1
          ORDER BY dsa.created_at DESC
          `,
          [workspaceId]
        );
        rows = r.rows;
      }

      const assets = rows.map((row) =>
        mapSectionAssetUri({
          id: row.id,
          sectionId: row.sectionId,
          uri: row.uri,
          ...row,
        })
      );

      return res.json({ ok: true, assets });
    } catch (err: any) {
      console.error(err);

      if (err?.message === "workspace_access_denied" ||
          err?.message === "workspace_permission_denied") {
        return res.status(403).json({ ok: false, error: err.message });
      }

      return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
    }
  },
  /* -------------------------------------------------- */
  /* GET /api/studio/assets/:assetId                   */
  /* -------------------------------------------------- */
  async getAsset(req: Request, res: Response) {
    const assetId = req.params.assetId;
const userId = (req as any).user?.id ?? (req as any).user?.userId;

if (!userId) {
  return res.status(401).json({ ok: false, error: "unauthorized" });
}

    const { rows } = await pgPool.query(
      `
      SELECT *
      FROM assets
      WHERE id = $1
      `,
      [assetId]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: "asset_not_found",
      });
    }

    const asset = rows[0];

    await assertWorkspaceAccess({
      workspaceId: asset.workspace_id,
      userId,
      requiredRole: "VIEWER",
    });

    const versions = await pgPool.query(
      `
      SELECT *
      FROM asset_versions
      WHERE asset_id = $1
      ORDER BY version DESC
      `,
      [assetId]
    );

    return res.status(200).json({
      ok: true,
      asset,
      versions: versions.rows,
    });
  },

  /* -------------------------------------------------- */
  /* POST /api/studio/assets/:assetId/execute           */
  /* -------------------------------------------------- */
  async executeAsset(req: Request, res: Response) {
    const assetId = req.params.assetId;
 const userId = (req as any).user?.id ?? (req as any).user?.userId;

 if (!userId) {
   return res.status(401).json({ ok: false, error: "unauthorized" });
 }
 const workspaceId =
   (req as any).workspaceId ?? (req as any).workspace?.id;

 if (!workspaceId) {
   return res.status(401).json({ ok: false, error: "unauthorized" });
 }

    await assertWorkspaceAccess({
      workspaceId,
      userId,
      requiredRole: "EDITOR",
    });

    const body = req.body as Partial<AssetExecutionRequest>;

    if (!body.input || typeof body.input !== "string") {
      return res.status(400).json({
        ok: false,
        error: "input_required",
      });
    }

    const executor = new AssetExecutor();

    const result = await executor.run({
      planId: body.planId ?? `studio-${Date.now()}`,
      assetId,
      assetType: body.assetType!,
      canonicalFormat: body.canonicalFormat!,
      canonical: body.canonical,
      input: body.input,
      workspaceId,
      requestedByUserId: userId,
      costLimitUSD: body.costLimitUSD ?? 0.5,
      judgmentVerdict: "APPROVE",
      traceId: body.traceId ?? `trace-studio-${Date.now()}`,
    });

    return res.status(200).json({
      ok: true,
      result,
    });
  },

  /* -------------------------------------------------- */
  /* GET /api/studio/assets/:assetId/download           */
  /* -------------------------------------------------- */
  async download(req: Request, res: Response) {
    const assetId = req.params.assetId;
    const version = Number(req.query.version);
 const userId = (req as any).user?.id ?? (req as any).user?.userId;

 if (!userId) {
   return res.status(401).json({ ok: false, error: "unauthorized" });
 }

    if (!Number.isFinite(version)) {
      return res.status(400).json({
        ok: false,
        error: "version_required",
      });
    }

    const { rows } = await pgPool.query(
      `
      SELECT a.workspace_id, v.content_ref
      FROM assets a
      JOIN asset_versions v
        ON a.id = v.asset_id
      WHERE a.id = $1 AND v.version = $2
      `,
      [assetId, version]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: "asset_version_not_found",
      });
    }

    const { workspace_id, content_ref } = rows[0];

    await assertWorkspaceAccess({
      workspaceId: workspace_id,
      userId,
      requiredRole: "VIEWER",
    });

    const normalizedRef =
      typeof content_ref === "string" && content_ref.startsWith("file://")
        ? content_ref.replace(/^file:\/\//, "")
        : content_ref;
    const absPath = path.resolve(normalizedRef);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        ok: false,
        error: "file_not_found",
      });
    }

    return res.sendFile(absPath);
  },
};

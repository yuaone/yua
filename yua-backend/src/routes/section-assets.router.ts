import { Router } from "express";
import path from "path";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { pgPool } from "../db/postgres";

const router = Router();

const ASSET_ROOT = "/mnt/yua/assets";


/**
 * GET /api/sections/:sectionId/assets
 */
router.get("/:sectionId/assets", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  const assetId = req.query.assetId ? Number(req.query.assetId) : undefined;
  if (!Number.isFinite(sectionId)) {
    return res
      .status(400)
      .json({ ok: false, error: "INVALID_SECTION_ID" });
  }

  const wsRes = await pgPool.query(
    `
    SELECT ct.workspace_id
    FROM document_sections ds
    JOIN documents d ON d.id = ds.document_id
    JOIN conversation_threads ct ON ct.id = d.thread_id
    WHERE ds.id = $1
    LIMIT 1
    `,
    [sectionId]
  );

  const wsRow = wsRes.rows[0];
  if (!wsRow) {
    return res
      .status(404)
      .json({ ok: false, error: "SECTION_NOT_FOUND" });
  }

  try {
    if (Number.isFinite(assetId)) {
      const { rows } = await pgPool.query(
        `
        SELECT id, asset_type, uri
        FROM document_section_assets
        WHERE section_id = $1 AND id = $2
        LIMIT 1
        `,
        [sectionId, assetId]
      );

      const asset = rows[0];
      if (!asset) {
        return res
          .status(404)
          .json({ ok: false, error: "ASSET_NOT_FOUND" });
      }

      if (typeof asset.uri === "string" && asset.uri.startsWith("file://")) {
        const filePath = asset.uri.replace(/^file:\/\//, "");
        const resolved = path.resolve(filePath);
        if (
          resolved !== ASSET_ROOT &&
          !resolved.startsWith(ASSET_ROOT + path.sep)
        ) {
          return res
            .status(403)
            .json({ ok: false, error: "INVALID_ASSET_PATH" });
        }
        return res.sendFile(resolved);
      }

      return res
        .status(400)
        .json({ ok: false, error: "UNSUPPORTED_ASSET_URI" });
    }

    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        asset_type,
        uri
      FROM document_section_assets
      WHERE section_id = $1
      ORDER BY
        CASE asset_type
          WHEN 'COMPOSITE_IMAGE' THEN 1
          WHEN 'FACTUAL_VISUALIZATION' THEN 2
          WHEN 'SEMANTIC_IMAGE' THEN 3
        END,
        created_at ASC
      `,
      [sectionId]
    );

    const assets = rows.map((row: any) => {
      if (typeof row.uri === "string" && row.uri.startsWith("file://")) {
        return {
          ...row,
          uri: `/api/sections/${sectionId}/assets?assetId=${row.id}`,
        };
      }
      return row;
    });

    return res.json({
      ok: true,
      assets,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

export default router;

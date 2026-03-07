import { Router } from "express";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { pgPool } from "../db/postgres";

const router = Router();
router.use(requireAuthOrApiKey);

/**
 * GET /api/document/sections/:sectionId/assets
 */
router.get("/sections/:sectionId/assets", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  const assetId = req.query.assetId ? Number(req.query.assetId) : undefined;
  if (!sectionId) {
    return res.status(400).json({ ok: false, error: "INVALID_SECTION_ID" });
  }

  if (Number.isFinite(assetId)) {
    const { rows } = await pgPool.query(
      `
      SELECT id, asset_type, uri, hash, created_at
      FROM document_section_assets
      WHERE section_id = $1 AND id = $2
      LIMIT 1
      `,
      [sectionId, assetId]
    );

    const asset = rows[0];
    if (!asset) {
      return res.status(404).json({ ok: false, error: "ASSET_NOT_FOUND" });
    }

    if (typeof asset.uri === "string" && asset.uri.startsWith("file://")) {
      const filePath = asset.uri.replace(/^file:\/\//, "");
      return res.sendFile(filePath);
    }

    return res
      .status(400)
      .json({ ok: false, error: "UNSUPPORTED_ASSET_URI" });
  }

  const { rows } = await pgPool.query(
    `
    SELECT id, asset_type, uri, hash, created_at
    FROM document_section_assets
    WHERE section_id = $1
    ORDER BY created_at ASC
    `,
    [sectionId]
  );

  return res.json({
    ok: true,
    assets: rows.map((row: any) => {
      if (typeof row.uri === "string" && row.uri.startsWith("file://")) {
        return {
          ...row,
          uri: `/api/document/sections/${sectionId}/assets?assetId=${row.id}`,
        };
      }
      return row;
    }),
  });
});

export default router;

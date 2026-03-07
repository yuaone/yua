// src/routes/asset-section-assets.router.ts

import { Router } from "express";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { pgPool } from "../db/postgres";

const router = Router();
router.use(requireAuthOrApiKey);

/**
 * GET /api/assets/:assetId/sections/assets
 */
router.get("/:assetId/sections/assets", async (req, res) => {
  const assetId = req.params.assetId;

  if (!assetId) {
    return res
      .status(400)
      .json({ ok: false, error: "INVALID_ASSET_ID" });
  }

  try {
    /**
     * 1️⃣ asset → document_id
     */
    const assetRes = await pgPool.query(
      `
      SELECT document_id
      FROM assets
      WHERE id = $1
      `,
      [assetId]
    );

    if (!assetRes.rows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "ASSET_NOT_FOUND" });
    }

    const documentId = assetRes.rows[0].document_id;

    /**
     * 2️⃣ 최신 document version
     */
    const docRes = await pgPool.query(
      `
      SELECT current_version
      FROM documents
      WHERE id = $1
      `,
      [documentId]
    );

    const version = docRes.rows[0]?.current_version;
    if (!version) {
      return res.json({ ok: true, assets: [] });
    }

    /**
     * 3️⃣ sections + section_assets
     */
    const { rows } = await pgPool.query(
      `
      SELECT
        dsa.id,
        dsa.asset_type,
        dsa.uri,
        dsa.section_id
      FROM document_sections ds
      JOIN document_section_assets dsa
        ON dsa.section_id = ds.id
      WHERE ds.document_id = $1
        AND ds.version = $2
      ORDER BY
        CASE dsa.asset_type
          WHEN 'COMPOSITE_IMAGE' THEN 1
          WHEN 'FACTUAL_VISUALIZATION' THEN 2
          WHEN 'SEMANTIC_IMAGE' THEN 3
        END,
        ds.section_order ASC,
        dsa.created_at ASC
      `,
      [documentId, version]
    );

    return res.json({
      ok: true,
      assets: rows,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

export default router;

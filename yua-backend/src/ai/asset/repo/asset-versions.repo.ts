import { pgPool } from "../../../db/postgres";
import type { AssetVersionRow, CanonicalType } from "../types/asset.types";

export const AssetVersionsRepo = {
  async nextVersion(assetId: string): Promise<number> {
    const { rows } = await pgPool.query<{ v: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS v FROM asset_versions WHERE asset_id = $1`,
      [assetId]
    );
    return Number(rows[0]?.v ?? 1);
  },

  async insert(params: {
    assetId: string;
    version: number;
    canonicalType: CanonicalType;
    schemaVersion?: string;
    contentRef: string;
    promptSnapshot?: string | null;
    styleId?: string | null;
    createdBy: number;
  }): Promise<AssetVersionRow> {
    const {
      assetId,
      version,
      canonicalType,
      schemaVersion = "v1",
      contentRef,
      promptSnapshot = null,
      styleId = null,
      createdBy,
    } = params;

    const { rows } = await pgPool.query<AssetVersionRow>(
      `
      INSERT INTO asset_versions (
        asset_id, version, canonical_type, schema_version,
        content_ref, prompt_snapshot, style_id, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [assetId, version, canonicalType, schemaVersion, contentRef, promptSnapshot, styleId, createdBy]
    );

    return rows[0];
  },

  async attachRenderedRef(params: {
    assetId: string;
    version: number;
    key: string;     // "image" | "pdf" | "script" ...
    value: string;   // path or url
  }): Promise<void> {
    const { assetId, version, key, value } = params;

    await pgPool.query(
      `
      UPDATE asset_versions
      SET rendered_refs = jsonb_set(
        COALESCE(rendered_refs, '{}'),
        ARRAY[$3],
        to_jsonb($4::text)
      )
      WHERE asset_id = $1 AND version = $2
      `,
      [assetId, version, key, value]
    );
  },
};

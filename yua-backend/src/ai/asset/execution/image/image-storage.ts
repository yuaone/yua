// 🔒 Image Storage — asset_versions.rendered_refs (PHASE 2 FINAL)

import { pgPool } from "../../../../db/postgres";
import type {
  ImageSource,
  ImageGenerationMode,
} from "../../canonical/image-spec.types";

/* --------------------------------------------------
 * Final Rendered Image
 * -------------------------------------------------- */

export async function attachRenderedImage(params: {
  assetId: string;
  version: number;
  imagePath: string;
  mode: ImageGenerationMode;
}) {
  const { assetId, version, imagePath, mode } = params;

  await pgPool.query(
    `
    UPDATE asset_versions
    SET rendered_refs =
      jsonb_set(
        jsonb_set(
          COALESCE(rendered_refs, '{}'),
          '{final}',
          to_jsonb($3::text)
        ),
        '{mode}',
        to_jsonb($4::text)
      )
    WHERE asset_id = $1 AND version = $2
    `,
    [assetId, version, imagePath, mode]
  );
}

/* --------------------------------------------------
 * Source Images (UPLOAD / REFERENCE)
 * -------------------------------------------------- */

export async function attachSourceImages(params: {
  assetId: string;
  version: number;
  sources: ImageSource[];
}) {
  const { assetId, version, sources } = params;

  await pgPool.query(
    `
    UPDATE asset_versions
    SET rendered_refs =
      jsonb_set(
        COALESCE(rendered_refs, '{}'),
        '{sources}',
        to_jsonb($3::jsonb)
      )
    WHERE asset_id = $1 AND version = $2
    `,
    [assetId, version, JSON.stringify(sources)]
  );
}

/* --------------------------------------------------
 * Intermediate Outputs (PHASE 3 대비)
 * -------------------------------------------------- */

export async function attachIntermediateImage(params: {
  assetId: string;
  version: number;
  step: string;
  imagePath: string;
}) {
  const { assetId, version, step, imagePath } = params;

  await pgPool.query(
    `
    UPDATE asset_versions
    SET rendered_refs =
      jsonb_set(
        COALESCE(rendered_refs, '{}'),
        '{intermediate}',
        COALESCE(rendered_refs->'intermediate', '{}'::jsonb) ||
        jsonb_build_object($3, to_jsonb($4::text))
      )
    WHERE asset_id = $1 AND version = $2
    `,
    [assetId, version, step, imagePath]
  );
}

import { pgPool } from "./postgres";

export async function findCompositeByHash(hash: string): Promise<{
  id: number;
  uri: string;
  hash: string;
} | null> {
  const { rows } = await pgPool.query(
    `
    SELECT id, uri, hash
    FROM document_section_assets
    WHERE asset_type = 'COMPOSITE_IMAGE'
      AND hash = $1
    LIMIT 1
    `,
    [hash]
  );

  return rows[0] ?? null;
}

export async function listAssetsBySection(sectionId: number) {
  const { rows } = await pgPool.query(
    `
    SELECT id, asset_type, uri
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

  return rows;
}

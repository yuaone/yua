import { pgPool } from "./postgres";

export async function writeDocumentSectionAsset(input: {
  sectionId: number;
    assetType:
    | "FACTUAL_VISUALIZATION"
    | "SEMANTIC_IMAGE"
    | "COMPOSITE_IMAGE";
  uri: string;
  hash: string;
}) {
  const client = await pgPool.connect();

  try {
    await client.query(
      `
      INSERT INTO document_section_assets (
        section_id,
        asset_type,
        uri,
        hash
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        input.sectionId,
        input.assetType,
        input.uri,
        input.hash,
      ]
    );
  } finally {
    client.release();
  }
}

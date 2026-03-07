import { pgPool } from "./postgres";

export async function ensureImageSection(input: {
  workspaceId: string;
  threadId: number;
}): Promise<{
  documentId: number;
  sectionId: number;
  version: number;
}> {
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ document 생성
    const docRes = await client.query(
      `
      INSERT INTO documents
        (workspace_id, thread_id, document_type, domain, title, language)
      VALUES
        ($1, $2, 'IMAGE', 'image', 'Image Asset', 'und')
      RETURNING id, current_version
      `,
      [input.workspaceId, input.threadId]
    );

    const documentId = docRes.rows[0].id;
    const version = docRes.rows[0].current_version;

    // 2️⃣ section 생성 (order = 0 고정)
    const secRes = await client.query(
      `
      INSERT INTO document_sections
        (document_id, version, section_order, section_type, content)
      VALUES
        ($1, $2, 0, 'RESULT', '')
      RETURNING id
      `,
      [documentId, version]
    );

    const sectionId = secRes.rows[0].id;

    await client.query("COMMIT");
    return { documentId, sectionId, version };

  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

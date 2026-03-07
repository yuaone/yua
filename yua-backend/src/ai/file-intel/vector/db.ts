import { FileChunk } from "../types";
import { assertEmbeddingDim, toPgvectorLiteral, Embedder } from "./embedder";

export type DbClient = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
};

export async function upsertFileSession(args: {
  db: DbClient;
  workspaceId: string;
  threadId: number;
  summaryJson: any;
}): Promise<{ sessionId: string }> {
  const res = await args.db.query(
    `
    INSERT INTO file_sessions (workspace_id, thread_id, summary_json)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT (workspace_id, thread_id)
    DO UPDATE SET summary_json = EXCLUDED.summary_json, updated_at = now()
    RETURNING id
  `,
    [args.workspaceId, args.threadId, JSON.stringify(args.summaryJson ?? {})]
  );
  return { sessionId: String(res.rows[0].id) };
}

export async function getSessionIdByThread(args: {
  db: DbClient;
  workspaceId: string;
  threadId: number;
}): Promise<string | null> {
  const res = await args.db.query(
    `SELECT id FROM file_sessions WHERE workspace_id = $1 AND thread_id = $2 LIMIT 1`,
    [args.workspaceId, args.threadId]
  );
  return res.rows?.[0]?.id ? String(res.rows[0].id) : null;
}

export async function upsertFileDocument(args: {
  db: DbClient;
  sessionId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  irJson: any;
  contentHash?: string | null;
}): Promise<{ documentId: string }> {
  const res = await args.db.query(
    `
    INSERT INTO file_documents (session_id, file_name, file_type, mime_type, size_bytes, ir_json, content_hash)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
    ON CONFLICT (session_id, file_name, size_bytes)
    DO UPDATE SET
      file_type = EXCLUDED.file_type,
      mime_type = EXCLUDED.mime_type,
      ir_json = EXCLUDED.ir_json,
      content_hash = EXCLUDED.content_hash
    RETURNING id
  `,
    [
      args.sessionId,
      args.fileName,
      args.fileType,
      args.mimeType ?? null,
      args.sizeBytes,
      JSON.stringify(args.irJson ?? {}),
      args.contentHash ?? null,
    ]
  );
  return { documentId: String(res.rows[0].id) };
}

export async function findDocumentIdByContentHash(args: {
  db: DbClient;
  sessionId: string;
  contentHash: string;
}): Promise<string | null> {
  const res = await args.db.query(
    `SELECT id FROM file_documents WHERE session_id = $1 AND content_hash = $2 LIMIT 1`,
    [args.sessionId, args.contentHash]
  );
  return res.rows?.[0]?.id ? String(res.rows[0].id) : null;
}

export async function insertChunksBatch(args: {
  db: DbClient;
  embedder: Embedder;
  sessionId: string;
  documentId: string;
  chunks: Array<{ chunk: FileChunk; embedding: number[] }>;
}): Promise<void> {
  if (!args.chunks.length) return;

  for (const c of args.chunks) assertEmbeddingDim(c.embedding, args.embedder.dim);

  const valuesSql: string[] = [];
  const params: any[] = [];
  let p = 1;

  for (const { chunk, embedding } of args.chunks) {
    valuesSql.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::vector, $${p++})`
    );
    params.push(
      args.sessionId,
      args.documentId,
      chunk.chunkIndex,
      chunk.chunkType,
      chunk.content,
      chunk.tokenEstimate ?? null,
      toPgvectorLiteral(embedding),
      args.embedder.model
    );
  }

  await args.db.query(
    `
    INSERT INTO file_chunks
      (session_id, document_id, chunk_index, chunk_type, content, token_estimate, embedding, embedding_model)
    VALUES ${valuesSql.join(",")}
    ON CONFLICT (document_id, chunk_index)
    DO UPDATE SET
      content = EXCLUDED.content,
      token_estimate = EXCLUDED.token_estimate,
      embedding = EXCLUDED.embedding,
      embedding_model = EXCLUDED.embedding_model
  `,
    params
  );
}

-- Document blocks table for RAG embedding
CREATE TABLE IF NOT EXISTS document_blocks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doc_id        TEXT NOT NULL,
  block_type    TEXT NOT NULL DEFAULT 'paragraph',
  block_order   INT NOT NULL DEFAULT 0,
  content       TEXT NOT NULL DEFAULT '',
  content_hash  TEXT,
  embedding     vector(1536),
  block_part    INT DEFAULT 0,
  parent_id     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_blocks_doc_id
  ON document_blocks (doc_id);

CREATE INDEX IF NOT EXISTS idx_doc_blocks_embedding
  ON document_blocks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- DocChat messages
CREATE TABLE IF NOT EXISTS doc_chat_messages (
  id          SERIAL PRIMARY KEY,
  doc_id      TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  citations   JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_chat_doc_session
  ON doc_chat_messages (doc_id, session_id, created_at);

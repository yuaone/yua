-- WAL (Write-Ahead Log) for Y.js incremental updates
-- Every Y.js update is immediately appended here (zero data loss on crash)
-- Compacted after periodic snapshot creation

CREATE TABLE IF NOT EXISTS workspace_doc_updates (
  id         BIGSERIAL PRIMARY KEY,
  doc_id     UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  update     BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_doc_updates_doc
  ON workspace_doc_updates (doc_id, id);

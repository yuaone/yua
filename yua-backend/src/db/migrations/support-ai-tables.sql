BEGIN;

CREATE TABLE IF NOT EXISTS support_knowledge (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding vector(1536),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_embedding
  ON support_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_category
  ON support_knowledge(category);

CREATE TABLE IF NOT EXISTS ticket_classifications (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  suggested_category VARCHAR(50),
  suggested_priority VARCHAR(20),
  confidence REAL,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

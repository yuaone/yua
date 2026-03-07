-- Add content_type and content_json to workspace_docs for block editor support
-- content_type: 'markdown' (default, existing) or 'blocks' (Tiptap JSON)
-- content_json: JSONB storing the Tiptap editor JSON state

ALTER TABLE workspace_docs
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'markdown',
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS content_html TEXT;

COMMENT ON COLUMN workspace_docs.content_type IS 'markdown | blocks';
COMMENT ON COLUMN workspace_docs.content_json IS 'Tiptap JSON doc state (blocks mode)';
COMMENT ON COLUMN workspace_docs.content_html IS 'HTML render cache (blocks mode)';

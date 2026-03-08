BEGIN;

CREATE TABLE IF NOT EXISTS platform_api_keys (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_platform_api_keys_workspace ON platform_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_platform_api_keys_hash ON platform_api_keys(key_hash);

COMMIT;

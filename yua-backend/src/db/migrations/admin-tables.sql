-- Admin Tables Migration
-- YUA Platform Admin System
-- Run: cat admin-tables.sql | psql -h 127.0.0.1 -U postgres -d yua_ai

BEGIN;

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  token_hash VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100),
  before_value JSONB,
  after_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at);

-- API credits
CREATE TABLE IF NOT EXISTS api_credits (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  balance NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_purchased NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_used NUMERIC(12,4) NOT NULL DEFAULT 0,
  last_recharged_at TIMESTAMPTZ,
  UNIQUE(api_key_id, workspace_id)
);

-- Credit transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  amount NUMERIC(12,4) NOT NULL,
  type VARCHAR(20) NOT NULL,
  model VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_key ON credit_transactions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  toss_subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  subject VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  assigned_admin_id INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_workspace ON support_tickets(workspace_id);

-- Ticket messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  sender_type VARCHAR(10) NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_ai_draft BOOLEAN NOT NULL DEFAULT false,
  approved_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id);

COMMIT;

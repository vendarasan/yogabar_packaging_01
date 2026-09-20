-- 008_pass8_platform_expansion.sql
-- Pass 8: Platform Expansion, Integrations, Reporting & External Access Schema

-- 1. Webhooks Table for Outbound Event Subscriptions
CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(128) NOT NULL,
  events JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count INT NOT NULL DEFAULT 0,
  created_by VARCHAR(128),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks (is_active);

-- 2. Webhook Deliveries Table for Event Delivery Logs, Retries & Auditing
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  webhook_id VARCHAR(64) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  attempt INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PENDING_RETRY
  error TEXT,
  request_headers JSONB DEFAULT '{}'::jsonb,
  response_body TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries (status);

-- 3. Extend Users Table with Supplier Scoping & Organization Model
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) DEFAULT 'org-yogabar-main';

-- 4. Extend Projects Table with Organization Model
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) DEFAULT 'org-yogabar-main';

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_supplier_name ON users (supplier_name);

-- 009_pass9_ai_assistant_and_intelligence.sql
-- Pass 9: Intelligent Packaging Platform & AI Assistant Activity Logging

CREATE TABLE IF NOT EXISTS ai_activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_user_id ON ai_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_action ON ai_activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_ai_activity_logs_created_at ON ai_activity_logs (created_at DESC);

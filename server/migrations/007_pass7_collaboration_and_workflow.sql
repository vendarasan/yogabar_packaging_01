-- 007_pass7_collaboration_and_workflow.sql
-- Pass 7: Advanced Workflow, Approvals, Dependencies & Collaboration Schema

-- 1. Extend projects table with ownership and structured risks
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS ownership JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risks JSONB DEFAULT '[]'::jsonb;

-- 2. Approvals Framework Table
CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL, -- ARTWORK, SPECIFICATION, KLD, VPDF, STAGE
  entity_id VARCHAR(128) NOT NULL,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
  requested_by VARCHAR(128) NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewer VARCHAR(128),
  reviewer_role VARCHAR(64),
  decision VARCHAR(32),
  decision_date TIMESTAMPTZ,
  comments TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_project_id ON approvals (project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals (status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals (entity_type, entity_id);

-- 3. Structured Tasks & Action Items Table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(64),
  assigned_to VARCHAR(128),
  assigned_role VARCHAR(64),
  due_date DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
  priority VARCHAR(32) NOT NULL DEFAULT 'Medium', -- Critical, High, Medium, Low
  created_by VARCHAR(128),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);

-- 4. Contextual Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(64) PRIMARY KEY,
  context_type VARCHAR(64) NOT NULL, -- PROJECT, MATERIAL, ARTWORK, SPECIFICATION, RISK, TASK
  context_id VARCHAR(128) NOT NULL,
  project_id VARCHAR(64),
  user_email VARCHAR(128) NOT NULL,
  user_name VARCHAR(128),
  content TEXT NOT NULL,
  mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_context ON comments (context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments (project_id);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  recipient_email VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL, -- Approval, Task, Stage, Risk, Launch, Supplier, System
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  project_id VARCHAR(64),
  material_id VARCHAR(64),
  entity_type VARCHAR(64),
  entity_id VARCHAR(128),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  priority VARCHAR(32) NOT NULL DEFAULT 'Normal', -- Urgent, High, Normal, Low
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_email, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- 6. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_email VARCHAR(128) PRIMARY KEY,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notification_categories JSONB NOT NULL DEFAULT '{"Approval":true,"Task":true,"Stage":true,"Risk":true,"Launch":true,"Supplier":true,"System":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

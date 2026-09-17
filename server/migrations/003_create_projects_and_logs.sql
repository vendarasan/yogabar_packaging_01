-- 003_create_projects_and_logs.sql
-- Packaging projects, materials specifications, activity audit logs, and settings

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(100) PRIMARY KEY,
  fg_code VARCHAR(100) DEFAULT '',
  project_name VARCHAR(255) NOT NULL,
  sku_size VARCHAR(100) DEFAULT '',
  project_type VARCHAR(100) DEFAULT 'Regular',
  project_category VARCHAR(100) DEFAULT 'NPD',
  stage VARCHAR(50) NOT NULL DEFAULT 'Brief',
  status VARCHAR(50) NOT NULL DEFAULT 'On Track',
  risk VARCHAR(50) NOT NULL DEFAULT 'Low',
  brief_date DATE,
  target_launch_date DATE,
  launch_date DATE,
  supplier VARCHAR(255) DEFAULT 'TBD',
  factory VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  milestones JSONB NOT NULL DEFAULT '{}'::jsonb,
  original_milestones JSONB NOT NULL DEFAULT '{}'::jsonb,
  crunch_plan JSONB,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects (stage);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_fg_code ON projects (fg_code);
CREATE INDEX IF NOT EXISTS idx_projects_materials_gin ON projects USING GIN (materials);

CREATE TABLE IF NOT EXISTS advance_logs (
  id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100),
  project_name VARCHAR(255),
  fg_code VARCHAR(100) DEFAULT '',
  action VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  field VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  material_name VARCHAR(255),
  from_stage VARCHAR(50),
  to_stage VARCHAR(50),
  by_user VARCHAR(255),
  by_email VARCHAR(255),
  by_role VARCHAR(50),
  by_dept VARCHAR(255),
  timestamp BIGINT NOT NULL,
  date_str VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON advance_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON advance_logs (project_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

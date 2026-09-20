-- 005_data_integrity_and_versioning.sql
-- Pass 5: Data Integrity, Audit Trail, Versioning, Document Control & Soft Deletion

-- 1. Projects: Soft deletion, audit metadata, and status history
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by JSONB;

CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects (is_deleted);

-- 2. Advance Logs: Structured Activity Event Model & Metadata
ALTER TABLE advance_logs ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE advance_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(100) DEFAULT 'project';
ALTER TABLE advance_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE advance_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_logs_entity_id ON advance_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON advance_logs (event_type);

-- 3. Spec Library: Soft deletion & version history
ALTER TABLE spec_library ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE spec_library ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE spec_library ADD COLUMN IF NOT EXISTS deleted_by JSONB;
ALTER TABLE spec_library ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE spec_library ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_spec_library_is_deleted ON spec_library (is_deleted);

-- 4. Backfill existing records safely
UPDATE advance_logs 
SET 
  event_type = COALESCE(event_type, action),
  entity = COALESCE(entity, 'project'),
  entity_id = COALESCE(entity_id, project_id)
WHERE event_type IS NULL OR entity_id IS NULL;

UPDATE projects
SET status_history = jsonb_build_array(
  jsonb_build_object(
    'from', null,
    'to', COALESCE(status, 'On Track'),
    'timestamp', EXTRACT(EPOCH FROM created_at) * 1000,
    'dateStr', to_char(created_at, 'DD-Mon-YY'),
    'user', jsonb_build_object('name', 'System', 'role', 'system'),
    'reason', 'Project initialization'
  )
)
WHERE status_history IS NULL OR status_history = '[]'::jsonb;

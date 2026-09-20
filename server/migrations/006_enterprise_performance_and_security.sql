-- 006_enterprise_performance_and_security.sql
-- High-throughput query performance indexes and enterprise query optimization

-- 1. Index on supplier for rapid procurement and vendor filtering
CREATE INDEX IF NOT EXISTS idx_projects_supplier ON projects (supplier);

-- 2. Index on target_launch_date for timeline sorting and crunch plan queries
CREATE INDEX IF NOT EXISTS idx_projects_target_launch_date ON projects (target_launch_date);

-- 3. Index on created_at for dashboard recent-project sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);

-- 4. Compound index for active projects filtered by status (frequent dashboard pattern)
CREATE INDEX IF NOT EXISTS idx_projects_status_is_deleted ON projects (is_deleted, status);

-- 5. Compound index on advance_logs for fast project-specific audit backtracking
CREATE INDEX IF NOT EXISTS idx_advance_logs_project_timestamp ON advance_logs (project_id, timestamp DESC);

-- 6. Index on spec_library category for template library lookup
CREATE INDEX IF NOT EXISTS idx_spec_library_category ON spec_library (category);

-- 004_create_spec_library.sql
-- Table to store converted packaging specifications in the Spec Library

CREATE TABLE IF NOT EXISTS spec_library (
  id VARCHAR(64) PRIMARY KEY,
  spec_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(100),
  category VARCHAR(100) DEFAULT 'generic',
  material_type VARCHAR(100),
  revision VARCHAR(50) DEFAULT '0.0',
  project_id VARCHAR(64),
  project_name VARCHAR(255),
  material_name VARCHAR(255),
  source_pdf_name VARCHAR(255),
  source_pdf_data TEXT,
  spec_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spec_library_item_code ON spec_library(item_code);
CREATE INDEX IF NOT EXISTS idx_spec_library_category ON spec_library(category);
CREATE INDEX IF NOT EXISTS idx_spec_library_created_at ON spec_library(created_at DESC);

-- 011_create_project_lifecycle_tables.sql
-- Full Project Lifecycle Schema:
-- Project creation -> project_materials -> specifications -> artworks -> project_risks

-- 1. Specifications Table
CREATE TABLE IF NOT EXISTS specifications (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id VARCHAR(64) REFERENCES project_materials(id) ON DELETE CASCADE,
  packaging_format_id VARCHAR(64) REFERENCES packaging_formats(id) ON DELETE SET NULL,
  item_code VARCHAR(100),
  artwork_code VARCHAR(100),
  doc_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'generic',
  revision VARCHAR(50) DEFAULT 'v1.0',
  version INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, CHECKED_PENDING_APPROVAL, APPROVED, REVISION_REQUESTED
  general_details JSONB DEFAULT '{}'::jsonb,
  dimensions JSONB DEFAULT '{}'::jsonb,
  parameters JSONB DEFAULT '[]'::jsonb,
  performance_tests JSONB DEFAULT '[]'::jsonb,
  quality_clauses JSONB DEFAULT '[]'::jsonb,
  governance JSONB DEFAULT '{}'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  clubbed_codes TEXT DEFAULT '',
  created_by JSONB,
  updated_by JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specs_project_id ON specifications (project_id);
CREATE INDEX IF NOT EXISTS idx_specs_material_id ON specifications (material_id);
CREATE INDEX IF NOT EXISTS idx_specs_format_id ON specifications (packaging_format_id);
CREATE INDEX IF NOT EXISTS idx_specs_item_code ON specifications (item_code);
CREATE INDEX IF NOT EXISTS idx_specs_status ON specifications (status);

-- 2. Artworks Table
CREATE TABLE IF NOT EXISTS artworks (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id VARCHAR(64) REFERENCES project_materials(id) ON DELETE CASCADE,
  specification_id VARCHAR(64) REFERENCES specifications(id) ON DELETE SET NULL,
  artwork_code VARCHAR(100) NOT NULL,
  pm_code VARCHAR(100),
  version_tag VARCHAR(32) DEFAULT 'v1',
  version_number INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'UPLOADED', -- UPLOADED, IN_REVIEW, APPROVED, REJECTED
  files JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  pantone_colors JSONB DEFAULT '["CMYK"]'::jsonb,
  dimensions VARCHAR(255) DEFAULT 'Standard',
  rejection_reason TEXT,
  approved_by JSONB,
  approved_at TIMESTAMPTZ,
  uploaded_by JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_artworks_project_id ON artworks (project_id);
CREATE INDEX IF NOT EXISTS idx_artworks_material_id ON artworks (material_id);
CREATE INDEX IF NOT EXISTS idx_artworks_spec_id ON artworks (specification_id);
CREATE INDEX IF NOT EXISTS idx_artworks_code ON artworks (artwork_code);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks (status);

-- 3. Project Risks Table
CREATE TABLE IF NOT EXISTS project_risks (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  impact VARCHAR(50) DEFAULT 'Medium',
  prob VARCHAR(50) DEFAULT 'Medium',
  level VARCHAR(50) DEFAULT 'Medium',
  mitigation TEXT DEFAULT '',
  owner VARCHAR(100) DEFAULT 'Packaging',
  status VARCHAR(50) DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risks_project_id ON project_risks (project_id);
CREATE INDEX IF NOT EXISTS idx_risks_stage ON project_risks (stage);
CREATE INDEX IF NOT EXISTS idx_risks_status ON project_risks (status);

-- 4. Backfill existing specifications, artworks, and risks
DO $$
DECLARE
  pm RECORD;
  proj RECORD;
  spec JSONB;
  aw_files JSONB;
  risk_item JSONB;
  spec_id VARCHAR(64);
  aw_id VARCHAR(64);
  risk_id VARCHAR(64);
  r_idx INT;
BEGIN
  -- 4.1 Backfill specifications from project_materials
  FOR pm IN SELECT * FROM project_materials LOOP
    spec := pm.spec_sheet;
    IF spec IS NOT NULL AND spec != '{}'::jsonb THEN
      spec_id := 'SPEC-' || pm.id;
      INSERT INTO specifications (
        id, project_id, material_id, packaging_format_id,
        item_code, artwork_code, doc_name, category, revision, version,
        status, general_details, dimensions, parameters,
        performance_tests, quality_clauses, governance, variants, clubbed_codes
      ) VALUES (
        spec_id,
        pm.project_id,
        pm.id,
        pm.packaging_format_id,
        COALESCE(spec->'docHeader'->>'itemCode', pm.pm_code, ''),
        COALESCE(spec->'docHeader'->>'artworkCode', ''),
        COALESCE(spec->'docHeader'->>'docName', pm.name || ' Specification'),
        COALESCE(spec->>'category', 'generic'),
        COALESCE(spec->'docHeader'->>'revision', 'v1.0'),
        COALESCE((spec->'governance'->>'version')::int, 1),
        COALESCE(spec->'governance'->>'status', 'DRAFT'),
        COALESCE(spec->'general', '{}'::jsonb),
        COALESCE(spec->'dimensions', '{}'::jsonb),
        COALESCE(spec->'parameters', '[]'::jsonb),
        COALESCE(spec->'performanceTests', '[]'::jsonb),
        COALESCE(spec->'qualityClauses', '[]'::jsonb),
        COALESCE(spec->'governance', '{}'::jsonb),
        COALESCE(pm.variants, '[]'::jsonb),
        COALESCE(spec->'docHeader'->>'clubbedCodes', '')
      )
      ON CONFLICT (id) DO UPDATE SET
        doc_name = EXCLUDED.doc_name,
        parameters = EXCLUDED.parameters,
        governance = EXCLUDED.governance,
        updated_at = CURRENT_TIMESTAMP;
    END IF;

    -- 4.2 Backfill artworks from project_materials
    IF (pm.artwork_url IS NOT NULL AND pm.artwork_url != '') OR 
       (spec IS NOT NULL AND spec->'artworkFiles' IS NOT NULL AND jsonb_array_length(spec->'artworkFiles') > 0) THEN
      
      aw_id := 'AW-' || pm.id;
      IF spec IS NOT NULL AND spec->'artworkFiles' IS NOT NULL THEN
        aw_files := spec->'artworkFiles';
      ELSE
        aw_files := jsonb_build_array(jsonb_build_object('name', COALESCE(pm.artwork_file_name, 'Artwork File'), 'url', pm.artwork_url, 'uploadedAt', CURRENT_TIMESTAMP));
      END IF;

      INSERT INTO artworks (
        id, project_id, material_id, specification_id,
        artwork_code, pm_code, version_tag, version_number,
        status, files, variants
      ) VALUES (
        aw_id,
        pm.project_id,
        pm.id,
        'SPEC-' || pm.id,
        COALESCE(spec->'docHeader'->>'artworkCode', 'AW-' || pm.pm_code),
        pm.pm_code,
        'v1',
        1,
        'UPLOADED',
        aw_files,
        COALESCE(pm.variants, '[]'::jsonb)
      )
      ON CONFLICT (id) DO UPDATE SET
        files = EXCLUDED.files,
        updated_at = CURRENT_TIMESTAMP;
    END IF;
  END LOOP;

  -- 4.3 Backfill project risks from projects
  FOR proj IN SELECT id, risks FROM projects WHERE risks IS NOT NULL AND jsonb_array_length(risks) > 0 LOOP
    r_idx := 1;
    FOR risk_item IN SELECT * FROM jsonb_array_elements(proj.risks) LOOP
      risk_id := COALESCE(risk_item->>'id', proj.id || '-R-' || r_idx);
      INSERT INTO project_risks (
        id, project_id, stage, description, impact, prob, level, mitigation, owner, status
      ) VALUES (
        risk_id,
        proj.id,
        COALESCE(risk_item->>'stage', 'Brief'),
        COALESCE(risk_item->>'desc', risk_item->>'description', 'Risk Item'),
        COALESCE(risk_item->>'impact', 'Medium'),
        COALESCE(risk_item->>'prob', 'Medium'),
        COALESCE(risk_item->>'level', 'Medium'),
        COALESCE(risk_item->>'mitigation', ''),
        COALESCE(risk_item->>'owner', 'Packaging'),
        COALESCE(risk_item->>'status', 'Open')
      )
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        mitigation = EXCLUDED.mitigation,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
      r_idx := r_idx + 1;
    END LOOP;
  END LOOP;
END $$;

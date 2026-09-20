-- 010_create_packaging_formats.sql
-- Store Packaging Formats in PostgreSQL with reference IDs and relational mapping to materials

-- 1. Packaging Formats Master Table
CREATE TABLE IF NOT EXISTS packaging_formats (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code_prefix VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  hierarchy_tier INT NOT NULL DEFAULT 1,
  default_lead_time_days INT NOT NULL DEFAULT 15,
  is_pouch BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pkg_formats_name ON packaging_formats (name);
CREATE INDEX IF NOT EXISTS idx_pkg_formats_tier ON packaging_formats (hierarchy_tier);
CREATE INDEX IF NOT EXISTS idx_pkg_formats_is_active ON packaging_formats (is_active);

-- 2. Seed Master Packaging Formats
INSERT INTO packaging_formats (id, name, code_prefix, category, hierarchy_tier, default_lead_time_days, is_pouch, description)
VALUES
  ('PF-01', 'PET Bottle', 'PM/PR/PJR/', 'Primary Container', 1, 30, FALSE, 'Polyethylene terephthalate rigid bottle'),
  ('PF-02', 'HDPE Bottle', 'PM/PR/PJR/', 'Primary Container', 1, 30, FALSE, 'High-density polyethylene rigid bottle'),
  ('PF-03', 'Glass Bottle', 'PM/PR/GJR/', 'Primary Container', 1, 30, FALSE, 'Moulded or tubular glass bottle/jar'),
  ('PF-04', 'Flexible Pouch', 'PM/PR/POU/', 'Primary Container', 1, 21, TRUE, 'Multi-layer barrier flexible film pouch'),
  ('PF-05', 'Stand-up Pouch', 'PM/PR/POU/', 'Primary Container', 1, 21, TRUE, 'Doypack / stand-up barrier pouch with zipper/gusset'),
  ('PF-06', 'Sachet / Stick Pack', 'PM/PR/POU/', 'Primary Container', 1, 21, TRUE, 'Single-serve portion flexible stick pack or sachet'),
  ('PF-07', 'Monocarton', 'PM/SE/MON/', 'Secondary Box', 4, 15, FALSE, 'Folding paperboard monocarton retail box'),
  ('PF-08', 'Eflute', 'PM/SE/EFL/', 'Secondary Box', 4, 15, FALSE, 'E-flute micro-corrugated retail carton'),
  ('PF-09', 'Rigid Carton Box', 'PM/SE/KAP/', 'Secondary Box', 4, 30, FALSE, 'Rigid gift box or kappa board luxury carton'),
  ('PF-10', 'Corrugated Shipper', 'PM/SE/OCA/', 'Tertiary Shipper', 5, 10, FALSE, 'Outer corrugated transport case / master carton'),
  ('PF-11', 'Paper Label', 'PM/SE/LBL/', 'Primary Label', 3, 20, FALSE, 'Wet-glue or self-adhesive paper label'),
  ('PF-12', 'PP Label', 'PM/SE/LBL/', 'Primary Label', 3, 20, FALSE, 'Polypropylene synthetic film self-adhesive label'),
  ('PF-13', 'Shrink Sleeve', 'PM/SE/SHR/', 'Primary Label', 3, 20, FALSE, 'Full-body or tamper-evident heat-shrink PVC/PET sleeve'),
  ('PF-14', 'In-Mould Label', 'PM/SE/IML/', 'Primary Label', 3, 30, FALSE, 'In-mould decorative label for injection moulding'),
  ('PF-15', 'Cap / Closure', 'PM/PR/CAP/', 'Primary Closure', 2, 30, FALSE, 'Screw cap, flip-top cap, or child-resistant closure'),
  ('PF-16', 'Pump Dispenser', 'PM/PR/PUM/', 'Primary Closure', 2, 30, FALSE, 'Lotion pump, mist sprayer, or trigger dispenser'),
  ('PF-17', 'Liner / Foil Seal', 'PM/PR/FOI/', 'Primary Closure', 2, 20, FALSE, 'Induction heat seal liner or pressure-sensitive foil wad'),
  ('PF-18', 'Laminated Tube', 'PM/PR/TUB/', 'Primary Container', 1, 45, FALSE, 'ABL or PBL barrier laminated squeeze tube'),
  ('PF-19', 'Aluminium/Tin Can', 'PM/PR/TIN/', 'Primary Container', 1, 30, FALSE, 'Food-grade aluminium can or tinplate container'),
  ('PF-20', 'Aerosol Can', 'PM/PR/AER/', 'Primary Container', 1, 45, FALSE, 'Pressurized metal aerosol canister'),
  ('PF-21', 'Thermoform Tray', 'PM/PR/TRA/', 'Primary Container', 1, 25, FALSE, 'Thermoformed plastic blister tray or insert'),
  ('PF-22', 'Blister Pack', 'PM/PR/BLI/', 'Primary Container', 1, 25, FALSE, 'Push-through or peelable blister card with lidding foil'),
  ('PF-23', 'Insert / Leaflet', 'PM/PR/LEA/', 'Secondary Box', 4, 10, FALSE, 'Patient or consumer information folded leaflet / outsert'),
  ('PF-24', 'Other', 'PM/PR/GEN/', 'Ancillary Pack', 6, 15, FALSE, 'Specialized or ancillary packaging component')
ON CONFLICT (name) DO UPDATE SET
  code_prefix = EXCLUDED.code_prefix,
  category = EXCLUDED.category,
  hierarchy_tier = EXCLUDED.hierarchy_tier,
  default_lead_time_days = EXCLUDED.default_lead_time_days,
  is_pouch = EXCLUDED.is_pouch,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Relational Project Materials Table
CREATE TABLE IF NOT EXISTS project_materials (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  packaging_format_id VARCHAR(64) REFERENCES packaging_formats(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  pm_code VARCHAR(100),
  material_type VARCHAR(100),
  print_type VARCHAR(100),
  brief_date DATE,
  lead_time_days INT,
  supplier VARCHAR(255),
  custom_lead_time INT,
  po_status VARCHAR(100),
  po_number VARCHAR(100),
  specs JSONB DEFAULT '{}'::jsonb,
  spec_sheet JSONB,
  artwork_url TEXT,
  artwork_file_name VARCHAR(255),
  variants JSONB DEFAULT '[]'::jsonb,
  stage VARCHAR(50) DEFAULT 'Brief',
  milestones JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proj_mat_project_id ON project_materials (project_id);
CREATE INDEX IF NOT EXISTS idx_proj_mat_format_id ON project_materials (packaging_format_id);
CREATE INDEX IF NOT EXISTS idx_proj_mat_pm_code ON project_materials (pm_code);
CREATE INDEX IF NOT EXISTS idx_proj_mat_stage ON project_materials (stage);

-- 4. Backfill existing projects.materials with packaging_format_id
DO $$
DECLARE
  proj RECORD;
  mat JSONB;
  mat_idx INT;
  fmt_id VARCHAR(64);
  mat_name TEXT;
  mat_type TEXT;
  mat_pm TEXT;
  mat_print TEXT;
  mat_supplier TEXT;
  mat_id VARCHAR(64);
  updated_mats JSONB;
BEGIN
  FOR proj IN SELECT id, materials FROM projects WHERE materials IS NOT NULL AND jsonb_array_length(materials) > 0 LOOP
    updated_mats := '[]'::jsonb;
    mat_idx := 0;
    
    FOR mat IN SELECT * FROM jsonb_array_elements(proj.materials) LOOP
      mat_type := COALESCE(mat->>'type', mat->>'materialType', 'Other');
      
      -- Find matching format ID from packaging_formats
      SELECT id INTO fmt_id FROM packaging_formats WHERE LOWER(name) = LOWER(mat_type) LIMIT 1;
      IF fmt_id IS NULL THEN
        fmt_id := 'PF-24'; -- Fallback to 'Other'
      END IF;
      
      mat_id := COALESCE(mat->>'id', proj.id || '-mat-' || mat_idx);
      mat_name := COALESCE(mat->>'name', 'Component ' || (mat_idx + 1));
      mat_pm := COALESCE(mat->>'pmCode', '');
      mat_print := COALESCE(mat->>'printType', 'Not Applicable');
      mat_supplier := COALESCE(mat->>'supplier', '');
      
      -- Update material JSON with packaging_format_id
      mat := jsonb_set(mat, '{packaging_format_id}', to_jsonb(fmt_id), true);
      mat := jsonb_set(mat, '{packagingFormatId}', to_jsonb(fmt_id), true);
      mat := jsonb_set(mat, '{id}', to_jsonb(mat_id), true);
      updated_mats := updated_mats || jsonb_build_array(mat);
      
      -- Upsert into project_materials
      INSERT INTO project_materials (
        id, project_id, packaging_format_id, name, pm_code, material_type,
        print_type, supplier, specs, spec_sheet, artwork_url, artwork_file_name,
        variants, stage, milestones
      ) VALUES (
        mat_id,
        proj.id,
        fmt_id,
        mat_name,
        mat_pm,
        mat_type,
        mat_print,
        mat_supplier,
        COALESCE(mat->'specs', '{}'::jsonb),
        mat->'specSheet',
        mat->>'artworkUrl',
        mat->>'artworkFileName',
        COALESCE(mat->'variants', '[]'::jsonb),
        COALESCE(mat->>'stage', 'Brief'),
        COALESCE(mat->'milestones', '{}'::jsonb)
      )
      ON CONFLICT (id) DO UPDATE SET
        packaging_format_id = EXCLUDED.packaging_format_id,
        name = EXCLUDED.name,
        pm_code = EXCLUDED.pm_code,
        material_type = EXCLUDED.material_type,
        print_type = EXCLUDED.print_type,
        supplier = EXCLUDED.supplier,
        updated_at = CURRENT_TIMESTAMP;
        
      mat_idx := mat_idx + 1;
    END LOOP;
    
    -- Update the project with updated materials JSONB
    UPDATE projects SET materials = updated_mats WHERE id = proj.id;
  END LOOP;
END $$;

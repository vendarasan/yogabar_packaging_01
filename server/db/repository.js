const { query } = require('./index');

function formatDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d);
}

function dbRowToProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    fgCode: row.fg_code || '',
    projectName: row.project_name || '',
    skuSize: row.sku_size || '',
    grammage: row.sku_size || '',
    projectType: row.project_type || 'Regular',
    projectCategory: row.project_category || 'NPD',
    stage: row.stage || 'Brief',
    status: row.status || 'On Track',
    risk: row.risk || 'Low',
    briefDate: formatDateStr(row.brief_date),
    targetLaunchDate: formatDateStr(row.target_launch_date),
    launchDate: formatDateStr(row.launch_date),
    supplier: row.supplier || 'TBD',
    factory: row.factory || '',
    description: row.description || '',
    comments: row.comments || '',
    milestones: row.milestones || {},
    originalMilestones: row.original_milestones || {},
    crunchPlan: row.crunch_plan || null,
    materials: Array.isArray(row.materials) ? row.materials : [],
    stageHistory: Array.isArray(row.stage_history) ? row.stage_history : [],
    auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── Projects Repository ─────────────────────────────────────────────
const ProjectsRepo = {
  async getAll() {
    const res = await query('SELECT * FROM projects ORDER BY created_at DESC');
    return res.rows.map(dbRowToProject);
  },

  async getById(id) {
    const res = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return dbRowToProject(res.rows[0]);
  },

  async create(p) {
    const res = await query(`
      INSERT INTO projects (
        id, fg_code, project_name, sku_size, project_type, project_category,
        stage, status, risk, brief_date, target_launch_date, launch_date,
        supplier, factory, description, comments,
        milestones, original_milestones, crunch_plan,
        materials, stage_history, audit_trail
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22
      )
      RETURNING *
    `, [
      p.id,
      p.fgCode || '',
      p.projectName,
      p.skuSize || p.grammage || '',
      p.projectType || 'Regular',
      p.projectCategory || 'NPD',
      p.stage || 'Brief',
      p.status || 'On Track',
      p.risk || 'Low',
      p.briefDate || null,
      p.targetLaunchDate || null,
      p.launchDate || null,
      p.supplier || 'TBD',
      p.factory || '',
      p.description || '',
      p.comments || '',
      JSON.stringify(p.milestones || {}),
      JSON.stringify(p.originalMilestones || {}),
      p.crunchPlan ? JSON.stringify(p.crunchPlan) : null,
      JSON.stringify(p.materials || []),
      JSON.stringify(p.stageHistory || []),
      JSON.stringify(p.auditTrail || [])
    ]);

    return dbRowToProject(res.rows[0]);
  },

  async update(id, p) {
    const res = await query(`
      UPDATE projects SET
        fg_code = $2,
        project_name = $3,
        sku_size = $4,
        project_type = $5,
        project_category = $6,
        stage = $7,
        status = $8,
        risk = $9,
        brief_date = $10,
        target_launch_date = $11,
        launch_date = $12,
        supplier = $13,
        factory = $14,
        description = $15,
        comments = $16,
        milestones = $17,
        original_milestones = $18,
        crunch_plan = $19,
        materials = $20,
        stage_history = $21,
        audit_trail = $22,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
      p.fgCode || '',
      p.projectName,
      p.skuSize || p.grammage || '',
      p.projectType || 'Regular',
      p.projectCategory || 'NPD',
      p.stage || 'Brief',
      p.status || 'On Track',
      p.risk || 'Low',
      p.briefDate || null,
      p.targetLaunchDate || null,
      p.launchDate || null,
      p.supplier || 'TBD',
      p.factory || '',
      p.description || '',
      p.comments || '',
      JSON.stringify(p.milestones || {}),
      JSON.stringify(p.originalMilestones || {}),
      p.crunchPlan ? JSON.stringify(p.crunchPlan) : null,
      JSON.stringify(p.materials || []),
      JSON.stringify(p.stageHistory || []),
      JSON.stringify(p.auditTrail || [])
    ]);

    if (!res.rows.length) return null;
    return dbRowToProject(res.rows[0]);
  },

  async delete(id) {
    const res = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  },

  async getNextId() {
    // Atomic increment of project sequence in app_settings
    const res = await query(`
      INSERT INTO app_settings (key, value)
      VALUES ('project_counter', '2'::jsonb)
      ON CONFLICT (key) DO UPDATE
      SET value = to_jsonb(COALESCE((app_settings.value #>> '{}')::int, 1) + 1),
          updated_at = CURRENT_TIMESTAMP
      RETURNING value
    `);
    const nextVal = parseInt(res.rows[0].value, 10) - 1;
    return 'PRJ-' + String(Math.max(1, nextVal)).padStart(3, '0');
  }
};

// ── Users Repository ────────────────────────────────────────────────
const UsersRepo = {
  async getAll() {
    const res = await query('SELECT * FROM users ORDER BY name ASC');
    const map = {};
    res.rows.forEach(r => {
      map[r.email] = {
        name: r.name,
        role: r.role,
        title: r.title || '',
        team: r.team || '',
        department: r.department || '',
        mobile: r.mobile || '',
        avatar: r.avatar || '',
        color: r.color,
        passwordHash: r.password_hash,
        mustChangePw: r.must_change_pw,
        tempPw: r.temp_pw
      };
    });
    return map;
  },

  async getByEmail(email) {
    if (!email) return null;
    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      email: r.email,
      name: r.name,
      role: r.role,
      title: r.title || '',
      team: r.team || '',
      department: r.department || '',
      mobile: r.mobile || '',
      avatar: r.avatar || '',
      color: r.color,
      passwordHash: r.password_hash,
      mustChangePw: r.must_change_pw,
      tempPw: r.temp_pw,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async create(u) {
    const res = await query(`
      INSERT INTO users (
        email, name, role, title, team, department, mobile, avatar, color, password_hash, must_change_pw, temp_pw
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      u.email.toLowerCase().trim(),
      u.name,
      u.role || 'updater',
      u.title || '',
      u.team || '',
      u.department || '',
      u.mobile || '',
      u.avatar || '',
      u.color || '#00bfa5',
      u.passwordHash,
      !!u.mustChangePw,
      u.tempPw || null
    ]);
    return res.rows[0];
  },

  async update(email, u) {
    const fields = [];
    const vals = [email.toLowerCase().trim()];
    let idx = 2;

    if (u.name !== undefined) { fields.push(`name = $${idx++}`); vals.push(u.name); }
    if (u.role !== undefined) { fields.push(`role = $${idx++}`); vals.push(u.role); }
    if (u.title !== undefined) { fields.push(`title = $${idx++}`); vals.push(u.title); }
    if (u.team !== undefined) { fields.push(`team = $${idx++}`); vals.push(u.team); }
    if (u.department !== undefined) { fields.push(`department = $${idx++}`); vals.push(u.department); }
    if (u.mobile !== undefined) { fields.push(`mobile = $${idx++}`); vals.push(u.mobile); }
    if (u.avatar !== undefined) { fields.push(`avatar = $${idx++}`); vals.push(u.avatar); }
    if (u.color !== undefined) { fields.push(`color = $${idx++}`); vals.push(u.color); }
    if (u.passwordHash !== undefined) { fields.push(`password_hash = $${idx++}`); vals.push(u.passwordHash); }
    if (u.mustChangePw !== undefined) { fields.push(`must_change_pw = $${idx++}`); vals.push(u.mustChangePw); }
    if (u.tempPw !== undefined) { fields.push(`temp_pw = $${idx++}`); vals.push(u.tempPw); }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const res = await query(`
      UPDATE users SET ${fields.join(', ')}
      WHERE LOWER(email) = $1
      RETURNING *
    `, vals);

    return res.rows[0];
  },

  async delete(email) {
    const res = await query('DELETE FROM users WHERE LOWER(email) = LOWER($1) RETURNING email', [email.trim()]);
    return res.rowCount > 0;
  }
};

// ── Sessions Repository ─────────────────────────────────────────────
const SessionsRepo = {
  async get(token) {
    if (!token) return null;
    const res = await query('SELECT user_email FROM sessions WHERE token = $1', [token]);
    return res.rows.length ? res.rows[0].user_email : null;
  },

  async create(token, email, expiresAt = null) {
    await query(`
      INSERT INTO sessions (token, user_email, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO UPDATE SET user_email = EXCLUDED.user_email, expires_at = EXCLUDED.expires_at
    `, [token, email.toLowerCase().trim(), expiresAt]);
  },

  async delete(token) {
    if (!token) return;
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  },

  async deleteByUser(email) {
    if (!email) return;
    await query('DELETE FROM sessions WHERE LOWER(user_email) = LOWER($1)', [email.trim()]);
  }
};

// ── Logs Repository ─────────────────────────────────────────────────
const LogsRepo = {
  async getAll(limit = 1000) {
    const res = await query('SELECT * FROM advance_logs ORDER BY timestamp DESC LIMIT $1', [limit]);
    return res.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      fgCode: r.fg_code,
      action: r.action,
      title: r.title,
      details: r.details,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      materialName: r.material_name,
      from: r.from_stage,
      to: r.to_stage,
      by: r.by_user,
      byEmail: r.by_email,
      byRole: r.by_role,
      byDept: r.by_dept,
      timestamp: Number(r.timestamp),
      dateStr: r.date_str
    }));
  },

  async add(entry) {
    await query(`
      INSERT INTO advance_logs (
        id, project_id, project_name, fg_code, action, title, details,
        field, old_value, new_value, material_name, from_stage, to_stage,
        by_user, by_email, by_role, by_dept, timestamp, date_str
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19
      )
    `, [
      entry.id,
      entry.projectId || null,
      entry.projectName || '',
      entry.fgCode || '',
      entry.action || 'UPDATE',
      entry.title || '',
      entry.details || '',
      entry.field || null,
      entry.oldValue !== undefined ? String(entry.oldValue) : null,
      entry.newValue !== undefined ? String(entry.newValue) : null,
      entry.materialName || null,
      entry.from || null,
      entry.to || null,
      entry.by || 'System',
      entry.byEmail || '',
      entry.byRole || 'updater',
      entry.byDept || '',
      entry.timestamp || Date.now(),
      entry.dateStr || ''
    ]);
  },

  async getSeenAt(email) {
    const key = `seen_${email.toLowerCase().trim()}`;
    const res = await query('SELECT value FROM app_settings WHERE key = $1', [key]);
    if (!res.rows.length) return 0;
    return Number(res.rows[0].value) || 0;
  },

  async setSeenAt(email, timestamp) {
    const key = `seen_${email.toLowerCase().trim()}`;
    await query(`
      INSERT INTO app_settings (key, value)
      VALUES ($1, to_jsonb($2::bigint))
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [key, timestamp]);
  }
};

function dbRowToSpec(row) {
  if (!row) return null;
  return {
    id: row.id,
    specName: row.spec_name,
    itemCode: row.item_code || '',
    category: row.category || 'generic',
    materialType: row.material_type || '',
    revision: row.revision || '0.0',
    projectId: row.project_id || null,
    projectName: row.project_name || '',
    materialName: row.material_name || '',
    sourcePdfName: row.source_pdf_name || '',
    sourcePdfData: row.source_pdf_data || null,
    specData: row.spec_data || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── Spec Library Repository ─────────────────────────────────────────
const SpecLibraryRepo = {
  async getAll() {
    const res = await query('SELECT * FROM spec_library ORDER BY created_at DESC');
    return res.rows.map(dbRowToSpec);
  },

  async getById(id) {
    const res = await query('SELECT * FROM spec_library WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return dbRowToSpec(res.rows[0]);
  },

  async create(s) {
    const res = await query(`
      INSERT INTO spec_library (
        id, spec_name, item_code, category, material_type, revision,
        project_id, project_name, material_name,
        source_pdf_name, source_pdf_data, spec_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      s.id,
      s.specName,
      s.itemCode || '',
      s.category || 'generic',
      s.materialType || '',
      s.revision || '0.0',
      s.projectId || null,
      s.projectName || '',
      s.materialName || '',
      s.sourcePdfName || '',
      s.sourcePdfData || null,
      JSON.stringify(s.specData || {})
    ]);
    return dbRowToSpec(res.rows[0]);
  },

  async update(id, s) {
    const res = await query(`
      UPDATE spec_library SET
        spec_name = $2,
        item_code = $3,
        category = $4,
        material_type = $5,
        revision = $6,
        project_id = $7,
        project_name = $8,
        material_name = $9,
        source_pdf_name = $10,
        source_pdf_data = COALESCE($11, source_pdf_data),
        spec_data = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
      s.specName,
      s.itemCode || '',
      s.category || 'generic',
      s.materialType || '',
      s.revision || '0.0',
      s.projectId || null,
      s.projectName || '',
      s.materialName || '',
      s.sourcePdfName || '',
      s.sourcePdfData || null,
      JSON.stringify(s.specData || {})
    ]);
    if (!res.rows.length) return null;
    return dbRowToSpec(res.rows[0]);
  },

  async delete(id) {
    const res = await query('DELETE FROM spec_library WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
};

module.exports = {
  ProjectsRepo,
  UsersRepo,
  SessionsRepo,
  LogsRepo,
  SpecLibraryRepo
};


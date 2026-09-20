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
    ownership: (row.ownership && typeof row.ownership === 'object') ? row.ownership : {},
    risks: Array.isArray(row.risks) ? row.risks : [],
    organizationId: row.organization_id || 'org-yogabar-main',
    stageHistory: Array.isArray(row.stage_history) ? row.stage_history : [],
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
    auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : [],
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    deletedBy: row.deleted_by || null,
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── Projects Repository ─────────────────────────────────────────────
const ProjectsRepo = {
  async getAll(includeDeleted = false) {
    const sql = includeDeleted
      ? 'SELECT * FROM projects ORDER BY created_at DESC'
      : 'SELECT * FROM projects WHERE is_deleted = FALSE ORDER BY created_at DESC';
    const res = await query(sql);
    return res.rows.map(dbRowToProject);
  },

  async getById(id, includeDeleted = false) {
    const sql = includeDeleted
      ? 'SELECT * FROM projects WHERE id = $1'
      : 'SELECT * FROM projects WHERE id = $1 AND is_deleted = FALSE';
    const res = await query(sql, [id]);
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
        materials, stage_history, status_history, audit_trail,
        ownership, risks,
        is_deleted, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28
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
      JSON.stringify(p.statusHistory || []),
      JSON.stringify(p.auditTrail || []),
      JSON.stringify(p.ownership || {}),
      JSON.stringify(p.risks || []),
      Boolean(p.isDeleted),
      p.createdBy ? JSON.stringify(p.createdBy) : null,
      p.updatedBy ? JSON.stringify(p.updatedBy) : null
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
        status_history = $22,
        audit_trail = $23,
        ownership = $24,
        risks = $25,
        is_deleted = $26,
        deleted_at = $27,
        deleted_by = $28,
        updated_by = $29,
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
      JSON.stringify(p.statusHistory || []),
      JSON.stringify(p.auditTrail || []),
      JSON.stringify(p.ownership || {}),
      JSON.stringify(p.risks || []),
      Boolean(p.isDeleted),
      p.deletedAt || null,
      p.deletedBy ? JSON.stringify(p.deletedBy) : null,
      p.updatedBy ? JSON.stringify(p.updatedBy) : null
    ]);

    if (!res.rows.length) return null;
    return dbRowToProject(res.rows[0]);
  },

  async softDelete(id, user = null) {
    const deletedBy = user ? JSON.stringify({ name: user.name, email: user.email, role: user.role }) : null;
    const res = await query(`
      UPDATE projects SET
        is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, deletedBy]);
    if (!res.rows.length) return null;
    return dbRowToProject(res.rows[0]);
  },

  async restore(id) {
    const res = await query(`
      UPDATE projects SET
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
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
        tempPw: r.temp_pw,
        supplierName: r.supplier_name || null,
        organizationId: r.organization_id || 'org-yogabar-main'
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
      supplierName: r.supplier_name || null,
      organizationId: r.organization_id || 'org-yogabar-main',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async create(u) {
    const res = await query(`
      INSERT INTO users (
        email, name, role, title, team, department, mobile, avatar, color, password_hash, must_change_pw, temp_pw, supplier_name, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      u.tempPw || null,
      u.supplierName || null,
      u.organizationId || 'org-yogabar-main'
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
    if (u.supplierName !== undefined) { fields.push(`supplier_name = $${idx++}`); vals.push(u.supplierName); }
    if (u.organizationId !== undefined) { fields.push(`organization_id = $${idx++}`); vals.push(u.organizationId); }

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
      eventType: r.event_type || r.action,
      entity: r.entity || 'project',
      entityId: r.entity_id || r.project_id,
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
      metadata: r.metadata || {},
      timestamp: Number(r.timestamp),
      dateStr: r.date_str
    }));
  },

  async add(entry) {
    await query(`
      INSERT INTO advance_logs (
        id, project_id, project_name, fg_code, action, title, details,
        field, old_value, new_value, material_name, from_stage, to_stage,
        by_user, by_email, by_role, by_dept, timestamp, date_str,
        event_type, entity, entity_id, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23
      )
    `, [
      entry.id,
      entry.projectId || null,
      entry.projectName || '',
      entry.fgCode || '',
      entry.action || entry.eventType || 'UPDATE',
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
      entry.dateStr || '',
      entry.eventType || entry.action || 'UPDATE',
      entry.entity || 'project',
      entry.entityId || entry.projectId || null,
      JSON.stringify(entry.metadata || {})
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

// ── Pass 7: Row Mappers & Repositories ────────────────────────────────

function dbRowToApproval(row) {
  if (!row) return null;
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    materialId: row.material_id,
    title: row.title,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    reviewer: row.reviewer,
    reviewerRole: row.reviewer_role,
    decision: row.decision,
    decisionDate: row.decision_date,
    comments: row.comments,
    history: Array.isArray(row.history) ? row.history : [],
    metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const ApprovalsRepo = {
  async getAll({ projectId, status, entityType } = {}) {
    let sql = 'SELECT * FROM approvals WHERE 1=1';
    const params = [];
    if (projectId) {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (entityType) {
      params.push(entityType);
      sql += ` AND entity_type = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(dbRowToApproval);
  },

  async getById(id) {
    const res = await query('SELECT * FROM approvals WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return dbRowToApproval(res.rows[0]);
  },

  async create(app) {
    const res = await query(`
      INSERT INTO approvals (
        id, entity_type, entity_id, project_id, material_id, title,
        status, requested_by, requested_at, reviewer, reviewer_role,
        decision, decision_date, comments, history, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16
      )
      RETURNING *
    `, [
      app.id,
      app.entityType,
      app.entityId,
      app.projectId,
      app.materialId || null,
      app.title,
      app.status || 'PENDING',
      app.requestedBy,
      app.requestedAt || new Date(),
      app.reviewer || null,
      app.reviewerRole || null,
      app.decision || null,
      app.decisionDate || null,
      app.comments || null,
      JSON.stringify(app.history || []),
      JSON.stringify(app.metadata || {})
    ]);
    return dbRowToApproval(res.rows[0]);
  },

  async update(id, app) {
    const res = await query(`
      UPDATE approvals SET
        status = $2,
        reviewer = $3,
        reviewer_role = $4,
        decision = $5,
        decision_date = $6,
        comments = $7,
        history = $8,
        metadata = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
      app.status,
      app.reviewer || null,
      app.reviewerRole || null,
      app.decision || null,
      app.decisionDate || null,
      app.comments || null,
      JSON.stringify(app.history || []),
      JSON.stringify(app.metadata || {})
    ]);
    if (!res.rows.length) return null;
    return dbRowToApproval(res.rows[0]);
  },

  async delete(id) {
    const res = await query('DELETE FROM approvals WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
};

function dbRowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    materialId: row.material_id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    assignedTo: row.assigned_to,
    assignedRole: row.assigned_role,
    dueDate: formatDateStr(row.due_date),
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    completedAt: row.completed_at,
    metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const TasksRepo = {
  async getAll({ projectId, status, assignedTo, stage } = {}) {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    if (projectId) {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (assignedTo) {
      params.push(assignedTo);
      sql += ` AND assigned_to = $${params.length}`;
    }
    if (stage) {
      params.push(stage);
      sql += ` AND stage = $${params.length}`;
    }
    sql += ' ORDER BY due_date ASC NULLS LAST, created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(dbRowToTask);
  },

  async getById(id) {
    const res = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return dbRowToTask(res.rows[0]);
  },

  async create(task) {
    const res = await query(`
      INSERT INTO tasks (
        id, project_id, material_id, title, description,
        stage, assigned_to, assigned_role, due_date,
        status, priority, created_by, completed_at, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14
      )
      RETURNING *
    `, [
      task.id,
      task.projectId,
      task.materialId || null,
      task.title,
      task.description || '',
      task.stage || null,
      task.assignedTo || null,
      task.assignedRole || null,
      task.dueDate || null,
      task.status || 'PENDING',
      task.priority || 'Medium',
      task.createdBy || null,
      task.completedAt || null,
      JSON.stringify(task.metadata || {})
    ]);
    return dbRowToTask(res.rows[0]);
  },

  async update(id, task) {
    const res = await query(`
      UPDATE tasks SET
        title = $2,
        description = $3,
        stage = $4,
        assigned_to = $5,
        assigned_role = $6,
        due_date = $7,
        status = $8,
        priority = $9,
        completed_at = $10,
        metadata = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
      task.title,
      task.description || '',
      task.stage || null,
      task.assignedTo || null,
      task.assignedRole || null,
      task.dueDate || null,
      task.status || 'PENDING',
      task.priority || 'Medium',
      task.completedAt || null,
      JSON.stringify(task.metadata || {})
    ]);
    if (!res.rows.length) return null;
    return dbRowToTask(res.rows[0]);
  },

  async delete(id) {
    const res = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
};

function dbRowToComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    contextType: row.context_type,
    contextId: row.context_id,
    projectId: row.project_id,
    userEmail: row.user_email,
    userName: row.user_name,
    content: row.content,
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const CommentsRepo = {
  async getAll({ contextType, contextId, projectId } = {}) {
    let sql = 'SELECT * FROM comments WHERE 1=1';
    const params = [];
    if (contextType && contextId) {
      params.push(contextType, contextId);
      sql += ` AND context_type = $${params.length - 1} AND context_id = $${params.length}`;
    } else if (projectId) {
      params.push(projectId);
      sql += ` AND project_id = $${params.length}`;
    }
    sql += ' ORDER BY created_at ASC';
    const res = await query(sql, params);
    return res.rows.map(dbRowToComment);
  },

  async create(cmt) {
    const res = await query(`
      INSERT INTO comments (
        id, context_type, context_id, project_id,
        user_email, user_name, content, mentions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      cmt.id,
      cmt.contextType,
      cmt.contextId,
      cmt.projectId || null,
      cmt.userEmail,
      cmt.userName || '',
      cmt.content,
      JSON.stringify(cmt.mentions || [])
    ]);
    return dbRowToComment(res.rows[0]);
  },

  async getById(id) {
    const res = await query('SELECT * FROM comments WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return dbRowToComment(res.rows[0]);
  },

  async delete(id) {
    const res = await query('DELETE FROM comments WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
};

function dbRowToNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipientEmail: row.recipient_email,
    category: row.category,
    title: row.title,
    message: row.message,
    projectId: row.project_id,
    materialId: row.material_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    priority: row.priority,
    createdAt: row.created_at
  };
}

const NotificationsRepo = {
  async getAll({ recipientEmail, isRead, limit = 50 } = {}) {
    let sql = 'SELECT * FROM notifications WHERE recipient_email = $1';
    const params = [recipientEmail];
    if (typeof isRead === 'boolean') {
      params.push(isRead);
      sql += ` AND is_read = $${params.length}`;
    }
    sql += ` ORDER BY created_at DESC LIMIT ${Math.min(limit, 200)}`;
    const res = await query(sql, params);
    return res.rows.map(dbRowToNotification);
  },

  async create(n) {
    const res = await query(`
      INSERT INTO notifications (
        id, recipient_email, category, title, message,
        project_id, material_id, entity_type, entity_id,
        is_read, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      n.id,
      n.recipientEmail,
      n.category || 'System',
      n.title,
      n.message,
      n.projectId || null,
      n.materialId || null,
      n.entityType || null,
      n.entityId || null,
      Boolean(n.isRead),
      n.priority || 'Normal'
    ]);
    return dbRowToNotification(res.rows[0]);
  },

  async markAsRead(id, userEmail) {
    const res = await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND recipient_email = $2
      RETURNING *
    `, [id, userEmail]);
    if (!res.rows.length) return null;
    return dbRowToNotification(res.rows[0]);
  },

  async markAllAsRead(userEmail) {
    await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE recipient_email = $1 AND is_read = FALSE
    `, [userEmail]);
    return true;
  }
};

const UserPreferencesRepo = {
  async get(userEmail) {
    const res = await query('SELECT * FROM user_preferences WHERE user_email = $1', [userEmail]);
    if (!res.rows.length) {
      return {
        userEmail,
        inAppEnabled: true,
        emailSummaryEnabled: true,
        dailySummaryEnabled: false,
        notificationCategories: {
          Approval: true,
          Task: true,
          Stage: true,
          Risk: true,
          Launch: true,
          Supplier: true,
          System: true
        }
      };
    }
    const r = res.rows[0];
    return {
      userEmail: r.user_email,
      inAppEnabled: Boolean(r.in_app_enabled),
      emailSummaryEnabled: Boolean(r.email_summary_enabled),
      dailySummaryEnabled: Boolean(r.daily_summary_enabled),
      notificationCategories: r.notification_categories || {},
      updatedAt: r.updated_at
    };
  },

  async upsert(userEmail, prefs) {
    const res = await query(`
      INSERT INTO user_preferences (
        user_email, in_app_enabled, email_summary_enabled, daily_summary_enabled,
        notification_categories, updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_email) DO UPDATE SET
        in_app_enabled = EXCLUDED.in_app_enabled,
        email_summary_enabled = EXCLUDED.email_summary_enabled,
        daily_summary_enabled = EXCLUDED.daily_summary_enabled,
        notification_categories = EXCLUDED.notification_categories,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userEmail,
      prefs.inAppEnabled !== undefined ? Boolean(prefs.inAppEnabled) : true,
      prefs.emailSummaryEnabled !== undefined ? Boolean(prefs.emailSummaryEnabled) : true,
      prefs.dailySummaryEnabled !== undefined ? Boolean(prefs.dailySummaryEnabled) : false,
      JSON.stringify(prefs.notificationCategories || {})
    ]);
    const r = res.rows[0];
    return {
      userEmail: r.user_email,
      inAppEnabled: Boolean(r.in_app_enabled),
      emailSummaryEnabled: Boolean(r.email_summary_enabled),
      dailySummaryEnabled: Boolean(r.daily_summary_enabled),
      notificationCategories: r.notification_categories || {},
      updatedAt: r.updated_at
    };
  }
};

// ── Webhooks Repository ─────────────────────────────────────────────
const WebhooksRepo = {
  async getAll() {
    const res = await query('SELECT * FROM webhooks ORDER BY created_at DESC');
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      url: r.url,
      secret: r.secret,
      events: r.events || ['*'],
      isActive: Boolean(r.is_active),
      failureCount: r.failure_count || 0,
      createdBy: r.created_by,
      metadata: r.metadata || {},
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async getById(id) {
    const res = await query('SELECT * FROM webhooks WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      url: r.url,
      secret: r.secret,
      events: r.events || ['*'],
      isActive: Boolean(r.is_active),
      failureCount: r.failure_count || 0,
      createdBy: r.created_by,
      metadata: r.metadata || {},
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async create(w) {
    const res = await query(`
      INSERT INTO webhooks (id, name, url, secret, events, is_active, failure_count, created_by, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      w.id,
      w.name,
      w.url,
      w.secret,
      JSON.stringify(w.events || ['*']),
      w.isActive !== false,
      w.failureCount || 0,
      w.createdBy || null,
      JSON.stringify(w.metadata || {})
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      url: r.url,
      secret: r.secret,
      events: r.events,
      isActive: Boolean(r.is_active),
      failureCount: r.failure_count,
      createdBy: r.created_by,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async update(id, updates) {
    const fields = [];
    const vals = [id];
    let idx = 2;
    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); vals.push(updates.name); }
    if (updates.url !== undefined) { fields.push(`url = $${idx++}`); vals.push(updates.url); }
    if (updates.secret !== undefined) { fields.push(`secret = $${idx++}`); vals.push(updates.secret); }
    if (updates.events !== undefined) { fields.push(`events = $${idx++}`); vals.push(JSON.stringify(updates.events)); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); vals.push(Boolean(updates.isActive)); }
    if (updates.failureCount !== undefined) { fields.push(`failure_count = $${idx++}`); vals.push(Number(updates.failureCount)); }
    if (updates.metadata !== undefined) { fields.push(`metadata = $${idx++}`); vals.push(JSON.stringify(updates.metadata)); }
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const res = await query(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, vals);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      url: r.url,
      secret: r.secret,
      events: r.events,
      isActive: Boolean(r.is_active),
      failureCount: r.failure_count,
      createdBy: r.created_by,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async delete(id) {
    await query('DELETE FROM webhooks WHERE id = $1', [id]);
    return true;
  }
};

// ── Webhook Deliveries Repository ───────────────────────────────────
const WebhookDeliveriesRepo = {
  async getByWebhookId(webhookId, limit = 50) {
    const res = await query(
      'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2',
      [webhookId, limit]
    );
    return res.rows.map(r => ({
      id: r.id,
      webhookId: r.webhook_id,
      eventType: r.event_type,
      payload: r.payload,
      statusCode: r.status_code,
      attempt: r.attempt,
      status: r.status,
      error: r.error,
      requestHeaders: r.request_headers,
      responseBody: r.response_body,
      durationMs: r.duration_ms,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
  },

  async getById(id) {
    const res = await query('SELECT * FROM webhook_deliveries WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      webhookId: r.webhook_id,
      eventType: r.event_type,
      payload: r.payload,
      statusCode: r.status_code,
      attempt: r.attempt,
      status: r.status,
      error: r.error,
      requestHeaders: r.request_headers,
      responseBody: r.response_body,
      durationMs: r.duration_ms,
      createdAt: r.created_at,
      completedAt: r.completed_at
    };
  },

  async create(d) {
    const res = await query(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, payload, status_code, attempt, status, error, request_headers, response_body, duration_ms, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12)
      RETURNING *
    `, [
      d.id,
      d.webhookId,
      d.eventType,
      JSON.stringify(d.payload || {}),
      d.statusCode || null,
      d.attempt || 1,
      d.status || 'SUCCESS',
      d.error || null,
      JSON.stringify(d.requestHeaders || {}),
      d.responseBody ? String(d.responseBody).slice(0, 2000) : null,
      d.durationMs || null,
      d.completedAt || new Date()
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      webhookId: r.webhook_id,
      eventType: r.event_type,
      payload: r.payload,
      statusCode: r.status_code,
      attempt: r.attempt,
      status: r.status,
      error: r.error,
      durationMs: r.duration_ms,
      createdAt: r.created_at,
      completedAt: r.completed_at
    };
  },

  async update(id, updates) {
    const fields = [];
    const vals = [id];
    let idx = 2;
    if (updates.statusCode !== undefined) { fields.push(`status_code = $${idx++}`); vals.push(updates.statusCode); }
    if (updates.attempt !== undefined) { fields.push(`attempt = $${idx++}`); vals.push(updates.attempt); }
    if (updates.status !== undefined) { fields.push(`status = $${idx++}`); vals.push(updates.status); }
    if (updates.error !== undefined) { fields.push(`error = $${idx++}`); vals.push(updates.error); }
    if (updates.responseBody !== undefined) { fields.push(`response_body = $${idx++}`); vals.push(updates.responseBody); }
    if (updates.durationMs !== undefined) { fields.push(`duration_ms = $${idx++}`); vals.push(updates.durationMs); }
    if (updates.completedAt !== undefined) { fields.push(`completed_at = $${idx++}`); vals.push(updates.completedAt); }

    const res = await query(`UPDATE webhook_deliveries SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, vals);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      webhookId: r.webhook_id,
      eventType: r.event_type,
      payload: r.payload,
      statusCode: r.status_code,
      attempt: r.attempt,
      status: r.status,
      error: r.error,
      durationMs: r.duration_ms,
      createdAt: r.created_at,
      completedAt: r.completed_at
    };
  }
};

// ── Pass 9: AI Activity Logs Repository ──────────────────────────────

function dbRowToAiActivityLog(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    evidenceSources: Array.isArray(r.evidence_sources) ? r.evidence_sources : [],
    metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata : {},
    createdAt: r.created_at
  };
}

const AiActivityLogsRepo = {
  async create(log) {
    const res = await query(`
      INSERT INTO ai_activity_logs (
        id, user_id, action, entity_type, entity_id, evidence_sources, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      log.id,
      log.userId,
      log.action,
      log.entityType || null,
      log.entityId || null,
      JSON.stringify(log.evidenceSources || []),
      JSON.stringify(log.metadata || {})
    ]);
    return dbRowToAiActivityLog(res.rows[0]);
  },

  async getByUser(userId, limit = 50) {
    const res = await query(
      'SELECT * FROM ai_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return res.rows.map(dbRowToAiActivityLog);
  },

  async getAll(limit = 100) {
    const res = await query(
      'SELECT * FROM ai_activity_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return res.rows.map(dbRowToAiActivityLog);
  }
};

const PackagingFormatsRepo = {
  async getAll(includeInactive = false) {
    const sql = includeInactive
      ? 'SELECT * FROM packaging_formats ORDER BY hierarchy_tier ASC, name ASC'
      : 'SELECT * FROM packaging_formats WHERE is_active = TRUE ORDER BY hierarchy_tier ASC, name ASC';
    const res = await query(sql);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      codePrefix: r.code_prefix,
      category: r.category,
      hierarchyTier: r.hierarchy_tier,
      defaultLeadTimeDays: r.default_lead_time_days,
      isPouch: Boolean(r.is_pouch),
      description: r.description || '',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async getById(id) {
    const res = await query('SELECT * FROM packaging_formats WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      codePrefix: r.code_prefix,
      category: r.category,
      hierarchyTier: r.hierarchy_tier,
      defaultLeadTimeDays: r.default_lead_time_days,
      isPouch: Boolean(r.is_pouch),
      description: r.description || '',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async getByName(name) {
    const res = await query('SELECT * FROM packaging_formats WHERE LOWER(name) = LOWER($1)', [name]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      codePrefix: r.code_prefix,
      category: r.category,
      hierarchyTier: r.hierarchy_tier,
      defaultLeadTimeDays: r.default_lead_time_days,
      isPouch: Boolean(r.is_pouch),
      description: r.description || '',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async create(fmt) {
    const res = await query(`
      INSERT INTO packaging_formats (
        id, name, code_prefix, category, hierarchy_tier,
        default_lead_time_days, is_pouch, description, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      fmt.id,
      fmt.name,
      fmt.codePrefix || fmt.code_prefix || 'PM/PR/GEN/',
      fmt.category || 'Ancillary Pack',
      fmt.hierarchyTier || fmt.hierarchy_tier || 1,
      fmt.defaultLeadTimeDays || fmt.default_lead_time_days || 15,
      Boolean(fmt.isPouch ?? fmt.is_pouch),
      fmt.description || '',
      fmt.isActive !== undefined ? Boolean(fmt.isActive) : true
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      codePrefix: r.code_prefix,
      category: r.category,
      hierarchyTier: r.hierarchy_tier,
      defaultLeadTimeDays: r.default_lead_time_days,
      isPouch: Boolean(r.is_pouch),
      description: r.description || '',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async update(id, fmt) {
    const res = await query(`
      UPDATE packaging_formats SET
        name = COALESCE($2, name),
        code_prefix = COALESCE($3, code_prefix),
        category = COALESCE($4, category),
        hierarchy_tier = COALESCE($5, hierarchy_tier),
        default_lead_time_days = COALESCE($6, default_lead_time_days),
        is_pouch = COALESCE($7, is_pouch),
        description = COALESCE($8, description),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
      fmt.name || null,
      fmt.codePrefix || fmt.code_prefix || null,
      fmt.category || null,
      fmt.hierarchyTier !== undefined ? fmt.hierarchyTier : (fmt.hierarchy_tier !== undefined ? fmt.hierarchy_tier : null),
      fmt.defaultLeadTimeDays !== undefined ? fmt.defaultLeadTimeDays : (fmt.default_lead_time_days !== undefined ? fmt.default_lead_time_days : null),
      fmt.isPouch !== undefined ? fmt.isPouch : (fmt.is_pouch !== undefined ? fmt.is_pouch : null),
      fmt.description !== undefined ? fmt.description : null,
      fmt.isActive !== undefined ? fmt.isActive : (fmt.is_active !== undefined ? fmt.is_active : null)
    ]);
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      codePrefix: r.code_prefix,
      category: r.category,
      hierarchyTier: r.hierarchy_tier,
      defaultLeadTimeDays: r.default_lead_time_days,
      isPouch: Boolean(r.is_pouch),
      description: r.description || '',
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async delete(id) {
    const res = await query(
      'UPDATE packaging_formats SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return res.rows.length > 0;
  }
};

const ProjectMaterialsRepo = {
  async getByProjectId(projectId) {
    const res = await query(
      'SELECT * FROM project_materials WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    return res.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      packagingFormatId: r.packaging_format_id,
      name: r.name,
      pmCode: r.pm_code || '',
      materialType: r.material_type || '',
      type: r.material_type || '',
      printType: r.print_type || 'Not Applicable',
      briefDate: formatDateStr(r.brief_date),
      leadTimeDays: r.lead_time_days,
      supplier: r.supplier || '',
      customLeadTime: r.custom_lead_time,
      poStatus: r.po_status || 'RFQ in progress',
      poNumber: r.po_number || '',
      specs: (r.specs && typeof r.specs === 'object') ? r.specs : {},
      specSheet: r.spec_sheet || null,
      artworkUrl: r.artwork_url || '',
      artworkFileName: r.artwork_file_name || '',
      variants: Array.isArray(r.variants) ? r.variants : [],
      stage: r.stage || 'Brief',
      milestones: (r.milestones && typeof r.milestones === 'object') ? r.milestones : {},
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async syncMaterialsForProject(projectId, materials = []) {
    if (!projectId || !Array.isArray(materials)) return;
    try {
      const existingRes = await query('SELECT id FROM project_materials WHERE project_id = $1', [projectId]);
      const existingIds = new Set(existingRes.rows.map(r => r.id));
      const currentIds = new Set();

      for (let idx = 0; idx < materials.length; idx++) {
        const m = materials[idx];
        const matId = m.id || `${projectId}-mat-${idx}`;
        currentIds.add(matId);

        let formatId = m.packagingFormatId || m.packaging_format_id || m.formatId;
        if (!formatId && m.type) {
          const fmtRes = await query('SELECT id FROM packaging_formats WHERE LOWER(name) = LOWER($1) LIMIT 1', [m.type]);
          if (fmtRes.rows.length) {
            formatId = fmtRes.rows[0].id;
          } else {
            formatId = 'PF-24';
          }
        }
        if (!formatId) formatId = 'PF-24';

        await query(`
          INSERT INTO project_materials (
            id, project_id, packaging_format_id, name, pm_code, material_type,
            print_type, brief_date, lead_time_days, supplier, custom_lead_time,
            po_status, po_number, specs, spec_sheet, artwork_url, artwork_file_name,
            variants, stage, milestones, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            packaging_format_id = EXCLUDED.packaging_format_id,
            name = EXCLUDED.name,
            pm_code = EXCLUDED.pm_code,
            material_type = EXCLUDED.material_type,
            print_type = EXCLUDED.print_type,
            brief_date = EXCLUDED.brief_date,
            lead_time_days = EXCLUDED.lead_time_days,
            supplier = EXCLUDED.supplier,
            custom_lead_time = EXCLUDED.custom_lead_time,
            po_status = EXCLUDED.po_status,
            po_number = EXCLUDED.po_number,
            specs = EXCLUDED.specs,
            spec_sheet = EXCLUDED.spec_sheet,
            artwork_url = EXCLUDED.artwork_url,
            artwork_file_name = EXCLUDED.artwork_file_name,
            variants = EXCLUDED.variants,
            stage = EXCLUDED.stage,
            milestones = EXCLUDED.milestones,
            updated_at = CURRENT_TIMESTAMP
        `, [
          matId,
          projectId,
          formatId,
          m.name || `Component ${idx + 1}`,
          m.pmCode || '',
          m.type || m.materialType || '',
          m.printType || 'Not Applicable',
          m.briefDate ? formatDateStr(m.briefDate) : null,
          m.leadTime || m.leadTimeDays || null,
          m.supplier || '',
          m.customLeadTime !== undefined && m.customLeadTime !== '' ? parseInt(m.customLeadTime, 10) : null,
          m.poStatus || 'RFQ in progress',
          m.poNumber || '',
          JSON.stringify(m.specs || {}),
          m.specSheet ? JSON.stringify(m.specSheet) : null,
          m.artworkUrl || '',
          m.artworkFileName || '',
          JSON.stringify(m.variants || []),
          m.stage || 'Brief',
          JSON.stringify(m.milestones || {})
        ]);
      }

      for (const oldId of existingIds) {
        if (!currentIds.has(oldId)) {
          await query('DELETE FROM project_materials WHERE id = $1', [oldId]);
        }
      }
    } catch (err) {
      console.warn(`[ProjectMaterialsRepo] Sync failed for project ${projectId}:`, err.message);
    }
  }
};

const SpecificationsRepo = {
  async getByProjectId(projectId) {
    const res = await query(
      'SELECT * FROM specifications WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    return res.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      materialId: r.material_id,
      packagingFormatId: r.packaging_format_id,
      itemCode: r.item_code,
      artworkCode: r.artwork_code,
      docName: r.doc_name,
      category: r.category,
      revision: r.revision,
      version: r.version,
      status: r.status,
      generalDetails: r.general_details || {},
      dimensions: r.dimensions || {},
      parameters: r.parameters || [],
      performanceTests: r.performance_tests || [],
      qualityClauses: r.quality_clauses || [],
      governance: r.governance || {},
      variants: r.variants || [],
      clubbedCodes: r.clubbed_codes || '',
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async getByMaterialId(materialId) {
    const res = await query(
      'SELECT * FROM specifications WHERE material_id = $1 ORDER BY version DESC LIMIT 1',
      [materialId]
    );
    if (!res.rows.length) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      materialId: r.material_id,
      packagingFormatId: r.packaging_format_id,
      itemCode: r.item_code,
      artworkCode: r.artwork_code,
      docName: r.doc_name,
      category: r.category,
      revision: r.revision,
      version: r.version,
      status: r.status,
      generalDetails: r.general_details || {},
      dimensions: r.dimensions || {},
      parameters: r.parameters || [],
      performanceTests: r.performance_tests || [],
      qualityClauses: r.quality_clauses || [],
      governance: r.governance || {},
      variants: r.variants || [],
      clubbedCodes: r.clubbed_codes || '',
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async syncForProject(projectId, materials = []) {
    if (!projectId || !Array.isArray(materials)) return;
    try {
      for (let idx = 0; idx < materials.length; idx++) {
        const m = materials[idx];
        const matId = m.id || `${projectId}-mat-${idx}`;
        const spec = m.specSheet;
        if (!spec) continue;

        const specId = `SPEC-${matId}`;
        const formatId = m.packagingFormatId || m.packaging_format_id || m.formatId || null;

        await query(`
          INSERT INTO specifications (
            id, project_id, material_id, packaging_format_id,
            item_code, artwork_code, doc_name, category, revision, version,
            status, general_details, dimensions, parameters,
            performance_tests, quality_clauses, governance, variants, clubbed_codes,
            updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17, $18, $19,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            packaging_format_id = EXCLUDED.packaging_format_id,
            item_code = EXCLUDED.item_code,
            artwork_code = EXCLUDED.artwork_code,
            doc_name = EXCLUDED.doc_name,
            category = EXCLUDED.category,
            revision = EXCLUDED.revision,
            version = EXCLUDED.version,
            status = EXCLUDED.status,
            general_details = EXCLUDED.general_details,
            dimensions = EXCLUDED.dimensions,
            parameters = EXCLUDED.parameters,
            performance_tests = EXCLUDED.performance_tests,
            quality_clauses = EXCLUDED.quality_clauses,
            governance = EXCLUDED.governance,
            variants = EXCLUDED.variants,
            clubbed_codes = EXCLUDED.clubbed_codes,
            updated_at = CURRENT_TIMESTAMP
        `, [
          specId,
          projectId,
          matId,
          formatId,
          spec.docHeader?.itemCode || m.pmCode || '',
          spec.docHeader?.artworkCode || m.artworkCode || '',
          spec.docHeader?.docName || `${m.name || 'Component'} Specification`,
          spec.category || 'generic',
          spec.docHeader?.revision || 'v1.0',
          parseInt(spec.governance?.version || 1, 10),
          spec.governance?.status || 'DRAFT',
          JSON.stringify(spec.general || {}),
          JSON.stringify(spec.dimensions || {}),
          JSON.stringify(spec.parameters || []),
          JSON.stringify(spec.performanceTests || []),
          JSON.stringify(spec.qualityClauses || []),
          JSON.stringify(spec.governance || {}),
          JSON.stringify(m.variants || spec.variants || []),
          spec.docHeader?.clubbedCodes || m.clubbedCodes || ''
        ]);
      }
    } catch (err) {
      console.warn(`[SpecificationsRepo] Sync failed for project ${projectId}:`, err.message);
    }
  }
};

const ArtworksRepo = {
  async getByProjectId(projectId) {
    const res = await query(
      'SELECT * FROM artworks WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    return res.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      materialId: r.material_id,
      specificationId: r.specification_id,
      artworkCode: r.artwork_code,
      pmCode: r.pm_code,
      versionTag: r.version_tag,
      versionNumber: r.version_number,
      status: r.status,
      files: r.files || [],
      variants: r.variants || [],
      pantoneColors: r.pantone_colors || ['CMYK'],
      dimensions: r.dimensions || 'Standard',
      rejectionReason: r.rejection_reason,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async syncForProject(projectId, materials = []) {
    if (!projectId || !Array.isArray(materials)) return;
    try {
      for (let idx = 0; idx < materials.length; idx++) {
        const m = materials[idx];
        const matId = m.id || `${projectId}-mat-${idx}`;
        const files = m.artworkFiles || (m.artworkUrl ? [{ name: m.artworkFileName || 'Artwork', url: m.artworkUrl, uploadedAt: new Date().toISOString() }] : []);
        if (!files || files.length === 0) continue;

        const awId = `AW-${matId}`;
        const specId = `SPEC-${matId}`;

        await query(`
          INSERT INTO artworks (
            id, project_id, material_id, specification_id,
            artwork_code, pm_code, version_tag, version_number,
            status, files, variants, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            artwork_code = EXCLUDED.artwork_code,
            pm_code = EXCLUDED.pm_code,
            status = EXCLUDED.status,
            files = EXCLUDED.files,
            variants = EXCLUDED.variants,
            updated_at = CURRENT_TIMESTAMP
        `, [
          awId,
          projectId,
          matId,
          specId,
          m.artworkCode || m.specSheet?.docHeader?.artworkCode || (m.pmCode ? `AW-${m.pmCode}` : 'AW-00000'),
          m.pmCode || '',
          'v1',
          1,
          'UPLOADED',
          JSON.stringify(files),
          JSON.stringify(m.variants || [])
        ]);
      }
    } catch (err) {
      console.warn(`[ArtworksRepo] Sync failed for project ${projectId}:`, err.message);
    }
  }
};

const ProjectRisksRepo = {
  async getByProjectId(projectId) {
    const res = await query(
      'SELECT * FROM project_risks WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    return res.rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      stage: r.stage,
      desc: r.description,
      description: r.description,
      impact: r.impact,
      prob: r.prob,
      level: r.level,
      mitigation: r.mitigation,
      owner: r.owner,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async syncForProject(projectId, risks = []) {
    if (!projectId || !Array.isArray(risks)) return;
    try {
      const existingRes = await query('SELECT id FROM project_risks WHERE project_id = $1', [projectId]);
      const existingIds = new Set(existingRes.rows.map(r => r.id));
      const currentIds = new Set();

      for (let idx = 0; idx < risks.length; idx++) {
        const r = risks[idx];
        const riskId = r.id || `${projectId}-R-${idx + 1}`;
        currentIds.add(riskId);

        await query(`
          INSERT INTO project_risks (
            id, project_id, stage, description, impact, prob, level, mitigation, owner, status, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            stage = EXCLUDED.stage,
            description = EXCLUDED.description,
            impact = EXCLUDED.impact,
            prob = EXCLUDED.prob,
            level = EXCLUDED.level,
            mitigation = EXCLUDED.mitigation,
            owner = EXCLUDED.owner,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          riskId,
          projectId,
          r.stage || 'Brief',
          r.desc || r.description || 'Risk item',
          r.impact || 'Medium',
          r.prob || 'Medium',
          r.level || 'Medium',
          r.mitigation || '',
          r.owner || 'Packaging',
          r.status || 'Open'
        ]);
      }

      for (const oldId of existingIds) {
        if (!currentIds.has(oldId)) {
          await query('DELETE FROM project_risks WHERE id = $1', [oldId]);
        }
      }
    } catch (err) {
      console.warn(`[ProjectRisksRepo] Sync failed for project ${projectId}:`, err.message);
    }
  }
};

module.exports = {
  ProjectsRepo,
  UsersRepo,
  SessionsRepo,
  LogsRepo,
  SpecLibraryRepo,
  ApprovalsRepo,
  TasksRepo,
  CommentsRepo,
  NotificationsRepo,
  UserPreferencesRepo,
  WebhooksRepo,
  WebhookDeliveriesRepo,
  AiActivityLogsRepo,
  PackagingFormatsRepo,
  ProjectMaterialsRepo,
  SpecificationsRepo,
  ArtworksRepo,
  ProjectRisksRepo
};



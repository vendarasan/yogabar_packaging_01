const express = require('express');
const router = express.Router();
const store = require('../store');
const { authMiddleware, requireSuperAdmin, requireAdmin, requireUpdater } = require('../middleware/auth');
const {
  today, calcMatMilestones, calcProjectMilestones,
  recalcMatMilestones, stageIdx, syncProjectStage, getArtworkCode,
  generateDefaultPMCode
} = require('../utils');
const { STAGE_ORDER, getMaterialLeadTime } = require('../constants');
const { calculateCrunchedTimeline } = require('../crunchUtils');
const { ProjectsRepo, LogsRepo } = require('../db/repository');

// ── Centralized Audit & Activity Logger ─────────────────────────────
function logActivity(p, entry, user) {
  const ts = Date.now();
  const dateObj = new Date(ts);
  const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const logEntry = {
    id: 'LOG-' + ts + '-' + Math.random().toString(36).substr(2, 4),
    projectId: p.id,
    projectName: p.projectName,
    fgCode: p.fgCode || '',
    action: entry.action || 'UPDATE',
    title: entry.title || 'Project Updated',
    details: entry.details || '',
    field: entry.field || null,
    oldValue: entry.oldValue !== undefined ? entry.oldValue : null,
    newValue: entry.newValue !== undefined ? entry.newValue : null,
    materialName: entry.materialName || null,
    from: entry.from || null,
    to: entry.to || null,
    by: user ? user.name : 'System',
    byEmail: user ? user.email : '',
    byRole: user ? user.role : 'updater',
    byDept: user ? (user.department || '') : '',
    timestamp: ts,
    dateStr: dateFormatted
  };

  // 1. Project-level audit trail for backtracking
  p.auditTrail = p.auditTrail || [];
  p.auditTrail.unshift(logEntry);
  if (p.auditTrail.length > 500) p.auditTrail = p.auditTrail.slice(0, 500);

  // 2. Global activity logs for live notifications & system stream
  store.advanceLogs = store.advanceLogs || [];
  store.advanceLogs.unshift(logEntry);
  if (store.advanceLogs.length > 1000) store.advanceLogs = store.advanceLogs.slice(0, 1000);

  // 3. PostgreSQL persistence
  LogsRepo.add(logEntry).catch(err => {
    // Non-blocking catch
  });

  return logEntry;
}

function logAdvance(p, from, to, type, user, extraDetails = '') {
  const isRevoke = type === 'REVOKE';
  const title = isRevoke ? `Revoked: ${from} ↩ ${to}` : `Advanced: ${from} ▶ ${to}`;
  const details = extraDetails || (isRevoke ? `Moved project/material backward from ${from} to ${to}` : `Progressed from ${from} to ${to}`);
  return logActivity(p, {
    action: isRevoke ? 'STAGE_REVOKE' : 'STAGE_ADVANCE',
    title,
    details,
    from,
    to
  }, user);
}

const { isDbAvailable } = require('../db');

// Intercept all mutating responses on /:id routes to automatically persist to PostgreSQL and local store
router.use('/:id', (req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (typeof store.saveLocalStore === 'function') {
          store.saveLocalStore();
        }
        const id = req.params.id;
        if (isDbAvailable()) {
          if (req.method === 'DELETE') {
            ProjectsRepo.delete(id).catch(err => console.warn('[ProjectsRepo] DB delete failed:', err.message));
          } else {
            const p = store.projects.find(x => x.id === id);
            if (p) {
              ProjectsRepo.update(id, p).catch(err => console.warn('[ProjectsRepo] DB update failed:', err.message));
            }
          }
        }
      }
    }
    return origJson(body);
  };
  next();
});

// GET /api/projects
router.get('/', authMiddleware, async (req, res) => {
  if (isDbAvailable()) {
    try {
      const dbProjects = await ProjectsRepo.getAll();
      if (dbProjects && dbProjects.length > 0) {
        store.projects = dbProjects;
      }
    } catch (err) {
      console.warn('[ProjectsRepo] DB getAll failed, using local store:', err.message);
    }
  }
  return res.json({ projects: store.projects || [] });
});

// GET /api/projects/:id/audit-trail — Backtrack project history (Authenticated users)
router.get('/:id/audit-trail', authMiddleware, async (req, res) => {
  let p = store.projects.find(x => x.id === req.params.id);
  if (!p) {
    try {
      p = await ProjectsRepo.getById(req.params.id);
    } catch (e) {}
  }
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json({
    projectId: p.id,
    projectName: p.projectName,
    fgCode: p.fgCode || '',
    auditTrail: p.auditTrail || []
  });
});

// POST /api/projects — Create (Admin & Super Admin only)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const { fgCode, projectName, skuSize, grammage, briefDate, targetLaunchDate, status, risk, supplier, factory, description, comments, projectType, projectCategory, materials } = req.body;
  if (!projectName || !briefDate || !materials || !materials.length) {
    return res.status(400).json({ error: 'projectName, briefDate, and at least 1 material required' });
  }
  let internalId = 'PRJ-' + String(store.projCounter++).padStart(3, '0');
  try {
    const dbId = await ProjectsRepo.getNextId();
    if (dbId) internalId = dbId;
  } catch (e) {
    // fallback to in-memory counter
  }

  const mats = materials.map((m, idx) => {
    const pmCode = m.pmCode ? m.pmCode.trim() : generateDefaultPMCode(m.type, idx);
    const artworkCode = m.artworkCode || getArtworkCode(pmCode);
    return {
      ...m,
      pmCode,
      clubbedCodes: m.clubbedCodes || (m.specSheet?.docHeader?.clubbedCodes) || '',
      variants: m.variants || (m.specSheet?.variants) || [],
      artworkCode,
      stage: 'Brief',
      stageHistory: [],
      milestones: calcMatMilestones(briefDate, m),
      specs: m.specs || {},
      specSheet: m.specSheet || null,
      artworkFiles: m.artworkFiles || m.specSheet?.artworkFiles || [],
      specSignoff: m.specSignoff || null,
      poStatus: m.poStatus || 'RFQ in progress',
      poNumber: (m.poNumber || '').trim()
    };
  });
  const ms = calcProjectMilestones(briefDate, mats);
  const estReady = ms.Connectivity;
  const fedLaunch = targetLaunchDate ? targetLaunchDate : estReady;
  let crunchPlan = null;
  if (fedLaunch < estReady) {
    const tempProj = { briefDate, materials: mats, stage: 'Brief', milestones: ms };
    const calculated = calculateCrunchedTimeline(tempProj, fedLaunch);
    if (calculated && calculated.isCrunched) {
      crunchPlan = {
        ...calculated,
        status: 'PENDING_STAGE1',
        stage1: { approved: false, approvedBy: null, approvedAt: null, comments: '' },
        stage2: { approved: false, approvedBy: null, approvedAt: null, comments: '' }
      };
    }
  }

  const project = {
    id: internalId,
    fgCode: fgCode || '',
    projectName,
    skuSize: skuSize || grammage || '',
    projectType: projectType || 'Regular',
    projectCategory: projectCategory || 'NPD',
    materials: mats,
    stage: 'Brief',
    status: status || 'On Track',
    briefDate,
    targetLaunchDate: fedLaunch,
    crunchPlan,
    milestones: ms,
    originalMilestones: { ...ms },
    supplier: supplier || 'TBD',
    factory: factory || '',
    risk: risk || (crunchPlan?.riskLevel || 'Low'),
    description: description || comments || '',
    launchDate: null,
    advancedAt: null,
    stageHistory: [],
    auditTrail: []
  };

  logActivity(project, {
    action: 'PROJECT_CREATE',
    title: 'Project Initialized',
    details: `Created new project with ${mats.length} packaging component(s). Target Launch: ${project.targetLaunchDate || 'TBD'}`,
    field: 'project',
    newValue: project.projectName
  }, req.user);

  store.projects.unshift(project);
  try {
    await ProjectsRepo.create(project);
  } catch (err) {
    console.warn('[ProjectsRepo] DB create failed:', err.message);
  }

  res.status(201).json({ project });
});

// PUT /api/projects/:id — Full Update (Admin & Super Admin only)
router.put('/:id', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const { fgCode, projectName, skuSize, grammage, briefDate, targetLaunchDate, status, risk, supplier, factory, description, comments, projectType, projectCategory, materials } = req.body;
  const existingMats = p.materials;

  const changes = [];
  const oldBriefDate = p.briefDate;
  const isBriefDateChanged = Boolean(briefDate && oldBriefDate && briefDate !== oldBriefDate);
  if (isBriefDateChanged) changes.push(`Brief Date: '${oldBriefDate}' ➔ '${briefDate}'`);
  if (fgCode !== undefined && fgCode !== p.fgCode) changes.push(`FG Code: '${p.fgCode}' ➔ '${fgCode}'`);
  if (projectName && projectName !== p.projectName) changes.push(`Name: '${p.projectName}' ➔ '${projectName}'`);
  if (targetLaunchDate !== undefined && targetLaunchDate !== p.targetLaunchDate) changes.push(`Launch: '${p.targetLaunchDate}' ➔ '${targetLaunchDate}'`);
  if (status && status !== p.status) changes.push(`Status: '${p.status}' ➔ '${status}'`);
  if (supplier && supplier !== p.supplier) changes.push(`Supplier: '${p.supplier}' ➔ '${supplier}'`);
  if (factory !== undefined && factory !== p.factory) changes.push(`Factory: '${p.factory}' ➔ '${factory}'`);

  p.fgCode = fgCode !== undefined ? fgCode : p.fgCode;
  p.projectName = projectName || p.projectName;
  p.skuSize = skuSize !== undefined ? skuSize : (grammage !== undefined ? grammage : p.skuSize);
  p.projectType = projectType || p.projectType;
  p.projectCategory = projectCategory || p.projectCategory;
  p.briefDate = briefDate || p.briefDate;
  if (targetLaunchDate !== undefined) {
    p.targetLaunchDate = targetLaunchDate;
    if (p.targetLaunchDate && p.milestones?.Connectivity && p.targetLaunchDate < p.milestones.Connectivity) {
      const calculated = calculateCrunchedTimeline(p, p.targetLaunchDate);
      if (calculated && calculated.isCrunched) {
        p.crunchPlan = {
          ...calculated,
          status: 'PENDING_STAGE1',
          stage1: { approved: false, approvedBy: null, approvedAt: null, comments: '' },
          stage2: { approved: false, approvedBy: null, approvedAt: null, comments: '' }
        };
      }
    } else if (p.targetLaunchDate && p.milestones?.Connectivity && p.targetLaunchDate >= p.milestones.Connectivity) {
      p.crunchPlan = null;
    }
  }
  p.status = p.status === 'Launched' ? 'Launched' : (status || p.status);
  p.risk = risk || p.risk;
  p.supplier = supplier || p.supplier;
  p.factory = factory !== undefined ? factory : p.factory;
  p.description = description !== undefined ? description : (comments !== undefined ? comments : p.description);
  if (materials && materials.length) {
    p.materials = materials.map((m, i) => {
      const ex = existingMats ? existingMats[i] : null;
      // Determine material brief date:
      // If m.briefDate was explicitly provided, use it.
      // If project brief date changed, cascade the new project brief date to the material!
      let matBriefDate = m.briefDate;
      if (!matBriefDate || (isBriefDateChanged && (!m.briefDate || m.briefDate === oldBriefDate))) {
        matBriefDate = p.briefDate;
      }

      const shouldRecalcMilestones = !ex || !ex.milestones || isBriefDateChanged ||
        (ex.briefDate && ex.briefDate !== matBriefDate) ||
        (ex.milestones?.Brief && ex.milestones.Brief !== matBriefDate) ||
        (m.printType && ex.printType !== m.printType) ||
        (m.customLeadTime !== undefined && ex.customLeadTime !== m.customLeadTime);

      let milestones = ex?.milestones;
      if (shouldRecalcMilestones) {
        milestones = calcMatMilestones(matBriefDate, m);
      }

      const pmCode = m.pmCode ? m.pmCode.trim() : (ex?.pmCode || generateDefaultPMCode(m.type, i));
      const artworkCode = m.artworkCode || ex?.artworkCode || getArtworkCode(pmCode);
      const userSpecs = (m.specs && Object.keys(m.specs).length > 0) ? m.specs : (ex?.specs || {});
      const specSheet = m.specSheet || ex?.specSheet || null;
      const artworkFiles = m.artworkFiles || m.specSheet?.artworkFiles || ex?.artworkFiles || ex?.specSheet?.artworkFiles || [];

      return {
        ...m,
        pmCode,
        clubbedCodes: m.clubbedCodes !== undefined ? m.clubbedCodes : (ex?.clubbedCodes || (m.specSheet?.docHeader?.clubbedCodes) || ''),
        variants: m.variants || ex?.variants || (m.specSheet?.variants) || [],
        artworkCode,
        briefDate: matBriefDate,
        stage: ex ? (ex.stage || 'Brief') : 'Brief',
        stageHistory: ex ? (ex.stageHistory || []) : [],
        milestones,
        specs: userSpecs,
        specSignoff: ex?.specSignoff || m.specSignoff || null,
        specSheet,
        artworkFiles,
        poStatus: ex?.poStatus || m.poStatus || 'RFQ in progress',
        poNumber: ex?.poNumber || (m.poNumber || '').trim()
      };
    });
    p.milestones = calcProjectMilestones(p.briefDate, p.materials);
    if (p.launchDate) p.milestones.Launch = p.launchDate;
  }
  syncProjectStage(p);

  logActivity(p, {
    action: 'PROJECT_UPDATE',
    title: 'Project Details Updated',
    details: changes.length ? changes.join('; ') : 'Updated packaging specifications and project settings',
    field: 'general'
  }, req.user);

  res.json({ project: p });
});

// DELETE /api/projects/:id — Delete (Super Admin only!)
router.delete('/:id', authMiddleware, requireSuperAdmin, (req, res) => {
  const idx = store.projects.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  const p = store.projects[idx];
  logActivity(p, {
    action: 'PROJECT_DELETE',
    title: 'Project Deleted',
    details: `Permanently deleted project '${p.projectName}' (${p.id})`
  }, req.user);
  store.projects.splice(idx, 1);
  res.json({ ok: true });
});

// PUT /api/projects/:id/fgcode — Inline FG code edit (Updaters, Admins, Super Admin)
router.put('/:id/fgcode', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const oldVal = p.fgCode || '';
  p.fgCode = (req.body.fgCode || '').trim();

  logActivity(p, {
    action: 'FGCODE_UPDATE',
    title: 'FG Item Code Updated',
    details: `Updated FG Code from '${oldVal || 'empty'}' to '${p.fgCode}'`,
    field: 'fgCode',
    oldValue: oldVal,
    newValue: p.fgCode
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/supplier — Inline supplier edit (Updaters, Admins, Super Admin)
router.put('/:id/supplier', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const oldVal = p.supplier || 'TBD';
  p.supplier = (req.body.supplier || '').trim() || 'TBD';

  logActivity(p, {
    action: 'SUPPLIER_UPDATE',
    title: 'Project Supplier Updated',
    details: `Updated Supplier from '${oldVal}' to '${p.supplier}'`,
    field: 'supplier',
    oldValue: oldVal,
    newValue: p.supplier
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/factory — Inline factory edit (Updaters, Admins, Super Admin)
router.put('/:id/factory', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const oldVal = p.factory || 'TBD';
  p.factory = (req.body.factory || '').trim() || 'TBD';

  logActivity(p, {
    action: 'FACTORY_UPDATE',
    title: 'Target Factory Updated',
    details: `Updated Factory from '${oldVal}' to '${p.factory}'`,
    field: 'factory',
    oldValue: oldVal,
    newValue: p.factory
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/description — Inline description edit (Updaters, Admins, Super Admin)
router.put('/:id/description', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.description = (req.body.description || '').trim();
  p.comments = p.description;

  logActivity(p, {
    action: 'DESCRIPTION_UPDATE',
    title: 'Project Description Updated',
    details: `Updated description/comments: "${p.description.slice(0, 80)}${p.description.length > 80 ? '...' : ''}"`,
    field: 'description',
    newValue: p.description
  }, req.user);

  res.json({ project: p });
});

// POST /api/projects/:id/advance — Advance all materials at min stage (Updaters, Admins, Super Admin)
router.post('/:id/advance', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot advance' });

  // Mandatory check: If crunched timeline is pending Stage 1 or Stage 2 approval, next action is gated!
  if (p.crunchPlan && (p.crunchPlan.status === 'PENDING_STAGE1' || p.crunchPlan.status === 'PENDING_STAGE2')) {
    const stageLabel = p.crunchPlan.status === 'PENDING_STAGE1' ? 'Stage 1 (Admin Review)' : 'Stage 2 (Super Admin Final Sign-Off)';
    return res.status(403).json({
      error: `Action Gated: This project has a crunched launch timeline pending ${stageLabel}. Approval must be granted before progressing to the next stage.`,
      crunchStatus: p.crunchPlan.status
    });
  }

  const projStage = p.stage;
  const toAdvance = p.materials.filter(m => (m.stage || 'Brief') === projStage);
  // Mandatory check: Spec Sign-off must be confirmed, or requires Admin approval
  const unsigned = toAdvance.filter(m => !(m.specSignoff && m.specSignoff.signed));
  if (unsigned.length > 0) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const hasAdminApproval = req.body && req.body.adminApproval === true;
    if (!isAdmin && !hasAdminApproval) {
      return res.status(403).json({
        error: `Action Gated: Technical specifications must be signed off first for: ${unsigned.map(m => m.name).join(', ')}. If not signed off, Admin approval is required.`,
        requiresSpecSignoff: true,
        unsignedMaterials: unsigned.map(m => m.name)
      });
    }
    if (isAdmin || hasAdminApproval) {
      logActivity(p, {
        action: 'ADMIN_SPEC_OVERRIDE',
        title: `Admin Approval Granted: Multiple Components`,
        details: `Admin approval granted by ${req.user.name} (${req.user.role}) to advance project with unsigned specs for: ${unsigned.map(m => m.name).join(', ')}${req.body.adminNotes ? ` — Reason: ${req.body.adminNotes}` : ''}`,
        field: 'adminApproval'
      }, req.user);
    }
  }

  // Mandatory check: If advancing from VPDF to Printing, PO must be 'Raised'
  if (projStage === 'VPDF') {
    const unraised = toAdvance.filter(m => (m.poStatus || 'RFQ in progress') !== 'Raised');
    if (unraised.length > 0) {
      return res.status(400).json({
        error: `Cannot advance to Printing: Purchase Order must be 'Raised' first for: ${unraised.map(m => m.name).join(', ')}.`
      });
    }
  }

  const actDate = today();
  toAdvance.forEach(m => {
    const from = m.stage || 'Brief';
    const ms = m.milestones || calcMatMilestones(p.briefDate, m);
    const planned = ms[from];
    const variance = planned ? Math.round((new Date(actDate) - new Date(planned)) / 86400000) : 0;
    m.stageHistory = m.stageHistory || [];
    m.stageHistory.push({ stage: from, plannedDate: planned, completedDate: actDate, completedBy: req.user.name, variance });
    m.stage = STAGE_ORDER[stageIdx(from) + 1];
    m.milestones = recalcMatMilestones(m, p.briefDate, actDate);
    m.advancedAt = Date.now();
  });
  syncProjectStage(p);
  p.advancedAt = Date.now();
  logAdvance(p, projStage, p.stage, 'ADVANCE', req.user, `Advanced all materials at stage ${projStage} ➔ ${p.stage}`);
  res.json({ project: p });
});

// POST /api/projects/:id/revoke — Revoke all materials to previous stage (admin)
router.post('/:id/revoke', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const projStage = p.stage;
  if (projStage === 'Brief') return res.status(400).json({ error: 'Already at first stage' });
  const to = STAGE_ORDER[stageIdx(projStage) - 1];
  p.materials.forEach(m => {
    const mStage = m.stage || 'Brief';
    if (stageIdx(mStage) > stageIdx(to)) {
      if (m.stageHistory && m.stageHistory.length) m.stageHistory.pop();
      const lastDate = m.stageHistory && m.stageHistory.length
        ? m.stageHistory[m.stageHistory.length - 1].completedDate
        : p.briefDate;
      const mTemp = { ...m, stage: mStage };
      m.milestones = recalcMatMilestones(mTemp, p.briefDate, lastDate);
      m.stage = STAGE_ORDER[stageIdx(mStage) - 1];
    }
  });
  if (p.status === 'Launched') { p.status = 'On Track'; p.launchDate = null; if (p.milestones) p.milestones.Launch = null; }
  syncProjectStage(p);
  logAdvance(p, projStage, p.stage, 'REVOKE', req.user, `Revoked project materials from stage ${projStage} ↩ ${p.stage}`);
  res.json({ project: p });
});

// POST /api/projects/:id/launch — Mark as launched (Admin & Super Admin only)
router.post('/:id/launch', authMiddleware, requireAdmin, (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.stage = 'Launch';
  p.status = 'Launched';
  p.launchDate = date;
  if (!p.milestones) p.milestones = {};
  p.milestones.Launch = date;
  p.advancedAt = Date.now();

  logActivity(p, {
    action: 'PROJECT_LAUNCH',
    title: '🎉 Commercial Launch Confirmed',
    details: `Confirmed project commercial launch on ${date}`,
    from: 'Connectivity',
    to: 'Launch'
  }, req.user);

  res.json({ project: p });
});

// POST /api/projects/:id/brief-date — Change brief date, reset milestones (Admin & Super Admin only)
router.post('/:id/brief-date', authMiddleware, requireAdmin, (req, res) => {
  const { briefDate } = req.body;
  if (!briefDate) return res.status(400).json({ error: 'briefDate required' });
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot change' });
  const oldBD = p.briefDate;
  p.briefDate = briefDate;
  p.materials = p.materials.map(m => ({
    ...m,
    briefDate: briefDate,
    stage: 'Brief',
    stageHistory: [],
    milestones: calcMatMilestones(briefDate, m)
  }));
  p.milestones = calcProjectMilestones(briefDate, p.materials);
  p.originalMilestones = { ...p.milestones };
  p.stageHistory = [];
  syncProjectStage(p);

  logActivity(p, {
    action: 'BRIEF_DATE_RESET',
    title: 'Brief Date Reset',
    details: `Reset Brief Date from ${oldBD} to ${briefDate} and recalibrated all component milestone dates`,
    field: 'briefDate',
    oldValue: oldBD,
    newValue: briefDate
  }, req.user);

  res.json({ project: p });
});

// POST /api/projects/:id/materials/:mIdx/advance — Advance single material (Updaters, Admins, Super Admin)
router.post('/:id/materials/:mIdx/advance', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot advance' });

  // Mandatory check: If crunched timeline is pending Stage 1 or Stage 2 approval, next action is gated!
  if (p.crunchPlan && (p.crunchPlan.status === 'PENDING_STAGE1' || p.crunchPlan.status === 'PENDING_STAGE2')) {
    const stageLabel = p.crunchPlan.status === 'PENDING_STAGE1' ? 'Stage 1 (Admin Review)' : 'Stage 2 (Super Admin Final Sign-Off)';
    return res.status(403).json({
      error: `Action Gated: This project has a crunched launch timeline pending ${stageLabel}. Approval must be granted before progressing to the next stage.`,
      crunchStatus: p.crunchPlan.status
    });
  }

  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const stage = m.stage || 'Brief';
  if (stage === 'Connectivity') {
    const allReady = p.materials.every(mat => (mat.stage || 'Brief') === 'Connectivity');
    return res.json({ project: p, canLaunch: allReady });
  }

  // Mandatory check: Spec Sign-off must be confirmed, or requires Admin approval
  const isSigned = !!(m.specSignoff && m.specSignoff.signed);
  if (!isSigned) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const hasAdminApproval = req.body && req.body.adminApproval === true;
    if (!isAdmin && !hasAdminApproval) {
      return res.status(403).json({
        error: `Action Gated: Technical specifications for "${m.name}" must be signed off before advancing. If not signed off, Admin approval is required.`,
        requiresSpecSignoff: true,
        materialName: m.name
      });
    }
    if (isAdmin || hasAdminApproval) {
      logActivity(p, {
        action: 'ADMIN_SPEC_OVERRIDE',
        title: `Admin Approval Granted: ${m.name}`,
        details: `Admin approval granted by ${req.user.name} (${req.user.role}) to advance "${m.name}" without prior spec sign-off${req.body.adminNotes ? ` — Reason: ${req.body.adminNotes}` : ''}`,
        materialName: m.name,
        field: 'adminApproval'
      }, req.user);
    }
  }

  // Mandatory check: If advancing from VPDF to Printing, PO must be 'Raised'
  if (stage === 'VPDF' && (m.poStatus || 'RFQ in progress') !== 'Raised') {
    return res.status(400).json({
      error: `Cannot advance to Printing: Purchase Order for "${m.name}" must be 'Raised' first (Current: ${m.poStatus || 'RFQ in progress'}).`
    });
  }

  const from = stage;
  const actDate = today();
  const ms = m.milestones || calcMatMilestones(p.briefDate, m);
  const planned = ms[from];
  const variance = planned ? Math.round((new Date(actDate) - new Date(planned)) / 86400000) : 0;
  m.stageHistory = m.stageHistory || [];
  m.stageHistory.push({ stage: from, plannedDate: planned, completedDate: actDate, completedBy: req.user.name, variance });
  m.stage = STAGE_ORDER[stageIdx(from) + 1];
  m.milestones = recalcMatMilestones(m, p.briefDate, actDate);
  m.advancedAt = Date.now();
  p.advancedAt = Date.now();
  syncProjectStage(p);

  logActivity(p, {
    action: 'MATERIAL_ADVANCE',
    title: `Component Advanced: ${m.name}`,
    details: `Advanced "${m.name}" (${m.type}) from ${from} ▶ ${m.stage} (Variance: ${variance >= 0 ? '+' : ''}${variance}d)`,
    materialName: m.name,
    from,
    to: m.stage
  }, req.user);

  res.json({ project: p, canLaunch: false });
});

// POST /api/projects/:id/materials/:mIdx/revoke — Revoke single material (Admin & Super Admin only)
router.post('/:id/materials/:mIdx/revoke', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const stage = m.stage || 'Brief';
  if (stage === 'Brief') return res.status(400).json({ error: 'Already at first stage' });
  const from = stage;
  const to = STAGE_ORDER[stageIdx(stage) - 1];
  m.stage = to;
  if (m.stageHistory && m.stageHistory.length) m.stageHistory.pop();
  const lastDate = m.stageHistory && m.stageHistory.length
    ? m.stageHistory[m.stageHistory.length - 1].completedDate
    : p.briefDate;
  const mTemp = { ...m, stage: from };
  m.milestones = recalcMatMilestones(mTemp, p.briefDate, lastDate);
  m.stage = to;
  syncProjectStage(p);

  logActivity(p, {
    action: 'MATERIAL_REVOKE',
    title: `Component Revoked: ${m.name}`,
    details: `Revoked "${m.name}" (${m.type}) backward from ${from} ↩ ${to}`,
    materialName: m.name,
    from,
    to
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/specs — Save material specs (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/specs', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });

  const oldSpecs = { ...(m.specs || {}) };
  m.specs = req.body.specs || {};
  const changedKeys = Object.keys(m.specs).filter(k => m.specs[k] !== oldSpecs[k]);
  const specSummary = changedKeys.length
    ? changedKeys.map(k => `${k}: '${m.specs[k]}'`).join(', ')
    : 'Updated technical specs';

  logActivity(p, {
    action: 'SPECS_UPDATE',
    title: `Specs Modified: ${m.name}`,
    details: `Updated technical specifications for "${m.name}": ${specSummary}`,
    materialName: m.name,
    field: 'specs',
    newValue: m.specs
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/specsheet — Save/Edit Full Spec Sheet (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/specsheet', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const mIdx = parseInt(req.params.mIdx);
  if (isNaN(mIdx) || !p.materials || !p.materials[mIdx]) return res.status(404).json({ error: 'Material not found' });
  const m = p.materials[mIdx];

  const specSheet = req.body.specSheet || {};
  const isSubmitForCheck = req.body.submitForCheck === true;

  // Initialize governance if not present
  specSheet.governance = specSheet.governance || {};
  specSheet.governance.preparedBy = {
    name: req.user.name,
    title: req.user.title || 'Executive',
    role: req.user.role,
    email: req.user.email,
    date: new Date().toISOString(),
    signed: true
  };

  if (isSubmitForCheck) {
    specSheet.governance.status = 'PENDING_CHECK';
  } else if (!specSheet.governance.status || specSheet.governance.status === 'REVISION_REQUESTED') {
    specSheet.governance.status = 'DRAFT';
  }

  m.specSheet = specSheet;
  m.artworkCode = getArtworkCode(m.pmCode || specSheet.docHeader?.itemCode);
  if (specSheet.docHeader) {
    specSheet.docHeader.artworkCode = m.artworkCode;
    if (specSheet.docHeader.clubbedCodes !== undefined) {
      m.clubbedCodes = specSheet.docHeader.clubbedCodes;
    }
  }
  if (Array.isArray(specSheet.variants)) {
    m.variants = specSheet.variants;
  }
  if (Array.isArray(specSheet.artworkFiles)) {
    m.artworkFiles = specSheet.artworkFiles;
  }

  // Sync flat m.specs for backwards compatibility
  if (Array.isArray(specSheet.parameters)) {
    m.specs = m.specs || {};
    specSheet.parameters.forEach(param => {
      if (param.parameter && param.standard) {
        const key = param.parameter.toLowerCase().replace(/[^a-z0-9]/g, '_');
        m.specs[key] = param.standard;
      }
    });
  }

  logActivity(p, {
    action: isSubmitForCheck ? 'SPEC_SUBMITTED_FOR_CHECK' : 'SPECSHEET_UPDATE',
    title: isSubmitForCheck ? `Spec Sheet Submitted for PM Check: ${m.name}` : `Spec Sheet Updated: ${m.name}`,
    details: `${req.user.name} (${req.user.role}) updated engineering specification sheet for "${m.name}". Status: ${specSheet.governance.status}`,
    materialName: m.name,
    field: 'specSheet',
    newValue: specSheet.governance.status
  }, req.user);

  res.json({ project: p, material: m, specSheet: m.specSheet, artworkCode: m.artworkCode, variants: m.variants, clubbedCodes: m.clubbedCodes });
});

// PUT /api/projects/:id/materials/:mIdx/artwork — Save/Update material artwork files (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/artwork', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const mIdx = parseInt(req.params.mIdx);
  if (isNaN(mIdx) || !p.materials || !p.materials[mIdx]) return res.status(404).json({ error: 'Material not found' });
  const m = p.materials[mIdx];

  const artworkFiles = req.body.artworkFiles || [];
  m.artworkFiles = artworkFiles;
  m.artworkCode = getArtworkCode(m.pmCode);

  if (Array.isArray(req.body.variants)) {
    m.variants = req.body.variants;
  }

  if (m.specSheet) {
    m.specSheet.artworkFiles = artworkFiles;
    if (m.variants) {
      m.specSheet.variants = m.variants;
    }
    if (m.specSheet.docHeader) {
      m.specSheet.docHeader.artworkCode = m.artworkCode;
    }
  }

  logActivity(p, {
    action: 'ARTWORK_UPDATE',
    title: `Artwork Updated: ${m.artworkCode} (${m.name})`,
    details: `${req.user.name} (${req.user.role}) updated artwork files for ${m.name} (${m.pmCode || 'PM-TBD'} ➔ ${m.artworkCode}). Total files: ${artworkFiles.length}`,
    materialName: m.name,
    field: 'artworkFiles'
  }, req.user);

  res.json({ project: p, material: m, artworkCode: m.artworkCode, artworkFiles: m.artworkFiles, variants: m.variants });
});

// POST /api/projects/:id/materials/:mIdx/specsheet/check — Project Manager Check & Sign-off (Admins & Super Admin)
router.post('/:id/materials/:mIdx/specsheet/check', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const mIdx = parseInt(req.params.mIdx);
  if (isNaN(mIdx) || !p.materials || !p.materials[mIdx]) return res.status(404).json({ error: 'Material not found' });
  const m = p.materials[mIdx];
  if (!m.specSheet) return res.status(400).json({ error: 'No specification sheet exists yet. Please create or save a draft first.' });

  const comments = req.body.comments || 'Technical parameters verified against line trial tolerances.';
  m.specSheet.governance = m.specSheet.governance || {};
  m.specSheet.governance.status = 'CHECKED_PENDING_APPROVAL';
  m.specSheet.governance.checkedBy = {
    name: req.user.name,
    title: req.user.title || 'Project Manager',
    role: req.user.role,
    email: req.user.email,
    date: new Date().toISOString(),
    signed: true,
    comments
  };

  logActivity(p, {
    action: 'SPEC_CHECKED_PM',
    title: `Specs Checked & Verified by PM: ${m.name}`,
    details: `Project Manager ${req.user.name} checked specifications for "${m.name}". Ready for Packaging Head approval. Comments: "${comments}"`,
    materialName: m.name,
    field: 'specSheet.governance.checkedBy',
    newValue: m.specSheet.governance.checkedBy
  }, req.user);

  res.json({ project: p, material: m, specSheet: m.specSheet });
});

// POST /api/projects/:id/materials/:mIdx/specsheet/approve — Packaging Head Final Approval (Super Admin Only)
router.post('/:id/materials/:mIdx/specsheet/approve', authMiddleware, requireSuperAdmin, (req, res) => {
  const p = store.projects.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const mIdx = parseInt(req.params.mIdx);
  if (isNaN(mIdx) || !p.materials || !p.materials[mIdx]) return res.status(404).json({ error: 'Material not found' });
  const m = p.materials[mIdx];
  if (!m.specSheet) return res.status(400).json({ error: 'No specification sheet exists yet.' });

  const comments = req.body.comments || 'Approved for commercial procurement and print production.';
  m.specSheet.governance = m.specSheet.governance || {};
  m.specSheet.governance.status = 'APPROVED';
  m.specSheet.governance.approvedBy = {
    name: req.user.name,
    title: req.user.title || 'Packaging Head',
    role: req.user.role,
    email: req.user.email,
    date: new Date().toISOString(),
    signed: true,
    comments
  };

  // Automatically mark Purchase Order spec sign-off as confirmed!
  m.specSignoff = {
    signed: true,
    signedBy: req.user.name,
    signedRole: req.user.role,
    signedEmail: req.user.email,
    signedAt: new Date().toISOString(),
    notes: `Formally signed off via Packaging Head Spec Sheet Approval: ${comments}`
  };

  logActivity(p, {
    action: 'SPEC_APPROVED_HEAD',
    title: `Specs APPROVED by Packaging Head: ${m.name}`,
    details: `Packaging Head ${req.user.name} granted formal approval for "${m.name}". Specification sheet is now locked. Comments: "${comments}"`,
    materialName: m.name,
    field: 'specSheet.governance.approvedBy',
    newValue: m.specSheet.governance.approvedBy
  }, req.user);

  res.json({ project: p, material: m, specSheet: m.specSheet });
});

// POST /api/projects/:id/materials/:mIdx/specsheet/reject — Request Revision (Admins & Super Admin)
router.post('/:id/materials/:mIdx/specsheet/reject', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const mIdx = parseInt(req.params.mIdx);
  if (isNaN(mIdx) || !p.materials || !p.materials[mIdx]) return res.status(404).json({ error: 'Material not found' });
  const m = p.materials[mIdx];
  if (!m.specSheet) return res.status(400).json({ error: 'No specification sheet exists yet.' });

  const reason = req.body.reason || 'Parameters out of tolerance or incomplete.';
  m.specSheet.governance = m.specSheet.governance || {};
  m.specSheet.governance.status = 'REVISION_REQUESTED';
  m.specSheet.governance.revisionRequest = {
    by: req.user.name,
    role: req.user.role,
    date: new Date().toISOString(),
    reason
  };

  logActivity(p, {
    action: 'SPEC_REVISION_REQUESTED',
    title: `Spec Revision Requested: ${m.name}`,
    details: `${req.user.name} (${req.user.role}) returned specifications for "${m.name}" for revision. Reason: "${reason}"`,
    materialName: m.name,
    field: 'specSheet.governance.status',
    newValue: 'REVISION_REQUESTED'
  }, req.user);

  res.json({ project: p, material: m, specSheet: m.specSheet });
});

// PUT /api/projects/:id/materials/:mIdx/pmcode — Save material PM code (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/pmcode', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const oldPM = m.pmCode || '';
  m.pmCode = (req.body.pmCode || '').trim();

  logActivity(p, {
    action: 'PMCODE_UPDATE',
    title: `PM Code Updated: ${m.name}`,
    details: `Updated PM Code for "${m.name}" from '${oldPM || 'empty'}' to '${m.pmCode}'`,
    materialName: m.name,
    field: 'pmCode',
    oldValue: oldPM,
    newValue: m.pmCode
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/supplier — Save material supplier (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/supplier', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const oldSup = m.supplier || '';
  m.supplier = (req.body.supplier || '').trim();

  logActivity(p, {
    action: 'MATERIAL_SUPPLIER_UPDATE',
    title: `Component Supplier Updated: ${m.name}`,
    details: `Updated Supplier for "${m.name}" from '${oldSup || 'empty'}' to '${m.supplier}'`,
    materialName: m.name,
    field: 'supplier',
    oldValue: oldSup,
    newValue: m.supplier
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/printtype — Update material print type and recalc milestones (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/printtype', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const oldPT = m.printType || 'Not Applicable';
  m.printType = (req.body.printType || '').trim() || 'Not Applicable';
  m.milestones = calcMatMilestones(m.briefDate || p.briefDate, m);
  p.milestones = calcProjectMilestones(p.briefDate, p.materials);
  if (p.launchDate) p.milestones.Launch = p.launchDate;

  logActivity(p, {
    action: 'PRINT_TYPE_UPDATE',
    title: `Print Process Updated: ${m.name}`,
    details: `Updated Print Type for "${m.name}" from '${oldPT}' to '${m.printType}' (Recalculated Material Lead: ${getMaterialLeadTime(m)}d)`,
    materialName: m.name,
    field: 'printType',
    oldValue: oldPT,
    newValue: m.printType
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/brief-date — Update material brief date and recalc milestones (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/brief-date', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (p.status === 'Launched') return res.status(400).json({ error: 'Project is already launched' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials && p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });

  const { briefDate } = req.body;
  if (!briefDate) return res.status(400).json({ error: 'briefDate required' });

  const oldMatBD = m.briefDate || m.milestones?.Brief || p.briefDate;
  m.briefDate = briefDate;
  m.milestones = calcMatMilestones(briefDate, m);

  p.milestones = calcProjectMilestones(p.briefDate, p.materials);
  if (p.launchDate) p.milestones.Launch = p.launchDate;

  // Re-check crunch timeline if targetLaunchDate is configured
  if (p.targetLaunchDate && p.milestones?.Connectivity && p.targetLaunchDate < p.milestones.Connectivity) {
    const calculated = calculateCrunchedTimeline(p, p.targetLaunchDate);
    if (calculated && calculated.isCrunched) {
      p.crunchPlan = {
        ...calculated,
        status: 'PENDING_STAGE1',
        stage1: { approved: false, approvedBy: null, approvedAt: null, comments: '' },
        stage2: { approved: false, approvedBy: null, approvedAt: null, comments: '' }
      };
    }
  } else if (p.targetLaunchDate && p.milestones?.Connectivity && p.targetLaunchDate >= p.milestones.Connectivity) {
    p.crunchPlan = null;
  }

  logActivity(p, {
    action: 'MATERIAL_BRIEF_DATE_UPDATE',
    title: `Material Brief Date Updated: ${m.name}`,
    details: `Updated brief date for "${m.name}" from '${oldMatBD}' to '${briefDate}' — Recalibrated material milestones and project timeline`,
    materialName: m.name,
    field: 'briefDate',
    oldValue: oldMatBD,
    newValue: briefDate
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/po — Update material Purchase Order action & details (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/po', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const validStatuses = ['Raised', 'Under approval', 'RFQ in progress'];
  const newStatus = req.body.poStatus;
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid PO status. Must be one of: ${validStatuses.join(', ')}` });
  }

  // If marking as Raised, check if spec is signed off or Admin approval is granted
  if (newStatus === 'Raised' && !(m.specSignoff && m.specSignoff.signed)) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const hasAdminApproval = req.body && req.body.adminApproval === true;
    if (!isAdmin && !hasAdminApproval) {
      return res.status(403).json({
        error: `Action Gated: Technical specifications for "${m.name}" must be signed off before marking Purchase Order as 'Raised'. If not signed off, Admin approval is required.`,
        requiresSpecSignoff: true,
        materialName: m.name
      });
    }
    if (isAdmin || hasAdminApproval) {
      logActivity(p, {
        action: 'ADMIN_SPEC_OVERRIDE',
        title: `Admin Approval Granted: PO Raised for ${m.name}`,
        details: `Admin approval granted by ${req.user.name} (${req.user.role}) to mark PO as 'Raised' for "${m.name}" without prior spec sign-off`,
        materialName: m.name,
        field: 'adminApproval'
      }, req.user);
    }
  }

  const oldStatus = m.poStatus || 'RFQ in progress';
  m.poStatus = newStatus;
  if (req.body.poNumber !== undefined) {
    m.poNumber = (req.body.poNumber || '').trim();
  }

  logActivity(p, {
    action: 'PO_UPDATE',
    title: `PO Status Updated: ${m.name}`,
    details: `Updated Purchase Order for "${m.name}": '${oldStatus}' ➔ '${m.poStatus}'${m.poNumber ? ` (PO# ${m.poNumber})` : ''}`,
    materialName: m.name,
    field: 'poStatus',
    oldValue: oldStatus,
    newValue: m.poStatus
  }, req.user);

  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/specsignoff — Confirm or revoke material technical specifications sign-off (Updaters, Admins, Super Admin)
router.put('/:id/materials/:mIdx/specsignoff', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });

  const { signed, notes = '' } = req.body;
  const isRevoke = signed === false;

  if (isRevoke) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.name !== m.specSignoff?.signedBy) {
      return res.status(403).json({ error: 'Only an Admin or the original signer can revoke a Spec Sign-off.' });
    }
    m.specSignoff = null;
    logActivity(p, {
      action: 'SPEC_SIGNOFF_REVOKE',
      title: `Spec Sign-off Revoked: ${m.name}`,
      details: `Technical specifications sign-off revoked for "${m.name}" by ${req.user.name} (${req.user.role})`,
      materialName: m.name,
      field: 'specSignoff',
      oldValue: 'Signed',
      newValue: 'Pending'
    }, req.user);
  } else {
    m.specSignoff = {
      signed: true,
      signedBy: req.user.name,
      signedRole: req.user.role,
      signedEmail: req.user.email,
      signedAt: new Date().toISOString(),
      notes: (notes || '').trim()
    };
    logActivity(p, {
      action: 'SPEC_SIGNOFF',
      title: `Spec Signed Off: ${m.name}`,
      details: `Technical specifications confirmed and signed off for "${m.name}" by ${req.user.name} (${req.user.role})${notes ? ` — Notes: ${notes.trim()}` : ''}`,
      materialName: m.name,
      field: 'specSignoff',
      newValue: m.specSignoff
    }, req.user);
  }

  res.json({ project: p, specSignoff: m.specSignoff });
});

// ── Crunched Timeline & 2-Stage Approval Endpoints ──────────────────

// POST /api/projects/:id/crunch/propose — Propose or update crunched launch timeline (Updaters, Admins, Super Admin)
router.post('/:id/crunch/propose', authMiddleware, requireUpdater, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const { targetLaunchDate } = req.body;
  if (!targetLaunchDate) return res.status(400).json({ error: 'targetLaunchDate is required' });

  const calculated = calculateCrunchedTimeline(p, targetLaunchDate);
  p.targetLaunchDate = targetLaunchDate;

  if (!calculated || !calculated.isCrunched) {
    p.crunchPlan = null;
    return res.json({ project: p, message: 'Launch date does not require timeline crunching' });
  }

  p.crunchPlan = {
    ...calculated,
    status: 'PENDING_STAGE1',
    proposedBy: req.user.name,
    proposedByEmail: req.user.email,
    proposedAt: new Date().toISOString(),
    stage1: { approved: false, approvedBy: null, approvedAt: null, comments: '' },
    stage2: { approved: false, approvedBy: null, approvedAt: null, comments: '' }
  };

  logActivity(p, {
    action: 'CRUNCH_PROPOSED',
    title: `⚡ Timeline Crunch Proposed (-${calculated.daysSaved}d)`,
    details: `Proposed accelerated Target Launch: ${targetLaunchDate} (Saving ${calculated.daysSaved} days, Risk: ${calculated.riskLevel}). Pending Stage 1 Review.`,
    from: p.stage,
    to: 'Stage 1 Review'
  }, req.user);

  res.json({ project: p, crunchPlan: p.crunchPlan });
});

// POST /api/projects/:id/crunch/approve-stage1 — Stage 1 Admin Approval (Either Admin 1 or Admin 2)
router.post('/:id/crunch/approve-stage1', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (!p.crunchPlan) return res.status(400).json({ error: 'No crunched timeline proposal on this project' });
  if (p.crunchPlan.status !== 'PENDING_STAGE1') {
    return res.status(400).json({ error: `Cannot approve Stage 1. Current status: ${p.crunchPlan.status}` });
  }

  p.crunchPlan.stage1 = {
    approved: true,
    approvedBy: req.user.name,
    approvedByEmail: req.user.email,
    approvedByRole: req.user.role,
    approvedAt: new Date().toISOString(),
    comments: (req.body.comments || '').trim()
  };
  p.crunchPlan.status = 'PENDING_STAGE2';

  logActivity(p, {
    action: 'CRUNCH_STAGE1_APPROVED',
    title: '⚡ Stage 1 Crunch Approved (Admin)',
    details: `Admin ${req.user.name} approved Stage 1 Review.${p.crunchPlan.stage1.comments ? ` Notes: "${p.crunchPlan.stage1.comments}"` : ''} Pending Stage 2 Super Admin Sign-off.`,
    from: 'Stage 1 Review',
    to: 'Stage 2 Review'
  }, req.user);

  res.json({ project: p, crunchPlan: p.crunchPlan });
});

// POST /api/projects/:id/crunch/approve-stage2 — Stage 2 Super Admin Approval (Super Admin only!)
router.post('/:id/crunch/approve-stage2', authMiddleware, requireSuperAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (!p.crunchPlan) return res.status(400).json({ error: 'No crunched timeline proposal on this project' });
  if (p.crunchPlan.status !== 'PENDING_STAGE2') {
    return res.status(400).json({ error: `Cannot approve Stage 2. Stage 1 must be approved first. Current status: ${p.crunchPlan.status}` });
  }

  p.crunchPlan.stage2 = {
    approved: true,
    approvedBy: req.user.name,
    approvedByEmail: req.user.email,
    approvedByRole: req.user.role,
    approvedAt: new Date().toISOString(),
    comments: (req.body.comments || '').trim()
  };
  p.crunchPlan.status = 'APPROVED';

  // Apply crunched milestones directly to the active project milestones
  p.milestones = { ...p.crunchPlan.milestones };
  if (p.materials && p.materials.length) {
    p.materials.forEach(m => {
      if (m.milestones) {
        Object.keys(p.crunchPlan.milestones).forEach(s => {
          if (m.milestones[s] !== undefined) {
            m.milestones[s] = p.crunchPlan.milestones[s];
          }
        });
      }
    });
  }

  logActivity(p, {
    action: 'CRUNCH_FINAL_APPROVED',
    title: '✅ Stage 2 Crunch Final Approval (Super Admin)',
    details: `Super Admin ${req.user.name} signed off on accelerated timeline.${p.crunchPlan.stage2.comments ? ` Notes: "${p.crunchPlan.stage2.comments}"` : ''} Crunched milestones activated.`,
    from: 'Stage 2 Review',
    to: 'Crunched Active'
  }, req.user);

  res.json({ project: p, crunchPlan: p.crunchPlan });
});

// POST /api/projects/:id/crunch/reject — Reject crunched timeline (Admin & Super Admin)
router.post('/:id/crunch/reject', authMiddleware, requireAdmin, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (!p.crunchPlan) return res.status(400).json({ error: 'No crunched timeline proposal on this project' });

  const prevStatus = p.crunchPlan.status;
  p.crunchPlan.status = 'REJECTED';
  p.crunchPlan.rejectedBy = req.user.name;
  p.crunchPlan.rejectedByRole = req.user.role;
  p.crunchPlan.rejectedAt = new Date().toISOString();
  p.crunchPlan.rejectionReason = (req.body.reason || req.body.comments || 'Risk factors exceeded threshold').trim();

  // Reset targetLaunchDate back to standard Est. Ready date
  p.targetLaunchDate = p.milestones?.Connectivity || p.targetLaunchDate;

  logActivity(p, {
    action: 'CRUNCH_REJECTED',
    title: '❌ Crunch Timeline Rejected',
    details: `Crunched timeline rejected by ${req.user.name}. Reason: "${p.crunchPlan.rejectionReason}". Reset to standard timeline.`,
    from: prevStatus,
    to: 'Standard Timeline'
  }, req.user);

  res.json({ project: p, crunchPlan: p.crunchPlan });
});

module.exports = router;

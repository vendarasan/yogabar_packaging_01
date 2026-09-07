const express = require('express');
const router = express.Router();
const store = require('../store');
const { authMiddleware, requireEditor, requireAdmin } = require('../middleware/auth');
const {
  today, calcMatMilestones, calcProjectMilestones,
  recalcMatMilestones, stageIdx, syncProjectStage
} = require('../utils');
const { STAGE_ORDER } = require('../constants');

// ── Helpers ────────────────────────────────────────────────────────
function logAdvance(p, from, to, type, user) {
  store.advanceLogs.unshift({
    id: 'ADV-' + Date.now(),
    projectId: p.id,
    projectName: p.projectName,
    fgCode: p.fgCode || '',
    from, to, type,
    by: user.name,
    byEmail: user.email,
    timestamp: Date.now()
  });
  if (store.advanceLogs.length > 200) store.advanceLogs = store.advanceLogs.slice(0, 200);
}

// GET /api/projects
router.get('/', authMiddleware, (req, res) => {
  res.json({ projects: store.projects });
});

// POST /api/projects — Create
router.post('/', authMiddleware, requireEditor, (req, res) => {
  const { fgCode, projectName, grammage, briefDate, targetLaunchDate, status, risk, supplier, factory, comments, materials } = req.body;
  if (!projectName || !briefDate || !materials || !materials.length) {
    return res.status(400).json({ error: 'projectName, briefDate, and at least 1 material required' });
  }
  const internalId = 'PRJ-' + String(store.projCounter++).padStart(3, '0');
  const mats = materials.map(m => ({
    ...m,
    stage: 'Brief',
    stageHistory: [],
    milestones: calcMatMilestones(briefDate, m.printType || 'Not Applicable'),
    specs: m.specs || {}
  }));
  const ms = calcProjectMilestones(briefDate, mats);
  const project = {
    id: internalId,
    fgCode: fgCode || '',
    projectName,
    grammage: grammage || '',
    materials: mats,
    stage: 'Brief',
    status: status || 'On Track',
    briefDate,
    targetLaunchDate: targetLaunchDate || null,
    milestones: ms,
    originalMilestones: { ...ms },
    supplier: supplier || 'TBD',
    factory: factory || '',
    risk: risk || 'Low',
    comments: comments || '',
    launchDate: null,
    advancedAt: null,
    stageHistory: []
  };
  store.projects.unshift(project);
  res.status(201).json({ project });
});

// PUT /api/projects/:id — Update
router.put('/:id', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const { fgCode, projectName, grammage, briefDate, targetLaunchDate, status, risk, supplier, factory, comments, materials } = req.body;
  const existingMats = p.materials;
  p.fgCode = fgCode !== undefined ? fgCode : p.fgCode;
  p.projectName = projectName || p.projectName;
  p.grammage = grammage !== undefined ? grammage : p.grammage;
  p.briefDate = briefDate || p.briefDate;
  p.targetLaunchDate = targetLaunchDate !== undefined ? targetLaunchDate : p.targetLaunchDate;
  p.status = p.status === 'Launched' ? 'Launched' : (status || p.status);
  p.risk = risk || p.risk;
  p.supplier = supplier || p.supplier;
  p.factory = factory !== undefined ? factory : p.factory;
  p.comments = comments !== undefined ? comments : p.comments;
  if (materials && materials.length) {
    p.materials = materials.map((m, i) => {
      const ex = existingMats[i];
      return {
        ...m,
        stage: ex ? (ex.stage || 'Brief') : 'Brief',
        stageHistory: ex ? (ex.stageHistory || []) : [],
        milestones: ex ? (ex.milestones || calcMatMilestones(p.briefDate, m.printType)) : calcMatMilestones(p.briefDate, m.printType),
        specs: ex ? (ex.specs || m.specs || {}) : (m.specs || {})
      };
    });
    p.milestones = calcProjectMilestones(p.briefDate, p.materials);
    if (p.launchDate) p.milestones.Launch = p.launchDate;
  }
  syncProjectStage(p);
  res.json({ project: p });
});

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, requireEditor, (req, res) => {
  const idx = store.projects.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  store.projects.splice(idx, 1);
  res.json({ ok: true });
});

// PUT /api/projects/:id/fgcode — Inline FG code edit
router.put('/:id/fgcode', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.fgCode = (req.body.fgCode || '').trim();
  res.json({ project: p });
});

// PUT /api/projects/:id/supplier — Inline supplier edit
router.put('/:id/supplier', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.supplier = (req.body.supplier || '').trim() || 'TBD';
  res.json({ project: p });
});

// POST /api/projects/:id/advance — Advance all materials at min stage
router.post('/:id/advance', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot advance' });
  const projStage = p.stage;
  const toAdvance = p.materials.filter(m => (m.stage || 'Brief') === projStage);
  const actDate = today();
  toAdvance.forEach(m => {
    const from = m.stage || 'Brief';
    const ms = m.milestones || calcMatMilestones(p.briefDate, m.printType || 'Not Applicable');
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
  logAdvance(p, projStage, p.stage, 'ADVANCE', req.user);
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
  logAdvance(p, projStage, p.stage, 'REVOKE', req.user);
  res.json({ project: p });
});

// POST /api/projects/:id/launch — Mark as launched
router.post('/:id/launch', authMiddleware, requireEditor, (req, res) => {
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
  logAdvance(p, 'Connectivity', 'Launch', 'ADVANCE', req.user);
  res.json({ project: p });
});

// POST /api/projects/:id/brief-date — Change brief date, reset milestones
router.post('/:id/brief-date', authMiddleware, requireEditor, (req, res) => {
  const { briefDate } = req.body;
  if (!briefDate) return res.status(400).json({ error: 'briefDate required' });
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot change' });
  p.briefDate = briefDate;
  p.materials = p.materials.map(m => ({
    ...m,
    stage: 'Brief',
    stageHistory: [],
    milestones: calcMatMilestones(briefDate, m.printType || 'Not Applicable')
  }));
  p.milestones = calcProjectMilestones(briefDate, p.materials);
  p.originalMilestones = { ...p.milestones };
  p.stageHistory = [];
  syncProjectStage(p);
  res.json({ project: p });
});

// POST /api/projects/:id/materials/:mIdx/advance — Advance single material
router.post('/:id/materials/:mIdx/advance', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p || p.status === 'Launched') return res.status(400).json({ error: 'Cannot advance' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  const stage = m.stage || 'Brief';
  if (stage === 'Connectivity') {
    // Check if all materials are at Connectivity
    const allReady = p.materials.every(mat => (mat.stage || 'Brief') === 'Connectivity');
    return res.json({ project: p, canLaunch: allReady });
  }
  const from = stage;
  const actDate = today();
  const ms = m.milestones || calcMatMilestones(p.briefDate, m.printType || 'Not Applicable');
  const planned = ms[from];
  const variance = planned ? Math.round((new Date(actDate) - new Date(planned)) / 86400000) : 0;
  m.stageHistory = m.stageHistory || [];
  m.stageHistory.push({ stage: from, plannedDate: planned, completedDate: actDate, completedBy: req.user.name, variance });
  m.stage = STAGE_ORDER[stageIdx(from) + 1];
  m.milestones = recalcMatMilestones(m, p.briefDate, actDate);
  m.advancedAt = Date.now();
  p.advancedAt = Date.now();
  syncProjectStage(p);
  logAdvance(p, from, m.stage, 'ADVANCE', req.user);
  res.json({ project: p, canLaunch: false });
});

// POST /api/projects/:id/materials/:mIdx/revoke — Revoke single material (admin)
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
  logAdvance(p, from, to, 'REVOKE', req.user);
  res.json({ project: p });
});

// PUT /api/projects/:id/materials/:mIdx/specs — Save material specs
router.put('/:id/materials/:mIdx/specs', authMiddleware, requireEditor, (req, res) => {
  const p = store.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const mIdx = parseInt(req.params.mIdx);
  const m = p.materials[mIdx];
  if (!m) return res.status(404).json({ error: 'Material not found' });
  m.specs = req.body.specs || {};
  res.json({ project: p });
});

module.exports = router;

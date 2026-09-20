'use strict';
/**
 * searchRoutes.js — Universal Search Endpoint for Pass 7.
 *
 * Locates:
 *  - Projects
 *  - Materials & PM Codes
 *  - Tasks
 *  - Risks
 *  - Specifications
 *  - Users
 */

const express = require('express');
const router = express.Router();
const store = require('../store');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({
      success: true,
      query: '',
      results: { projects: [], materials: [], tasks: [], risks: [], specs: [], users: [] }
    });
  }

  const results = {
    projects: [],
    materials: [],
    tasks: [],
    risks: [],
    specs: [],
    users: []
  };

  // 1. Search Projects & Materials & PM Codes
  for (const p of (store.projects || [])) {
    if (p.isDeleted) continue;

    const pMatch = (p.projectName && p.projectName.toLowerCase().includes(q)) ||
      (p.id && String(p.id).toLowerCase().includes(q)) ||
      (p.fgCode && p.fgCode.toLowerCase().includes(q)) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      (p.factory && p.factory.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    if (pMatch) {
      results.projects.push({
        id: p.id,
        projectName: p.projectName,
        fgCode: p.fgCode,
        stage: p.stage,
        status: p.status,
        supplier: p.supplier,
        targetLaunchDate: p.targetLaunchDate
      });
    }

    // Materials search
    if (Array.isArray(p.materials)) {
      for (const m of p.materials) {
        const mMatch = (m.name && m.name.toLowerCase().includes(q)) ||
          (m.pmCode && m.pmCode.toLowerCase().includes(q)) ||
          (m.artworkCode && m.artworkCode.toLowerCase().includes(q)) ||
          (m.type && m.type.toLowerCase().includes(q));

        if (mMatch) {
          results.materials.push({
            id: m.id || m.pmCode,
            materialName: m.name,
            pmCode: m.pmCode,
            artworkCode: m.artworkCode,
            type: m.type,
            stage: m.stage,
            projectId: p.id,
            projectName: p.projectName
          });
        }
      }
    }

    // Risks search within project
    if (Array.isArray(p.risks)) {
      for (const r of p.risks) {
        const rMatch = (r.title && r.title.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.owner && r.owner.toLowerCase().includes(q)) ||
          (r.action && r.action.toLowerCase().includes(q));

        if (rMatch) {
          results.risks.push({
            id: r.id,
            title: r.title,
            severity: r.severity,
            status: r.status,
            stage: r.stage,
            owner: r.owner,
            action: r.action,
            projectId: p.id,
            projectName: p.projectName
          });
        }
      }
    }
  }

  // 2. Search Tasks
  for (const t of (store.tasks || [])) {
    const tMatch = (t.title && t.title.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.assignedTo && t.assignedTo.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q));

    if (tMatch) {
      results.tasks.push({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        projectId: t.projectId
      });
    }
  }

  // 3. Search Specs in Spec Library
  for (const s of (store.specLibrary || [])) {
    const sMatch = (s.specName && s.specName.toLowerCase().includes(q)) ||
      (s.itemCode && s.itemCode.toLowerCase().includes(q)) ||
      (s.materialType && s.materialType.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q));

    if (sMatch) {
      results.specs.push({
        id: s.id,
        specName: s.specName,
        itemCode: s.itemCode,
        category: s.category,
        materialType: s.materialType,
        revision: s.revision
      });
    }
  }

  // 4. Search Users
  for (const [email, u] of Object.entries(store.users || {})) {
    const uMatch = email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));

    if (uMatch) {
      results.users.push({
        email,
        name: u.name,
        role: u.role,
        color: u.color
      });
    }
  }

  // Limit each bucket to 15 items
  results.projects = results.projects.slice(0, 15);
  results.materials = results.materials.slice(0, 15);
  results.tasks = results.tasks.slice(0, 15);
  results.risks = results.risks.slice(0, 15);
  results.specs = results.specs.slice(0, 15);
  results.users = results.users.slice(0, 15);

  const totalMatches = results.projects.length + results.materials.length +
    results.tasks.length + results.risks.length + results.specs.length + results.users.length;

  res.json({
    success: true,
    query: q,
    totalMatches,
    results
  });
}));

module.exports = router;

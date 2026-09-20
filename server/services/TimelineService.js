'use strict';
/**
 * TimelineService.js — Synthesizes a unified, chronological project history.
 *
 * Implements Pass 5 Requirement 14:
 * Combines stage changes, status changes, artwork versions, specification versions,
 * approvals, and launch date changes into a single non-duplicated timeline.
 */

const { fmt } = require('../utils');

/**
 * Synthesize a unified chronological timeline for a project.
 * @param {object} project - Full project object
 * @param {string} [sortOrder='desc'] - 'desc' (latest first) or 'asc' (oldest first)
 * @returns {Array<object>} Consolidated timeline entries
 */
function getUnifiedTimeline(project, sortOrder = 'desc') {
  if (!project) return [];
  const events = [];
  const seenIds = new Set();

  // Helper to safely format timestamp
  const toMs = (val) => {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    const t = new Date(val).getTime();
    return isNaN(t) ? Date.now() : t;
  };

  const toDateStr = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  // 1. PROJECT CREATION
  if (project.createdAt) {
    const ts = toMs(project.createdAt);
    const id = `EVT-INIT-${project.id}`;
    seenIds.add(id);
    events.push({
      id,
      eventType: 'PROJECT_CREATED',
      category: 'project',
      timestamp: ts,
      dateStr: toDateStr(ts),
      title: 'Project Initialized',
      description: `Project "${project.projectName}" created with initial status "${project.status || 'On Track'}"`,
      user: project.createdBy || { name: 'System', role: 'system' },
      entityId: project.id,
      metadata: { projectName: project.projectName, briefDate: project.briefDate, targetLaunchDate: project.targetLaunchDate }
    });
  }

  // 2. STATUS TRANSITIONS (from project.statusHistory)
  if (Array.isArray(project.statusHistory)) {
    project.statusHistory.forEach((sh, idx) => {
      const ts = sh.timestamp ? toMs(sh.timestamp) : (toMs(project.createdAt) + idx);
      const id = sh.id || `EVT-STAT-${project.id}-${ts}-${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        events.push({
          id,
          eventType: 'STATUS_CHANGED',
          category: 'status',
          timestamp: ts,
          dateStr: sh.dateStr || toDateStr(ts),
          title: `Status Changed: ${sh.from || 'Initial'} ➔ ${sh.to}`,
          description: `Project status changed from "${sh.from || 'None'}" to "${sh.to}"${sh.reason ? ` — Reason: "${sh.reason}"` : ''}`,
          user: sh.user || { name: 'System', role: 'updater' },
          entityId: project.id,
          metadata: { fromStatus: sh.from, toStatus: sh.to, reason: sh.reason }
        });
      }
    });
  }

  // 3. WORKFLOW STAGE TRANSITIONS (from project.stageHistory and material.stageHistory)
  if (Array.isArray(project.stageHistory)) {
    project.stageHistory.forEach((st, idx) => {
      const ts = toMs(st.completedDate || st.timestamp);
      const id = st.id || `EVT-STG-${project.id}-${st.stage}-${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        events.push({
          id,
          eventType: 'STAGE_CHANGED',
          category: 'workflow',
          timestamp: ts,
          dateStr: toDateStr(ts),
          title: `Project Stage: ${st.stage}`,
          description: `Stage ${st.stage} completed by ${st.completedBy || 'User'}${st.variance ? ` (Variance: ${st.variance > 0 ? '+' : ''}${st.variance}d)` : ''}`,
          user: { name: st.completedBy || 'User', role: 'updater' },
          entityId: project.id,
          metadata: { stage: st.stage, plannedDate: st.plannedDate, completedDate: st.completedDate, variance: st.variance }
        });
      }
    });
  }

  // Material-level stage movements
  if (Array.isArray(project.materials)) {
    project.materials.forEach((m, mIdx) => {
      // Material Stage History
      if (Array.isArray(m.stageHistory)) {
        m.stageHistory.forEach((mst, idx) => {
          const ts = toMs(mst.completedDate || mst.timestamp);
          const id = `EVT-MSTG-${m.id || mIdx}-${mst.stage}-${idx}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            events.push({
              id,
              eventType: 'MATERIAL_STAGE_CHANGED',
              category: 'workflow',
              timestamp: ts,
              dateStr: toDateStr(ts),
              title: `${m.name}: ${mst.stage} Milestone Completed`,
              description: `Component "${m.name}" progressed past ${mst.stage} stage. Completed by ${mst.completedBy || 'User'}`,
              user: { name: mst.completedBy || 'User', role: 'updater' },
              entityId: m.id || `MAT-${mIdx}`,
              metadata: { materialName: m.name, pmCode: m.pmCode, stage: mst.stage, variance: mst.variance }
            });
          }
        });
      }

      // 4. ARTWORK VERSIONS
      if (Array.isArray(m.artworkVersions)) {
        m.artworkVersions.forEach((av, idx) => {
          const ts = toMs(av.uploadedAt || av.timestamp);
          const id = av.id || `EVT-ART-${m.id || mIdx}-v${av.version || (idx + 1)}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            events.push({
              id,
              eventType: av.status === 'Approved' ? 'ARTWORK_APPROVED' : 'ARTWORK_VERSION_CREATED',
              category: 'artwork',
              timestamp: ts,
              dateStr: toDateStr(ts),
              title: `Artwork v${av.version || (idx + 1)} (${m.artworkCode || m.name})`,
              description: `Artwork version ${av.version || (idx + 1)} (${av.status || 'Draft'}) with ${(av.files || []).length} file(s) for "${m.name}"`,
              user: av.uploadedBy || { name: 'Packaging Team', role: 'updater' },
              entityId: av.id || m.id,
              metadata: {
                version: av.version,
                status: av.status,
                artworkCode: m.artworkCode,
                materialName: m.name,
                approvalInfo: av.approvalInfo
              }
            });
          }
        });
      }

      // 5. SPECIFICATION VERSIONS
      if (Array.isArray(m.specSheetVersions)) {
        m.specSheetVersions.forEach((sv, idx) => {
          const ts = toMs(sv.createdAt || sv.timestamp);
          const id = sv.id || `EVT-SPEC-${m.id || mIdx}-v${sv.version || (idx + 1)}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            events.push({
              id,
              eventType: sv.status === 'APPROVED' ? 'SPECIFICATION_APPROVED' : 'SPECIFICATION_VERSION_CREATED',
              category: 'specification',
              timestamp: ts,
              dateStr: toDateStr(ts),
              title: `Spec v${sv.version || (idx + 1)} (${sv.revision || '1.0'}) · ${m.name}`,
              description: `Specification revision ${sv.revision || '1.0'} [${sv.status || 'DRAFT'}] recorded for "${m.name}"`,
              user: sv.createdBy || { name: 'Packaging Engineer', role: 'updater' },
              entityId: sv.id || m.id,
              metadata: {
                version: sv.version,
                revision: sv.revision,
                status: sv.status,
                materialName: m.name,
                changeNotes: sv.changeNotes
              }
            });
          }
        });
      }
    });
  }

  // 6. KEY AUDIT EVENTS & APPROVALS (from project.auditTrail)
  if (Array.isArray(project.auditTrail)) {
    project.auditTrail.forEach((entry, idx) => {
      // Prioritize high-value business events not already captured
      const isImportantEvent = [
        'PROJECT_RENAMED', 'LAUNCH_DATE_CHANGED', 'BRIEF_DATE_CHANGED',
        'ADMIN_SPEC_OVERRIDE', 'ADMIN_PO_OVERRIDE', 'SPEC_APPROVED_HEAD',
        'SPEC_CHECKED_PM', 'SPEC_SIGNOFF', 'SPEC_SIGNOFF_REVOKE',
        'PO_UPDATE', 'CRUNCH_PROPOSED', 'CRUNCH_STAGE1_APPROVED',
        'CRUNCH_FINAL_APPROVED', 'CRUNCH_REJECTED', 'PROJECT_DELETED',
        'PROJECT_RESTORED', 'SUPPLIER_UPDATE', 'FACTORY_UPDATE'
      ].includes(entry.action || entry.eventType);

      const ts = toMs(entry.timestamp);
      const id = entry.id || `EVT-AUDIT-${project.id}-${ts}-${idx}`;

      if (isImportantEvent && !seenIds.has(id)) {
        seenIds.add(id);
        events.push({
          id,
          eventType: entry.eventType || entry.action,
          category: 'governance',
          timestamp: ts,
          dateStr: entry.dateStr || toDateStr(ts),
          title: entry.title || 'Governance Event',
          description: entry.details || '',
          user: entry.user || { name: entry.by || 'User', email: entry.byEmail, role: entry.byRole, department: entry.byDept },
          entityId: entry.entityId || project.id,
          metadata: entry.metadata || { field: entry.field, oldValue: entry.oldValue, newValue: entry.newValue }
        });
      }
    });
  }

  // Sort chronologically
  events.sort((a, b) => {
    return sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
  });

  return events;
}

module.exports = { getUnifiedTimeline };

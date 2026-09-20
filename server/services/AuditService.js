'use strict';
/**
 * AuditService — Centralized audit & activity logging.
 *
 * Implements Pass 5 Structured Activity Event Model:
 *  - Entity: project, material, artwork, specification, risk
 *  - EventType: standardized business event identifiers
 *  - Before / After value tracking
 *  - Privacy / Security credential sanitization
 *  - 100% backward-compatible with legacy auditTrail & advanceLogs fields
 */

const store = require('../store');
const { LogsRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { generateActivityId } = require('./EntityIdService');

const SENSITIVE_KEYS = ['password', 'passwordhash', 'token', 'secret', 'temppw', 'defaultpw', 'cookie', 'authorization'];

/**
 * Recursively sanitize objects and values so credentials are never recorded in history.
 */
function sanitizeValue(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (/bearer\s+[A-Za-z0-9_.-]+/i.test(val)) return '[REDACTED_TOKEN]';
    return val;
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
        clean[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        clean[k] = sanitizeValue(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
  return val;
}

/**
 * Build a structured audit log entry adhering to the Pass 5 Activity Event Model.
 * @param {object} project  - The project being audited
 * @param {object} entry    - Event parameters
 * @param {object|null} user - The authenticated user
 * @returns {object} The standardized log entry
 */
function buildLogEntry(project, entry = {}, user = null) {
  const ts = entry.timestamp || Date.now();
  const dateObj = new Date(ts);
  const dateFormatted =
    dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const eventType = entry.eventType || entry.action || 'PROJECT_UPDATED';
  const entity = entry.entity || (entry.materialName ? 'material' : 'project');
  const entityId = entry.entityId || (entity === 'project' ? project.id : (entry.materialId || project.id));

  // Sanitize before/after and details
  const cleanOld = sanitizeValue(entry.oldValue);
  const cleanNew = sanitizeValue(entry.newValue);
  const cleanDetails = sanitizeValue(entry.details || '');
  const reason = entry.reason ? String(entry.reason).trim() : null;

  const metadata = sanitizeValue(entry.metadata || {
    field: entry.field || null,
    oldValue: cleanOld !== undefined ? cleanOld : null,
    newValue: cleanNew !== undefined ? cleanNew : null,
    reason,
    fromStage: entry.from || null,
    toStage: entry.to || null,
    materialName: entry.materialName || null,
    materialId: entry.materialId || null,
    version: entry.version || null
  });

  const userInfo = user ? {
    name: user.name || 'User',
    email: user.email || '',
    role: user.role || 'updater',
    department: user.department || ''
  } : {
    name: 'System',
    email: 'system@yogabar.com',
    role: 'system',
    department: 'Automated Service'
  };

  return {
    // Standard Pass 5 fields
    id: entry.id || generateActivityId(),
    eventType,
    entity,
    entityId,
    projectId: project.id,
    projectName: project.projectName,
    fgCode: project.fgCode || '',
    title: entry.title || 'Project Activity',
    details: cleanDetails,
    user: userInfo,
    metadata,
    reason,
    timestamp: ts,
    dateStr: dateFormatted,

    // Backward compatibility fields for client UI & existing test suites
    action: entry.action || eventType,
    field: entry.field || metadata.field || null,
    oldValue: cleanOld !== undefined ? cleanOld : null,
    newValue: cleanNew !== undefined ? cleanNew : null,
    materialName: entry.materialName || null,
    from: entry.from || null,
    to: entry.to || null,
    by: userInfo.name,
    byEmail: userInfo.email,
    byRole: userInfo.role,
    byDept: userInfo.department
  };
}

/**
 * Record an audit activity for a project.
 * Writes to: project.auditTrail, store.advanceLogs, PostgreSQL (non-blocking).
 *
 * @param {object} project
 * @param {object} entry
 * @param {object|null} user
 * @returns {object} The log entry
 */
function logActivity(project, entry, user) {
  const logEntry = buildLogEntry(project, entry, user);

  // 1. Project-level audit trail for backtracking (capped at 500)
  project.auditTrail = project.auditTrail || [];
  project.auditTrail.unshift(logEntry);
  if (project.auditTrail.length > 500) project.auditTrail = project.auditTrail.slice(0, 500);

  // 2. Global activity logs for live notifications & system stream (capped at 1000)
  store.advanceLogs = store.advanceLogs || [];
  store.advanceLogs.unshift(logEntry);
  if (store.advanceLogs.length > 1000) store.advanceLogs = store.advanceLogs.slice(0, 1000);

  // 3. PostgreSQL persistence (non-blocking — never throws to caller)
  if (isDbAvailable()) {
    LogsRepo.add(logEntry).catch(() => {
      // Intentionally silenced — logging failure must never break the request
    });
  }

  return logEntry;
}

/**
 * Record a stage advance or revoke event.
 *
 * @param {object} project
 * @param {string} from  - Stage advanced/revoked from
 * @param {string} to    - Stage advanced/revoked to
 * @param {string} type  - 'ADVANCE' | 'REVOKE'
 * @param {object|null} user
 * @param {string} extraDetails - Optional additional context
 * @param {string|null} reason - Optional user-provided reason
 * @returns {object} The log entry
 */
function logAdvance(project, from, to, type, user, extraDetails = '', reason = null) {
  const isRevoke = type === 'REVOKE';
  const title = isRevoke ? `Revoked: ${from} ↩ ${to}` : `Advanced: ${from} ▶ ${to}`;
  const details =
    extraDetails ||
    (isRevoke
      ? `Moved project/material backward from ${from} to ${to}`
      : `Progressed from ${from} to ${to}`);

  return logActivity(
    project,
    {
      eventType: isRevoke ? 'STAGE_REVOKE' : 'STAGE_ADVANCE',
      action: isRevoke ? 'STAGE_REVOKE' : 'STAGE_ADVANCE',
      title,
      details,
      from,
      to,
      reason,
      metadata: { fromStage: from, toStage: to, type, reason }
    },
    user
  );
}

/**
 * Retrieve a project's audit trail (latest first).
 * @param {object} project
 * @returns {Array}
 */
function getAuditTrail(project) {
  return project.auditTrail || [];
}

module.exports = {
  logActivity,
  logAdvance,
  getAuditTrail,
  buildLogEntry,
  sanitizeValue
};

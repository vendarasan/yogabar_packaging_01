'use strict';
/**
 * permissions.js — Permission-based RBAC layer.
 *
 * This module sits on top of the existing role system and provides
 * fine-grained permission controls WITHOUT breaking any existing roles or
 * `requireAdmin`/`requireUpdater`/`requireSuperAdmin` middleware.
 *
 * Design:
 *  - PERMISSION_ROLES maps each permission → list of allowed roles
 *  - requirePermission(perm) returns an Express middleware
 *  - auth.js populates req.user.permissions from this map
 *
 * To add a new permission:
 *   1. Add it to PERMISSION_ROLES with the roles that may perform it
 *   2. Use requirePermission('new.permission') in the route
 *
 * To add a new role with specific permissions:
 *   1. Add the role to the relevant permission entries in PERMISSION_ROLES
 *   2. The rest is automatic
 */

/** Map of permission key → array of roles that hold that permission */
const PERMISSION_ROLES = {
  // ── Project lifecycle ──────────────────────────────────────────────
  'project.view':           ['viewer', 'updater', 'editor', 'admin', 'superadmin', 'supplier'],
  'project.create':         ['admin', 'superadmin'],
  'project.update':         ['admin', 'superadmin'],
  'project.delete':         ['superadmin'],
  'project.advance':        ['updater', 'editor', 'admin', 'superadmin'],
  'project.revoke':         ['admin', 'superadmin'],
  'project.launch':         ['admin', 'superadmin'],
  'project.brief_date':     ['admin', 'superadmin'],

  // ── Inline edits (field-level) ─────────────────────────────────────
  'project.edit.fgcode':    ['updater', 'editor', 'admin', 'superadmin'],
  'project.edit.supplier':  ['updater', 'editor', 'admin', 'superadmin'],
  'project.edit.factory':   ['updater', 'editor', 'admin', 'superadmin'],
  'project.edit.description': ['updater', 'editor', 'admin', 'superadmin'],
  'project.edit.status':    ['admin', 'superadmin'],
  'project.edit.risk':      ['updater', 'editor', 'admin', 'superadmin'],

  // ── Material operations ────────────────────────────────────────────
  'material.advance':       ['updater', 'editor', 'admin', 'superadmin'],
  'material.artwork.upload': ['updater', 'editor', 'admin', 'superadmin', 'supplier'],
  'material.spec.update':   ['updater', 'editor', 'admin', 'superadmin'],
  'material.spec.signoff':  ['admin', 'superadmin'],
  'material.po.update':     ['updater', 'editor', 'admin', 'superadmin', 'supplier'],
  'material.pmcode.update': ['admin', 'superadmin'],

  // ── Crunch timeline approval ───────────────────────────────────────
  'crunch.approve.stage1':  ['admin', 'superadmin'],
  'crunch.approve.stage2':  ['superadmin'],

  // ── Spec library ──────────────────────────────────────────────────
  'spec.view':              ['viewer', 'updater', 'editor', 'admin', 'superadmin', 'supplier'],
  'spec.create':            ['admin', 'superadmin'],
  'spec.update':            ['admin', 'superadmin'],
  'spec.delete':            ['superadmin'],

  // ── User management ───────────────────────────────────────────────
  'user.view':              ['admin', 'superadmin'],
  'user.manage':            ['superadmin'],
  'user.password.reset':    ['superadmin'],

  // ── Audit & reporting ─────────────────────────────────────────────
  'audit.view':             ['viewer', 'updater', 'editor', 'admin', 'superadmin'],
  'logs.view':              ['viewer', 'updater', 'editor', 'admin', 'superadmin'],
  'logs.export':            ['admin', 'superadmin'],

  // ── Risk & RACI ───────────────────────────────────────────────────
  'risk.view':              ['viewer', 'updater', 'editor', 'admin', 'superadmin'],
  'risk.manage':            ['admin', 'superadmin'],
  'raci.view':              ['viewer', 'updater', 'editor', 'admin', 'superadmin'],
  'raci.manage':            ['admin', 'superadmin']
};

/**
 * Get all permissions granted to a given role.
 * @param {string} role
 * @returns {string[]} Array of permission keys
 */
function getPermissionsForRole(role) {
  if (!role) return [];
  return Object.keys(PERMISSION_ROLES).filter(
    perm => PERMISSION_ROLES[perm].includes(role)
  );
}

/**
 * Check if a role has a specific permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
function roleHasPermission(role, permission) {
  const roles = PERMISSION_ROLES[permission];
  if (!roles) return false;
  return roles.includes(role);
}

/**
 * Express middleware factory — require a specific permission.
 * Falls back gracefully if req.user is not set (returns 401).
 *
 * Usage: router.post('/', authMiddleware, requirePermission('project.create'), handler)
 *
 * @param {string} permission - The permission key to require
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    }
    const role = req.user.role;
    if (!roleHasPermission(role, permission)) {
      return res.status(403).json({
        error: `Access Denied: Permission '${permission}' required.`,
        code: 'FORBIDDEN',
        requiredPermission: permission,
        yourRole: role
      });
    }
    next();
  };
}

module.exports = {
  PERMISSION_ROLES,
  getPermissionsForRole,
  roleHasPermission,
  requirePermission
};

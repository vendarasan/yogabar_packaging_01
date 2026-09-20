const store = require('../store');
const { SUPERADMIN } = require('../constants');
const { SessionsRepo, UsersRepo } = require('../db/repository');
const { getPermissionsForRole } = require('./permissions');

async function authMiddleware(req, res, next) {
  let token = req.cookies && req.cookies.pkg_session;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  // Super-admin bypass
  if (token === '__superadmin__') {
    req.user = {
      email: SUPERADMIN.email || 'alexsander@company.com',
      name: SUPERADMIN.name || 'Alexsander',
      role: 'superadmin',
      title: SUPERADMIN.title || 'Packaging Lead',
      team: SUPERADMIN.team || 'Packaging Leadership',
      department: SUPERADMIN.department || 'Global Packaging Leadership',
      mobile: SUPERADMIN.mobile || '+91 98765 43210',
      avatar: SUPERADMIN.avatar || '',
      color: SUPERADMIN.color || '#ef4444',
      permissions: getPermissionsForRole('superadmin')
    };
    return next();
  }

  try {
    // 1. Check PostgreSQL sessions table
    let email = null;
    try {
      email = await SessionsRepo.get(token);
    } catch (dbErr) {
      // Fallback to in-memory if DB is temporarily disconnected
      email = null;
    }

    if (!email) {
      email = store.sessions[token];
    }

    if (!email) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // 2. Check PostgreSQL users table
    let user = null;
    try {
      user = await UsersRepo.getByEmail(email);
    } catch (dbErr) {
      user = null;
    }

    if (!user) {
      user = store.users[email];
    }

    if (!user) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    req.user = {
      email: user.email || email,
      name: user.name,
      role: user.role,
      title: user.title || '',
      team: user.team || '',
      department: user.department || '',
      mobile: user.mobile || '',
      avatar: user.avatar || '',
      color: user.color,
      supplierName: user.supplierName || null,
      organizationId: user.organizationId || 'org-yogabar-main',
      permissions: getPermissionsForRole(user.role)
    };
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(500).json({ error: 'Authentication verification error' });
  }
}

function requireSuperAdmin(req, res, next) {
  const role = req.user && req.user.role;
  if (role !== 'superadmin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin role required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  const role = req.user && req.user.role;
  if (!['admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Access Denied: Admin or Super Admin role required.' });
  }
  next();
}

function requireUpdater(req, res, next) {
  const role = req.user && req.user.role;
  if (!['updater', 'editor', 'admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Access Denied: Updater, Admin or Super Admin role required.' });
  }
  next();
}

/**
 * Filter and sanitize project representation for external supplier users.
 * Strips internal risks, internal comments, and unauthorized components.
 */
function filterProjectForSupplier(project, supplierName) {
  if (!project) return null;
  if (!supplierName) return null;

  const suppLower = supplierName.toLowerCase().trim();
  const projSuppMatches = (project.supplier || '').toLowerCase().trim() === suppLower;
  const authorizedMats = (project.materials || []).filter(m =>
    (m.supplier || project.supplier || '').toLowerCase().trim() === suppLower
  );

  if (!projSuppMatches && authorizedMats.length === 0) {
    return null;
  }

  return {
    id: project.id,
    projectName: project.projectName,
    fgCode: project.fgCode,
    skuSize: project.skuSize || project.grammage,
    projectCategory: project.projectCategory,
    projectType: project.projectType,
    stage: project.stage,
    status: project.status,
    supplier: supplierName,
    briefDate: project.briefDate,
    targetLaunchDate: project.targetLaunchDate,
    materials: authorizedMats.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      pmCode: m.pmCode,
      artworkCode: m.artworkCode,
      supplier: m.supplier || project.supplier,
      stage: m.stage,
      poStatus: m.poStatus,
      poNumber: m.poNumber,
      artworkApproved: m.artworkApproved,
      artworkStatus: m.artworkStatus,
      specSignoff: m.specSignoff,
      specSheet: m.specSheet ? {
        dimensions: m.specSheet.dimensions,
        technicalDetails: m.specSheet.technicalDetails,
        governance: m.specSheet.governance
      } : null,
      artworkVersions: (m.artworkVersions || []).map(v => ({
        version: v.version,
        filename: v.filename,
        uploadedAt: v.uploadedAt,
        status: v.status
      }))
    })),
    // Completely redact internal governance & financial items
    risks: [],
    comments: '',
    auditTrail: []
  };
}

/**
 * Middleware ensuring supplier users cannot access unauthorized project details.
 */
function requireSupplierScope(req, res, next) {
  if (!req.user || req.user.role !== 'supplier') {
    return next();
  }

  if (!req.user.supplierName) {
    return res.status(403).json({ error: 'Access Denied: Supplier user has no assigned supplier organization' });
  }

  next();
}

const requireEditor = requireUpdater;
const requireAuth = authMiddleware;

module.exports = {
  authMiddleware,
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireUpdater,
  requireEditor,
  filterProjectForSupplier,
  requireSupplierScope
};

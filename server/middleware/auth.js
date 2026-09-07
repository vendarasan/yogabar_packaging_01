const store = require('../store');

function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.pkg_session;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  // Super-admin bypass
  if (token === '__superadmin__') {
    req.user = { email: 'admin', name: 'Super Admin', role: 'superadmin', color: '#ff5252' };
    return next();
  }

  const email = store.sessions[token];
  if (!email || !store.users[email]) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = store.users[email];
  req.user = { email, name: user.name, role: user.role, color: user.color };
  next();
}

function requireEditor(req, res, next) {
  const role = req.user && req.user.role;
  if (!['admin', 'editor', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Editor or Admin role required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  const role = req.user && req.user.role;
  if (!['admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

module.exports = { authMiddleware, requireEditor, requireAdmin };

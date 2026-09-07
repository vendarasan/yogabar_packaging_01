const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const store = require('../store');
const { hashPass, genTempPass } = require('../utils');
const { SUPERADMIN } = require('../constants');
const { authMiddleware } = require('../middleware/auth');

// GET /api/auth/me — restore session
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email: rawEmail, password } = req.body;
  if (!rawEmail || !password) return res.status(400).json({ error: 'Email and password required' });
  const email = rawEmail.trim().toLowerCase();

  // Super-admin bypass
  if (email === 'admin') {
    if (password !== SUPERADMIN.pass) return res.status(401).json({ error: 'Incorrect admin password' });
    const token = '__superadmin__';
    res.cookie('pkg_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ user: { email: 'admin', name: SUPERADMIN.name, role: 'superadmin', color: SUPERADMIN.color } });
  }

  const user = store.users[email];
  if (!user) return res.status(401).json({ error: 'Account not found. Please sign up.' });

  const hash = hashPass(password);
  let matched = hash === user.passwordHash;

  // Temp password check
  if (!matched && user.tempPw && password === user.tempPw) {
    matched = true;
    user.mustChangePw = true;
    user.tempPw = null;
  }

  if (!matched) return res.status(401).json({ error: 'Incorrect password' });

  const token = uuidv4();
  store.sessions[token] = email;
  res.cookie('pkg_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({
    user: { email, name: user.name, role: user.role, color: user.color },
    mustChangePw: !!user.mustChangePw
  });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email: rawEmail, password, confirmPassword } = req.body;
  if (!name || !rawEmail || !password) return res.status(400).json({ error: 'All fields required' });
  const email = rawEmail.trim().toLowerCase();

  if (store.users[email]) return res.status(409).json({ error: 'Account already exists. Please sign in.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

  const colors = ['#00d4c8','#00b4f0','#76ff03','#ff6d00','#e040fb','#ffd740','#ff4081'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  store.users[email] = {
    name: name.trim(),
    role: 'viewer',
    color,
    passwordHash: hashPass(password),
    mustChangePw: false,
    tempPw: null
  };

  const token = uuidv4();
  store.sessions[token] = email;
  res.cookie('pkg_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { email, name: name.trim(), role: 'viewer', color } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.pkg_session;
  if (token && token !== '__superadmin__') {
    delete store.sessions[token];
  }
  res.clearCookie('pkg_session');
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email: rawEmail } = req.body;
  if (!rawEmail) return res.status(400).json({ error: 'Email required' });
  const email = rawEmail.trim().toLowerCase();
  const user = store.users[email];
  if (!user) return res.status(404).json({ error: 'Account not found' });
  const tp = genTempPass();
  user.tempPw = tp;
  user.mustChangePw = true;
  res.json({ tempPassword: tp });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, (req, res) => {
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) return res.status(400).json({ error: 'Both fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (req.user.email === 'admin') return res.status(400).json({ error: 'Cannot change super admin password this way' });

  const user = store.users[req.user.email];
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.passwordHash = hashPass(password);
  user.mustChangePw = false;
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const store = require('../store');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// GET /api/logs — Activity log (admin only)
router.get('/', authMiddleware, requireAdmin, (req, res) => {
  res.json({ logs: store.advanceLogs });
});

// GET /api/logs/seen-at — Return user's last-seen timestamp
router.get('/seen-at', authMiddleware, (req, res) => {
  const key = `seen_${req.user.email}`;
  res.json({ seenAt: store[key] || 0 });
});

// POST /api/logs/mark-seen — Mark all notifications as seen
router.post('/mark-seen', authMiddleware, (req, res) => {
  const key = `seen_${req.user.email}`;
  store[key] = Date.now();
  res.json({ ok: true, seenAt: store[key] });
});

module.exports = router;

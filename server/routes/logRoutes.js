const express = require('express');
const router = express.Router();
const store = require('../store');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { LogsRepo } = require('../db/repository');

// GET /api/logs — Activity log (admin only)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  let logs = [];
  try {
    logs = await LogsRepo.getAll();
  } catch (err) {
    console.warn('[Logs] DB query failed, falling back to in-memory store:', err.message);
    logs = store.advanceLogs || [];
  }

  // Server-side pagination support (Enterprise Pass 6)
  const page = parseInt(req.query.page, 10);
  const limit = parseInt(req.query.limit, 10);
  if (!isNaN(page) && page > 0 && !isNaN(limit) && limit > 0) {
    const total = logs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = logs.slice(startIndex, startIndex + limit);
    return res.json({
      logs: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }

  return res.json({ logs });
});

// GET /api/logs/seen-at — Return user's last-seen timestamp
router.get('/seen-at', authMiddleware, async (req, res) => {
  const key = `seen_${req.user.email}`;
  try {
    const seenAt = await LogsRepo.getSeenAt(req.user.email);
    return res.json({ seenAt: seenAt || store[key] || 0 });
  } catch (err) {
    return res.json({ seenAt: store[key] || 0 });
  }
});

// POST /api/logs/mark-seen — Mark all notifications as seen
router.post('/mark-seen', authMiddleware, async (req, res) => {
  const key = `seen_${req.user.email}`;
  const now = Date.now();
  store[key] = now;
  try {
    await LogsRepo.setSeenAt(req.user.email, now);
  } catch (err) {
    console.warn('[Logs] DB setSeenAt failed:', err.message);
  }
  return res.json({ ok: true, seenAt: now });
});

module.exports = router;


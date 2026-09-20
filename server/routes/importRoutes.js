'use strict';
/**
 * importRoutes.js — Controlled Data Import Endpoints for Pass 8.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const importService = require('../services/ImportService');

router.use(authMiddleware);

// POST /api/v1/import/validate — Dry-run validation of records before committing
router.post('/validate', asyncHandler(async (req, res) => {
  const records = req.body.records || req.body;
  const result = await importService.validateImport(records);
  res.json({ result });
}));

// POST /api/v1/import/commit — Execute controlled import into the platform
router.post('/commit', requireAdmin, asyncHandler(async (req, res) => {
  const records = req.body.records || req.body;
  const result = await importService.commitImport(records, req.user);
  res.status(201).json({ result });
}));

module.exports = router;

'use strict';
/**
 * dataQualityRoutes.js — Enterprise Data Quality & Anomaly Reporting Endpoints for Pass 8.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const dataQualityService = require('../services/DataQualityService');

router.use(authMiddleware);

// GET /api/v1/data-quality/audit — Run comprehensive data quality assessment
router.get('/audit', asyncHandler(async (req, res) => {
  const auditResult = await dataQualityService.runAudit();
  res.json({ audit: auditResult });
}));

module.exports = router;

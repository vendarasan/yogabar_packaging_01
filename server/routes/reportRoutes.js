'use strict';
/**
 * reportRoutes.js — Authoritative Reporting & Analytics Endpoints for Pass 8.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const reportService = require('../services/ReportService');

router.use(authMiddleware);

// GET /api/v1/reports/project-review/:projectId — Detailed Executive Project Review
router.get('/project-review/:projectId', asyncHandler(async (req, res) => {
  const report = await reportService.getProjectReviewReport(req.params.projectId, req.user);
  res.json({ report });
}));

// GET /api/v1/reports/management — Aggregated Management KPIs
router.get('/management', asyncHandler(async (req, res) => {
  const report = await reportService.getManagementReport();
  res.json({ report });
}));

// GET /api/v1/reports/suppliers — Fact-based Supplier Performance
router.get('/suppliers', asyncHandler(async (req, res) => {
  const report = await reportService.getSupplierPerformanceReport();
  res.json({ report });
}));

// GET /api/v1/reports/stages — Historical Stage Cycle Time Analytics
router.get('/stages', asyncHandler(async (req, res) => {
  const report = await reportService.getStageAnalyticsReport();
  res.json({ report });
}));

module.exports = router;

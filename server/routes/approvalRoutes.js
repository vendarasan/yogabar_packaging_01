'use strict';
/**
 * approvalRoutes.js — Universal Approval Framework Endpoints.
 */

const express = require('express');
const router = express.Router();
const ApprovalService = require('../services/ApprovalService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/approvals
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { projectId, status, entityType } = req.query;
  const approvals = await ApprovalService.getApprovals({ projectId, status, entityType });
  res.json({ success: true, count: approvals.length, approvals });
}));

// GET /api/approvals/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const approval = await ApprovalService.getApprovalById(req.params.id);
  if (!approval) {
    return res.status(404).json({ success: false, error: 'Approval not found' });
  }
  res.json({ success: true, approval });
}));

// POST /api/approvals
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const approval = await ApprovalService.createApproval(req.body, req.user);
  res.status(201).json({ success: true, approval });
}));

// POST /api/approvals/:id/decide
router.post('/:id/decide', requireAuth, asyncHandler(async (req, res) => {
  const { decision, comments } = req.body;
  const approval = await ApprovalService.decide(req.params.id, { decision, comments }, req.user);
  res.json({ success: true, approval });
}));

// POST /api/approvals/:id/cancel
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const approval = await ApprovalService.cancelApproval(req.params.id, req.user);
  res.json({ success: true, approval });
}));

module.exports = router;

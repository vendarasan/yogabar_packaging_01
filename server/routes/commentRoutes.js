'use strict';
/**
 * commentRoutes.js — Contextual Commenting Endpoints.
 */

const express = require('express');
const router = express.Router();
const CommentService = require('../services/CommentService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/comments
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { contextType, contextId, projectId } = req.query;
  const comments = await CommentService.getComments({ contextType, contextId, projectId });
  res.json({ success: true, count: comments.length, comments });
}));

// POST /api/comments
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const comment = await CommentService.addComment(req.body, req.user);
  res.status(201).json({ success: true, comment });
}));

// DELETE /api/comments/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const deleted = await CommentService.deleteComment(req.params.id, req.user);
  res.json({ success: true, deleted });
}));

module.exports = router;

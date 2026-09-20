'use strict';
/**
 * taskRoutes.js — Task & Action Item Management Endpoints.
 */

const express = require('express');
const router = express.Router();
const TaskService = require('../services/TaskService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/tasks
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { projectId, status, assignedTo, stage } = req.query;
  const tasks = await TaskService.getTasks({ projectId, status, assignedTo, stage });
  res.json({ success: true, count: tasks.length, tasks });
}));

// GET /api/tasks/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const task = await TaskService.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, task });
}));

// POST /api/tasks
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const task = await TaskService.createTask(req.body, req.user);
  res.status(201).json({ success: true, task });
}));

// PUT /api/tasks/:id
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const task = await TaskService.updateTask(req.params.id, req.body, req.user);
  res.json({ success: true, task });
}));

// POST /api/tasks/:id/complete
router.post('/:id/complete', requireAuth, asyncHandler(async (req, res) => {
  const task = await TaskService.completeTask(req.params.id, req.user);
  res.json({ success: true, task });
}));

// DELETE /api/tasks/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const deleted = await TaskService.deleteTask(req.params.id, req.user);
  res.json({ success: true, deleted });
}));

module.exports = router;

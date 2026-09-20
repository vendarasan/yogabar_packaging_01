'use strict';
/**
 * notificationRoutes.js — Notification Center & Preferences Endpoints.
 */

const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/notifications
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userEmail = req.user?.email || req.user?.name;
  const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

  const notifications = await NotificationService.getUserNotifications(userEmail, { isRead, limit });
  const unreadCount = (await NotificationService.getUserNotifications(userEmail, { isRead: false })).length;

  res.json({ success: true, count: notifications.length, unreadCount, notifications });
}));

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const userEmail = req.user?.email || req.user?.name;
  const notification = await NotificationService.markAsRead(req.params.id, userEmail);
  res.json({ success: true, notification });
}));

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  const userEmail = req.user?.email || req.user?.name;
  await NotificationService.markAllAsRead(userEmail);
  res.json({ success: true, message: 'All notifications marked as read' });
}));

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, asyncHandler(async (req, res) => {
  const userEmail = req.user?.email || req.user?.name;
  const preferences = await NotificationService.getUserPreferences(userEmail);
  res.json({ success: true, preferences });
}));

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth, asyncHandler(async (req, res) => {
  const userEmail = req.user?.email || req.user?.name;
  const preferences = await NotificationService.updateUserPreferences(userEmail, req.body);
  res.json({ success: true, preferences });
}));

module.exports = router;

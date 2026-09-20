'use strict';
/**
 * webhookRoutes.js — Webhook Management & Delivery Operations for Pass 8.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { webhookService } = require('../services/WebhookService');

// All webhook management routes require Admin or SuperAdmin permissions
router.use(authMiddleware, requireAdmin);

// GET /api/v1/webhooks — List all registered webhooks
router.get('/', asyncHandler(async (req, res) => {
  const webhooks = await webhookService.getWebhooks();
  res.json({ webhooks });
}));

// POST /api/v1/webhooks — Register a new webhook
router.post('/', asyncHandler(async (req, res) => {
  const newWebhook = await webhookService.createWebhook(req.body, req.user);
  res.status(201).json({ webhook: newWebhook });
}));

// GET /api/v1/webhooks/:id — Get webhook by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const webhook = await webhookService.getWebhookById(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ webhook });
}));

// PUT /api/v1/webhooks/:id — Update webhook configuration
router.put('/:id', asyncHandler(async (req, res) => {
  const updated = await webhookService.updateWebhook(req.params.id, req.body);
  res.json({ webhook: updated });
}));

// DELETE /api/v1/webhooks/:id — Delete a webhook
router.delete('/:id', asyncHandler(async (req, res) => {
  await webhookService.deleteWebhook(req.params.id);
  res.json({ success: true, message: 'Webhook deleted successfully' });
}));

// GET /api/v1/webhooks/:id/deliveries — View delivery history
router.get('/:id/deliveries', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const deliveries = await webhookService.getDeliveries(req.params.id, limit);
  res.json({ deliveries });
}));

// POST /api/v1/webhooks/:id/test — Send a test ping event
router.post('/:id/test', asyncHandler(async (req, res) => {
  const delivery = await webhookService.testWebhook(req.params.id);
  res.json({ success: true, delivery });
}));

// POST /api/v1/webhooks/deliveries/:deliveryId/retry — Manual retry for a failed delivery
router.post('/deliveries/:deliveryId/retry', asyncHandler(async (req, res) => {
  const retried = await webhookService.retryDelivery(req.params.deliveryId);
  res.json({ success: true, delivery: retried });
}));

module.exports = router;

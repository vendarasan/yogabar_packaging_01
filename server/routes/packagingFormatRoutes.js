'use strict';
/**
 * packagingFormatRoutes.js — REST endpoints for Packaging Format master data.
 */

const express = require('express');
const router = express.Router();
const { PackagingFormatsRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  MAT_TYPES,
  MAT_LEAD_DAYS,
  PKG_HIERARCHY_TIERS,
  POUCH_MAT_TYPES,
  getTierName
} = require('../constants');
const { PM_CODE_PREFIXES } = require('../utils');

// Helper for fallback formats when DB is not reachable
function getFallbackFormats() {
  return MAT_TYPES.map((name, idx) => {
    const tier = PKG_HIERARCHY_TIERS[name] || 5;
    return {
      id: `PF-${String(idx + 1).padStart(2, '0')}`,
      name,
      codePrefix: PM_CODE_PREFIXES[name] || 'PM/PR/GEN/',
      category: getTierName(tier),
      hierarchyTier: tier,
      defaultLeadTimeDays: MAT_LEAD_DAYS[name] || 15,
      isPouch: POUCH_MAT_TYPES.includes(name),
      description: `${name} standard packaging format`,
      isActive: true
    };
  });
}

// GET /api/packaging-formats — List all active packaging formats
router.get('/', asyncHandler(async (req, res) => {
  if (isDbAvailable()) {
    try {
      const formats = await PackagingFormatsRepo.getAll(req.query.includeInactive === 'true');
      if (formats && formats.length > 0) {
        return res.json({ success: true, count: formats.length, formats });
      }
    } catch (err) {
      console.warn('⚠️ Falling back to static formats due to DB error:', err.message);
    }
  }
  const fallback = getFallbackFormats();
  res.json({ success: true, count: fallback.length, formats: fallback });
}));

// GET /api/packaging-formats/:id — Get single format by ID
router.get('/:id', asyncHandler(async (req, res) => {
  if (isDbAvailable()) {
    try {
      const format = await PackagingFormatsRepo.getById(req.params.id);
      if (format) {
        return res.json({ success: true, format });
      }
    } catch (err) {
      console.warn('⚠️ Falling back to static format due to DB error:', err.message);
    }
  }
  const fallback = getFallbackFormats().find(f => f.id === req.params.id || f.name.toLowerCase() === req.params.id.toLowerCase());
  if (!fallback) {
    return res.status(404).json({ success: false, error: 'Packaging format not found' });
  }
  res.json({ success: true, format: fallback });
}));

// POST /api/packaging-formats — Create new packaging format (Admin only)
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id, name, codePrefix, category, hierarchyTier, defaultLeadTimeDays, isPouch, description } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Packaging format name is required' });
  }
  const formatId = id || `PF-${Date.now().toString().slice(-4)}`;
  const format = await PackagingFormatsRepo.create({
    id: formatId,
    name,
    codePrefix,
    category,
    hierarchyTier,
    defaultLeadTimeDays,
    isPouch,
    description
  });
  res.status(201).json({ success: true, format });
}));

// PUT /api/packaging-formats/:id — Update packaging format (Admin only)
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await PackagingFormatsRepo.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Packaging format not found' });
  }
  res.json({ success: true, format: updated });
}));

// DELETE /api/packaging-formats/:id — Soft-delete packaging format (Admin only)
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await PackagingFormatsRepo.delete(req.params.id);
  res.json({ success: true, deleted });
}));

module.exports = router;

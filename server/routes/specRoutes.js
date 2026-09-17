const express = require('express');
const router = express.Router();
const store = require('../store');
const { authMiddleware, requireUpdater, requireAdmin } = require('../middleware/auth');
const { SpecLibraryRepo, ProjectsRepo, LogsRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { convertPdfToNewSpecFormat, convertTextToSpecSheet } = require('../utils/specPdfParser');

// ── 1. POST /api/specs/convert-pdf — Convert uploaded PDF to new spec format
router.post('/convert-pdf', authMiddleware, requireUpdater, async (req, res) => {
  try {
    const { fileData, fileName = 'spec.pdf', rawText } = req.body;

    // Case A: User supplied raw text directly
    if (rawText && typeof rawText === 'string') {
      const specSheet = convertTextToSpecSheet(rawText, fileName, fileData || null);
      return res.json({
        success: true,
        specSheet,
        summary: {
          category: specSheet.category,
          docName: specSheet.docHeader.docName,
          itemCode: specSheet.docHeader.itemCode,
          artworkCode: specSheet.docHeader.artworkCode,
          parametersExtracted: specSheet.parameters.length,
          testsExtracted: specSheet.performanceTests.length
        }
      });
    }

    // Case B: PDF base64 file data supplied
    if (!fileData) {
      return res.status(400).json({ error: 'PDF file data or extracted raw text required.' });
    }

    // Clean data URL prefix if present
    const base64Data = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    if (pdfBuffer.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty PDF file payload.' });
    }

    const conversion = await convertPdfToNewSpecFormat(pdfBuffer, fileName, fileData);

    return res.json(conversion);
  } catch (err) {
    console.error('Spec PDF conversion error:', err);
    return res.status(500).json({ error: 'Failed to convert PDF specification: ' + err.message });
  }
});

// ── 2. GET /api/specs/library — Retrieve all saved Spec Library items
router.get('/library', authMiddleware, async (req, res) => {
  if (isDbAvailable()) {
    try {
      const dbSpecs = await SpecLibraryRepo.getAll();
      if (dbSpecs && dbSpecs.length > 0) {
        store.specLibrary = dbSpecs;
        return res.json({ specs: dbSpecs });
      }
    } catch (err) {
      console.warn('[SpecLibrary] DB query failed, falling back to local store:', err.message);
    }
  }
  return res.json({ specs: store.specLibrary || [] });
});

// ── 3. POST /api/specs/library — Save a converted spec into the Spec Library
router.post('/library', authMiddleware, requireUpdater, async (req, res) => {
  try {
    const {
      specName,
      itemCode,
      category,
      materialType,
      revision,
      specData,
      sourcePdfName,
      sourcePdfData,
      projectId,
      projectName,
      materialIdx,
      materialName
    } = req.body;

    if (!specData || !specName) {
      return res.status(400).json({ error: 'specName and specData are required.' });
    }

    const id = 'SPEC-LIB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const newRecord = {
      id,
      specName: specName.trim(),
      itemCode: itemCode || specData.docHeader?.itemCode || '',
      category: category || specData.category || 'generic',
      materialType: materialType || specData.general?.materialType || '',
      revision: revision || specData.docHeader?.revision || '0.0',
      projectId: projectId || null,
      projectName: projectName || '',
      materialName: materialName || '',
      sourcePdfName: sourcePdfName || specData.sourcePdf?.fileName || '',
      sourcePdfData: sourcePdfData || specData.sourcePdf?.dataUrl || null,
      specData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to memory cache & persist locally
    store.specLibrary = store.specLibrary || [];
    store.specLibrary.unshift(newRecord);
    if (typeof store.saveLocalStore === 'function') {
      store.saveLocalStore();
    }

    // Save to PostgreSQL DB if connected
    if (isDbAvailable()) {
      try {
        await SpecLibraryRepo.create(newRecord);
      } catch (dbErr) {
        console.warn('[SpecLibraryRepo] DB create failed, saved locally:', dbErr.message);
      }
    }

    // If target project and material were chosen, apply directly to the project material as well!
    if (projectId && materialIdx !== undefined && materialIdx !== null) {
      const p = store.projects.find(x => x.id === projectId);
      if (p && p.materials && p.materials[materialIdx]) {
        p.materials[materialIdx].specSheet = specData;
        p.materials[materialIdx].pmCode = newRecord.itemCode || p.materials[materialIdx].pmCode;
        if (specData.docHeader?.artworkCode) {
          p.materials[materialIdx].artworkCode = specData.docHeader.artworkCode;
        }

        // Project audit logging
        const logEntry = {
          id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          projectId: p.id,
          projectName: p.projectName,
          fgCode: p.fgCode || '',
          action: 'SPEC_IMPORT_CONVERT',
          title: 'Specification Converted & Assigned',
          details: `Imported and converted specification '${newRecord.specName}' from PDF (${newRecord.sourcePdfName || 'uploaded PDF'}) and assigned to '${p.materials[materialIdx].name}'`,
          materialName: p.materials[materialIdx].name,
          by: req.user ? req.user.name : 'System',
          byEmail: req.user ? req.user.email : '',
          byRole: req.user ? req.user.role : 'updater',
          byDept: req.user ? (req.user.department || '') : '',
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString('en-GB')
        };

        p.auditTrail = p.auditTrail || [];
        p.auditTrail.unshift(logEntry);

        store.advanceLogs = store.advanceLogs || [];
        store.advanceLogs.unshift(logEntry);

        if (typeof store.saveLocalStore === 'function') {
          store.saveLocalStore();
        }

        if (isDbAvailable()) {
          LogsRepo.add(logEntry).catch(() => {});
          ProjectsRepo.update(p.id, p).catch(() => {});
        }
      }
    }

    return res.status(201).json({ success: true, spec: newRecord });
  } catch (err) {
    console.error('Error saving to Spec Library:', err);
    return res.status(500).json({ error: 'Failed to save specification to library: ' + err.message });
  }
});

// ── 4. PUT /api/specs/library/:id — Update an existing Spec Library item
router.put('/library/:id', authMiddleware, requireUpdater, async (req, res) => {
  try {
    const id = req.params.id;
    const existingIdx = (store.specLibrary || []).findIndex(s => s.id === id);
    if (existingIdx === -1) {
      return res.status(404).json({ error: 'Specification not found in library.' });
    }

    const current = store.specLibrary[existingIdx];
    const { specName, itemCode, category, materialType, revision, specData } = req.body;

    const updated = {
      ...current,
      specName: specName ? specName.trim() : current.specName,
      itemCode: itemCode !== undefined ? itemCode : current.itemCode,
      category: category !== undefined ? category : current.category,
      materialType: materialType !== undefined ? materialType : current.materialType,
      revision: revision !== undefined ? revision : current.revision,
      specData: specData ? specData : current.specData,
      updatedAt: new Date().toISOString()
    };

    store.specLibrary[existingIdx] = updated;
    if (typeof store.saveLocalStore === 'function') {
      store.saveLocalStore();
    }

    if (isDbAvailable()) {
      try {
        await SpecLibraryRepo.update(id, updated);
      } catch (e) {
        console.warn('[SpecLibraryRepo] DB update failed, saved locally:', e.message);
      }
    }

    return res.json({ success: true, spec: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update specification in library: ' + err.message });
  }
});

// ── 5. DELETE /api/specs/library/:id — Remove from Spec Library
router.delete('/library/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    store.specLibrary = (store.specLibrary || []).filter(s => s.id !== id);
    if (typeof store.saveLocalStore === 'function') {
      store.saveLocalStore();
    }
    if (isDbAvailable()) {
      try {
        await SpecLibraryRepo.delete(id);
      } catch (e) {}
    }
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete from Spec Library: ' + err.message });
  }
});

// ── 5. POST /api/specs/library/:id/apply — Apply a Library Spec to a project component
router.post('/library/:id/apply', authMiddleware, requireUpdater, async (req, res) => {
  try {
    const { projectId, materialIdx } = req.body;
    if (!projectId || materialIdx === undefined) {
      return res.status(400).json({ error: 'projectId and materialIdx required.' });
    }

    // Find library spec
    let libSpec = (store.specLibrary || []).find(s => s.id === req.params.id);
    if (!libSpec) {
      try {
        libSpec = await SpecLibraryRepo.getById(req.params.id);
      } catch (e) {}
    }
    if (!libSpec) return res.status(404).json({ error: 'Library specification not found.' });

    // Find project
    const p = store.projects.find(x => x.id === projectId);
    if (!p || !p.materials || !p.materials[materialIdx]) {
      return res.status(404).json({ error: 'Project or component not found.' });
    }

    const mat = p.materials[materialIdx];
    mat.specSheet = JSON.parse(JSON.stringify(libSpec.specData));
    if (libSpec.itemCode) mat.pmCode = libSpec.itemCode;
    if (mat.specSheet.docHeader?.artworkCode) {
      mat.artworkCode = mat.specSheet.docHeader.artworkCode;
    }

    // Log Activity
    const logEntry = {
      id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      projectId: p.id,
      projectName: p.projectName,
      fgCode: p.fgCode || '',
      action: 'SPEC_APPLY_LIBRARY',
      title: 'Library Specification Applied',
      details: `Applied master specification '${libSpec.specName}' (${libSpec.itemCode || ''}) to component '${mat.name}'`,
      materialName: mat.name,
      by: req.user ? req.user.name : 'System',
      byEmail: req.user ? req.user.email : '',
      byRole: req.user ? req.user.role : 'updater',
      byDept: req.user ? (req.user.department || '') : '',
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('en-GB')
    };

    p.auditTrail = p.auditTrail || [];
    p.auditTrail.unshift(logEntry);

    store.advanceLogs = store.advanceLogs || [];
    store.advanceLogs.unshift(logEntry);

    LogsRepo.add(logEntry).catch(() => {});
    ProjectsRepo.update(p.id, p).catch(() => {});

    return res.json({ success: true, project: p, appliedSpec: libSpec });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to apply specification: ' + err.message });
  }
});

module.exports = router;

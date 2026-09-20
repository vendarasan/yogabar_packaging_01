'use strict';
/**
 * unit.expansion.test.js — Unit tests for Pass 8 domain services.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { generateSignature, verifySignature } = require('../services/WebhookService');
const reportService = require('../services/ReportService');
const dataQualityService = require('../services/DataQualityService');
const importService = require('../services/ImportService');
const { StorageService, LocalStorageProvider } = require('../services/StorageService');
const { filterProjectForSupplier } = require('../middleware/auth');
const store = require('../store');

describe('Pass 8: Unit Tests', () => {

  it('1. Webhook HMAC-SHA256 signature generation and verification', () => {
    const payload = JSON.stringify({ event: 'StageChanged', projectId: 'PRJ-TEST' });
    const secret = 'test-wh-secret-key-123';

    const sig = generateSignature(payload, secret);
    assert.ok(sig.startsWith('sha256='), 'Signature should start with sha256=');

    const isValid = verifySignature(payload, sig, secret);
    assert.strictEqual(isValid, true, 'Valid signature should verify true');

    const isTampered = verifySignature(payload + 'tampered', sig, secret);
    assert.strictEqual(isTampered, false, 'Tampered payload should verify false');

    const isWrongSecret = verifySignature(payload, sig, 'wrong-secret');
    assert.strictEqual(isWrongSecret, false, 'Wrong secret should verify false');
  });

  it('2. StorageService computes valid SHA-256 and structured metadata', async () => {
    const memProvider = {
      async save(buf, key) { return { provider: 'mock', storageKey: key }; },
      async get() { return null; },
      async delete() { return true; }
    };
    const storage = new StorageService(memProvider);

    const content = Buffer.from('Packaging Material Specification Test Data', 'utf8');
    const doc = await storage.storeDocument(content, {
      filename: 'spec_v1.pdf',
      mimeType: 'application/pdf',
      entity: 'MATERIAL',
      entityId: 'MAT-001',
      version: 1,
      owner: 'alexsander@company.com'
    });

    assert.ok(doc.storageId.startsWith('DOC-'));
    assert.strictEqual(doc.originalFilename, 'spec_v1.pdf');
    assert.strictEqual(doc.sizeBytes, content.length);
    assert.strictEqual(doc.version, 1);
    assert.ok(doc.checksumSha256 && doc.checksumSha256.length === 64, 'Checksum must be 64-char hex SHA-256');
  });

  it('3. DataQualityService audits records and flags missing mandatory fields', async () => {
    // Seed an incomplete test project in store
    const testProj = {
      id: 'PRJ-DQ-TEST',
      projectName: 'Data Quality Test SKU',
      fgCode: 'FG-DQ-001',
      stage: 'Printing',
      status: 'On Track',
      targetLaunchDate: null, // Critical anomaly
      materials: [
        { id: 'M-1', name: 'Wrapper Film', type: 'Pouch', stage: 'Printing', pmCode: '', supplier: '' } // Critical missing PM Code & Supplier at Printing
      ]
    };
    store.projects.push(testProj);

    const audit = await dataQualityService.runAudit();
    assert.ok(typeof audit.score === 'number');
    assert.ok(audit.totalAnomalies > 0);
    assert.ok(audit.anomalies.some(a => a.rule === 'MISSING_LAUNCH_DATE'));
    assert.ok(audit.anomalies.some(a => a.rule === 'MISSING_PM_CODE'));

    // Clean up
    store.projects = store.projects.filter(p => p.id !== 'PRJ-DQ-TEST');
  });

  it('4. ImportService dry-run validates project records without mutating data', async () => {
    const invalidBatch = [
      { projectName: '', targetLaunchDate: '2026-12-01' }, // Missing name
      { projectName: 'Valid NPD Bar', targetLaunchDate: 'invalid-date' } // Bad date
    ];

    const res = await importService.validateImport(invalidBatch);
    assert.strictEqual(res.totalRecords, 2);
    assert.strictEqual(res.canCommit, false);
    assert.strictEqual(res.invalidCount, 2);

    const validBatch = [
      {
        projectName: 'Valid Clean Import Protein Bar',
        targetLaunchDate: '2026-12-15',
        materials: [{ name: 'Foil Wrap', type: 'Pouch' }]
      }
    ];

    const validRes = await importService.validateImport(validBatch);
    assert.strictEqual(validRes.canCommit, true);
    assert.strictEqual(validRes.validCount, 1);
  });

  it('5. filterProjectForSupplier strictly redacts internal risks and comments', () => {
    const internalProject = {
      id: 'PRJ-SUPP-TEST',
      projectName: 'Internal Commercial NPD',
      supplier: 'Huhtamaki Ltd',
      stage: 'Artwork',
      status: 'On Track',
      comments: 'Internal confidential formulation notes',
      risks: [{ id: 'RSK-1', title: 'Late cylinder delivery', severity: 'Critical' }],
      auditTrail: [{ action: 'PROJECT_CREATE' }],
      materials: [
        { id: 'M-1', name: 'Huhtamaki Pouch', supplier: 'Huhtamaki Ltd', stage: 'Artwork' },
        { id: 'M-2', name: 'Competitor Monocarton', supplier: 'Parksons Packaging', stage: 'Brief' }
      ]
    };

    const scoped = filterProjectForSupplier(internalProject, 'Huhtamaki Ltd');
    assert.ok(scoped, 'Authorized supplier should get project payload');
    assert.strictEqual(scoped.projectName, 'Internal Commercial NPD');
    assert.strictEqual(scoped.materials.length, 1, 'Should only receive materials assigned to Huhtamaki');
    assert.strictEqual(scoped.materials[0].name, 'Huhtamaki Pouch');
    assert.deepStrictEqual(scoped.risks, [], 'Internal risks must be redacted');
    assert.strictEqual(scoped.comments, '', 'Internal comments must be redacted');
    assert.deepStrictEqual(scoped.auditTrail, [], 'Internal audit trail must be redacted');

    // Unauthorized supplier check
    const denied = filterProjectForSupplier(internalProject, 'Unrelated Vendor Pvt Ltd');
    assert.strictEqual(denied, null, 'Unrelated vendor must be denied completely');
  });

});

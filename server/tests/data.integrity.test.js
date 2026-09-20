'use strict';

const { test, describe, after, before } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer } = require('./testHelper');
const { sanitizeValue } = require('../services/AuditService');

describe('Pass 5 — Data Integrity, Audit Trail, Versioning & Document Control', () => {
  let projId = null;
  let matId = null;

  before(async () => {
    // 1. Create project with initial material
    const res = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'Pass 5 Integrity Project ' + Date.now(),
        briefDate: '2026-09-01',
        targetLaunchDate: '2026-11-15',
        status: 'On Track',
        supplier: 'Alpha Packaging Ltd',
        materials: [
          { name: 'Barrier Monocarton', type: 'Carton (Mono)', printType: 'Offset' }
        ]
      }
    });
    assert.strictEqual(res.status, 201);
    projId = res.body.project.id;
    matId = res.body.project.materials[0].id;
  });

  after(async () => {
    if (projId) {
      await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
    }
    await stopTestServer();
  });

  test('1. Stable Entity IDs & Audit Fields', async () => {
    const res = await apiRequest('GET', `/api/projects/${projId}`, { token: '__superadmin__' });
    assert.strictEqual(res.status, 200);
    const p = res.body.project;

    // Stable Project ID format
    assert.ok(/^PRJ-[A-Za-z0-9_-]+$/.test(p.id), `Project ID '${p.id}' should match PRJ- prefix`);

    // Audit fields present
    assert.ok(p.createdAt, 'createdAt should be set');
    assert.ok(p.createdBy, 'createdBy should be set');
    assert.ok(p.updatedAt, 'updatedAt should be set');
    assert.strictEqual(p.isDeleted, false, 'isDeleted should be false');

    // Stable Material ID format and PM code preservation
    const m = p.materials[0];
    assert.ok(m.id, 'Material should have stable ID');
    assert.ok(/^MAT-[A-Za-z0-9_-]+$/.test(m.id), `Material ID '${m.id}' should match MAT- prefix`);
    assert.ok(m.pmCode, 'PM code should remain intact as business identifier');
    assert.ok(m.createdAt, 'Material createdAt should be recorded');
  });

  test('2. Status History & Before / After Value Tracking', async () => {
    // Transition status: On Track -> Due Soon -> At Risk with reasons
    const update1 = await apiRequest('PUT', `/api/projects/${projId}`, {
      token: '__superadmin__',
      body: {
        status: 'Due Soon',
        reason: 'Raw material paperboard shipment delayed by 5 days'
      }
    });
    assert.strictEqual(update1.status, 200);
    assert.strictEqual(update1.body.project.status, 'Due Soon');

    const update2 = await apiRequest('PUT', `/api/projects/${projId}`, {
      token: '__superadmin__',
      body: {
        status: 'At Risk',
        reason: 'Supplier press maintenance scheduled'
      }
    });
    assert.strictEqual(update2.status, 200);
    assert.strictEqual(update2.body.project.status, 'At Risk');

    // Verify statusHistory array preserves transitions and reasons
    const pRes = await apiRequest('GET', `/api/projects/${projId}`, { token: '__superadmin__' });
    const hist = pRes.body.project.statusHistory;
    assert.ok(Array.isArray(hist), 'statusHistory must be an array');
    assert.ok(hist.length >= 2, 'Should have initial and transition records');

    const dueSoonEntry = hist.find(h => h.to === 'Due Soon');
    assert.ok(dueSoonEntry, 'Due Soon transition recorded');
    assert.strictEqual(dueSoonEntry.from, 'On Track');
    assert.strictEqual(dueSoonEntry.reason, 'Raw material paperboard shipment delayed by 5 days');

    const atRiskEntry = hist.find(h => h.to === 'At Risk');
    assert.ok(atRiskEntry, 'At Risk transition recorded');
    assert.strictEqual(atRiskEntry.from, 'Due Soon');
    assert.strictEqual(atRiskEntry.reason, 'Supplier press maintenance scheduled');

    // Verify auditTrail records BEFORE / AFTER values
    const auditRes = await apiRequest('GET', `/api/projects/${projId}/audit-trail`, { token: '__superadmin__' });
    assert.strictEqual(auditRes.status, 200);
    const statusLogs = auditRes.body.auditTrail.filter(l => l.eventType === 'STATUS_CHANGED' || l.action === 'STATUS_UPDATE');
    assert.ok(statusLogs.length >= 2, 'Audit trail should have status change logs');
    assert.strictEqual(statusLogs[0].oldValue, 'Due Soon');
    assert.strictEqual(statusLogs[0].newValue, 'At Risk');
    assert.strictEqual(statusLogs[0].reason, 'Supplier press maintenance scheduled');
  });

  test('3. Launch Date Change & Supplier Change Auditability', async () => {
    const launchRes = await apiRequest('PUT', `/api/projects/${projId}`, {
      token: '__superadmin__',
      body: {
        targetLaunchDate: '2026-11-25',
        reason: 'Marketing campaign alignment'
      }
    });
    assert.strictEqual(launchRes.status, 200);
    assert.strictEqual(launchRes.body.project.targetLaunchDate, '2026-11-25');

    const supRes = await apiRequest('PUT', `/api/projects/${projId}`, {
      token: '__superadmin__',
      body: {
        supplier: 'Beta Printworks Pvt Ltd'
      }
    });
    assert.strictEqual(supRes.status, 200);
    assert.strictEqual(supRes.body.project.supplier, 'Beta Printworks Pvt Ltd');

    // Verify audit logs captured both field changes with previous/new values
    const auditRes = await apiRequest('GET', `/api/projects/${projId}/audit-trail`, { token: '__superadmin__' });
    const launchLog = auditRes.body.auditTrail.find(l => l.eventType === 'LAUNCH_DATE_CHANGED' || l.field === 'targetLaunchDate');
    assert.ok(launchLog, 'Launch date change logged');
    assert.strictEqual(launchLog.oldValue, '2026-11-15');
    assert.strictEqual(launchLog.newValue, '2026-11-25');
    assert.strictEqual(launchLog.reason, 'Marketing campaign alignment');

    const supLog = auditRes.body.auditTrail.find(l => l.eventType === 'SUPPLIER_CHANGED' || l.field === 'supplier');
    assert.ok(supLog, 'Supplier change logged');
    assert.strictEqual(supLog.oldValue, 'Alpha Packaging Ltd');
    assert.strictEqual(supLog.newValue, 'Beta Printworks Pvt Ltd');
  });

  test('4. Artwork Versioning: Upload, Approval, and Superseding', async () => {
    // 1. Upload Artwork v1
    const v1Res = await apiRequest('PUT', `/api/projects/${projId}/materials/0/artwork`, {
      token: '__superadmin__',
      body: {
        artworkFiles: [{ name: 'front_label_v1.pdf', size: 1024, url: '/uploads/front_v1.pdf' }]
      }
    });
    assert.strictEqual(v1Res.status, 200);
    assert.ok(Array.isArray(v1Res.body.artworkVersions), 'artworkVersions should be present');
    assert.strictEqual(v1Res.body.artworkVersions.length, 1);
    const v1 = v1Res.body.artworkVersions[0];
    assert.strictEqual(v1.version, 1);
    assert.strictEqual(v1.versionTag, 'v1');
    assert.strictEqual(v1.status, 'UPLOADED');
    assert.ok(/^ART-[A-Za-z0-9_-]+$/.test(v1.id), `Artwork version ID '${v1.id}' should match ART- prefix`);

    // 2. Approve Artwork v1
    const approveRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/artwork/approve`, {
      token: '__superadmin__',
      body: { comments: 'Color separation and cutter guides verified' }
    });
    assert.strictEqual(approveRes.status, 200);
    const approvedV1 = approveRes.body.approvedVersion;
    assert.strictEqual(approvedV1.status, 'APPROVED');
    assert.ok(approvedV1.approvalInfo, 'approvalInfo should be recorded');
    assert.strictEqual(approvedV1.approvalInfo.approvedBy, 'Alexsander');
    assert.strictEqual(approvedV1.approvalInfo.comments, 'Color separation and cutter guides verified');

    // 3. Upload Artwork v2 (Must not overwrite approved v1)
    const v2Res = await apiRequest('PUT', `/api/projects/${projId}/materials/0/artwork`, {
      token: '__superadmin__',
      body: {
        artworkFiles: [{ name: 'front_label_v2.pdf', size: 2048, url: '/uploads/front_v2.pdf' }]
      }
    });
    assert.strictEqual(v2Res.status, 200);
    assert.strictEqual(v2Res.body.artworkVersions.length, 2);
    // Verify v1 remains approved
    assert.strictEqual(v2Res.body.artworkVersions[0].version, 1);
    assert.strictEqual(v2Res.body.artworkVersions[0].status, 'APPROVED');
    // Verify v2 is uploaded
    assert.strictEqual(v2Res.body.artworkVersions[1].version, 2);
    assert.strictEqual(v2Res.body.artworkVersions[1].versionTag, 'v2');
    assert.strictEqual(v2Res.body.artworkVersions[1].status, 'UPLOADED');

    // 4. Retrieve artwork versions endpoint
    const getVerRes = await apiRequest('GET', `/api/projects/${projId}/materials/0/artwork/versions`, { token: '__superadmin__' });
    assert.strictEqual(getVerRes.status, 200);
    assert.strictEqual(getVerRes.body.versions.length, 2);
  });

  test('5. Specification Versioning: Revisions, Document Metadata & Approval Locking', async () => {
    // 1. Save Spec Sheet v1 Draft
    const specV1 = {
      docHeader: { itemCode: 'PM-MONO-001', revision: '1.0', clubbedCodes: 'FG-100, FG-101' },
      parameters: [{ parameter: 'GSM', standard: '350', tolerance: '±5%' }]
    };
    const draftRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsheet`, {
      token: '__superadmin__',
      body: { specSheet: specV1, submitForCheck: true }
    });
    assert.strictEqual(draftRes.status, 200);

    // 2. Approve Spec Sheet v1
    const approveRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/specsheet/approve`, {
      token: '__superadmin__',
      body: { comments: 'Approved 350 GSM virgin paperboard standard' }
    });
    assert.strictEqual(approveRes.status, 200);

    // 3. Save Spec Sheet Revision v2
    const specV2 = {
      docHeader: { itemCode: 'PM-MONO-001', revision: '2.0', clubbedCodes: 'FG-100, FG-101' },
      parameters: [{ parameter: 'GSM', standard: '370', tolerance: '±5%' }]
    };
    const v2Res = await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsheet`, {
      token: '__superadmin__',
      body: { specSheet: specV2 }
    });
    assert.strictEqual(v2Res.status, 200);

    // Verify versions list
    const versionsRes = await apiRequest('GET', `/api/projects/${projId}/materials/0/specsheet/versions`, { token: '__superadmin__' });
    assert.strictEqual(versionsRes.status, 200);
    assert.strictEqual(versionsRes.body.versions.length, 2);

    const v1Record = versionsRes.body.versions[0];
    assert.strictEqual(v1Record.version, 1);
    assert.strictEqual(v1Record.status, 'APPROVED');
    assert.ok(v1Record.approvalInfo, 'v1 approval info preserved');
    assert.ok(/^SPEC-[A-Za-z0-9_-]+$/.test(v1Record.id), `Spec ID '${v1Record.id}' should match SPEC- prefix`);

    const v2Record = versionsRes.body.versions[1];
    assert.strictEqual(v2Record.version, 2);
    assert.strictEqual(v2Record.status, 'DRAFT');
  });

  test('6. Unified Chronological Project Timeline', async () => {
    const timeRes = await apiRequest('GET', `/api/projects/${projId}/timeline`, { token: '__superadmin__' });
    assert.strictEqual(timeRes.status, 200);
    assert.strictEqual(timeRes.body.projectId, projId);
    assert.ok(Array.isArray(timeRes.body.timeline), 'timeline must be an array');

    const timeline = timeRes.body.timeline;
    assert.ok(timeline.length >= 4, 'Timeline should contain creation, status, artwork, and spec events');

    // Check chronological order (desc by default: latest timestamp first)
    for (let i = 0; i < timeline.length - 1; i++) {
      assert.ok(
        timeline[i].timestamp >= timeline[i + 1].timestamp,
        `Timeline must be sorted in descending order: index ${i} (${timeline[i].timestamp}) >= index ${i+1} (${timeline[i+1].timestamp})`
      );
    }

    // Verify all entries have stable IDs and essential attributes
    const seenIds = new Set();
    timeline.forEach(evt => {
      assert.ok(evt.id, 'Timeline event must have an ID');
      assert.ok(!seenIds.has(evt.id), `Timeline event ID '${evt.id}' must be unique`);
      seenIds.add(evt.id);
      assert.ok(evt.title, 'Timeline event must have a title');
      assert.ok(evt.eventType, 'Timeline event must have eventType');
    });
  });

  test('7. Soft Delete & Administrative Restore', async () => {
    // 1. Soft delete the project
    const delRes = await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.ok, true);

    // 2. Project should not appear in normal list query
    const listRes = await apiRequest('GET', '/api/projects', { token: '__superadmin__' });
    const foundNormal = listRes.body.projects.some(p => p.id === projId);
    assert.strictEqual(foundNormal, false, 'Soft-deleted project must not appear in standard GET /api/projects');

    // 3. Normal GET /api/projects/:id returns 404
    const singleRes = await apiRequest('GET', `/api/projects/${projId}`, { token: '__superadmin__' });
    assert.strictEqual(singleRes.status, 404);

    // 4. GET with includeDeleted=true reveals the soft-deleted project
    const singleDeletedRes = await apiRequest('GET', `/api/projects/${projId}?includeDeleted=true`, { token: '__superadmin__' });
    assert.strictEqual(singleDeletedRes.status, 200);
    assert.strictEqual(singleDeletedRes.body.project.isDeleted, true);
    assert.ok(singleDeletedRes.body.project.deletedAt, 'deletedAt must be recorded');

    // 5. Restore project
    const restoreRes = await apiRequest('POST', `/api/projects/${projId}/restore`, { token: '__superadmin__' });
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.ok, true);
    assert.strictEqual(restoreRes.body.project.isDeleted, false);

    // 6. Project now appears in standard queries again
    const listAgainRes = await apiRequest('GET', '/api/projects', { token: '__superadmin__' });
    const foundRestored = listAgainRes.body.projects.some(p => p.id === projId);
    assert.strictEqual(foundRestored, true, 'Restored project must appear in standard GET /api/projects');
  });

  test('8. Privacy & Credential Sanitization in Audit Trail', () => {
    const rawPayload = {
      projectName: 'Confidential Wafer Bar',
      password: 'superSecretPassword123',
      passwordHash: '$2b$10$e7xX3/someHash',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      cookie: 'session_id=987654',
      materials: [
        { name: 'Inner Foil', secretKey: 'topsecret' }
      ]
    };

    const sanitized = sanitizeValue(rawPayload);

    assert.strictEqual(sanitized.projectName, 'Confidential Wafer Bar');
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.passwordHash, '[REDACTED]');
    assert.strictEqual(sanitized.token, '[REDACTED]');
    assert.strictEqual(sanitized.cookie, '[REDACTED]');
    assert.strictEqual(sanitized.materials[0].secretKey, '[REDACTED]');
    assert.strictEqual(sanitized.materials[0].name, 'Inner Foil');
  });
});

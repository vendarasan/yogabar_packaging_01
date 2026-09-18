const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');

describe('Spec Library CRUD & Apply Endpoints', () => {
  let createdSpecId = null;
  let targetProjId = null;

  after(async () => {
    if (createdSpecId) {
      await apiRequest('DELETE', `/api/specs/library/${createdSpecId}`, { token: '__superadmin__' });
    }
    if (targetProjId) {
      await apiRequest('DELETE', `/api/projects/${targetProjId}`, { token: '__superadmin__' });
    }
    await stopTestServer();
  });

  test('GET /api/specs/library — Retrieve library items', async () => {
    const res = await apiRequest('GET', '/api/specs/library', { token: '__superadmin__' });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.specs));
  });

  test('POST /api/specs/library — Validation fails without required fields', async () => {
    const res = await apiRequest('POST', '/api/specs/library', {
      token: '__superadmin__',
      body: { specName: '' }
    });
    assert.strictEqual(res.status, 400);
  });

  test('Spec Library Flow: Create, Update, Apply to Project, and Delete', async () => {
    // 1. CREATE Library Spec
    const specPayload = {
      specName: 'Master Monocarton Spec ' + Date.now(),
      itemCode: 'PM/PR/MNC/99999',
      category: 'carton',
      materialType: 'Monocarton',
      revision: '1.0',
      specData: {
        docHeader: { docName: 'Master Monocarton Spec', itemCode: 'PM/PR/MNC/99999', revision: '1.0' },
        parameters: [
          { sNo: 1, parameter: 'Board GSM', standard: '300 +/- 5%', defectType: 'CR' },
          { sNo: 2, parameter: 'Dimensions', standard: '86 x 86 x 175 mm', defectType: 'CR' }
        ]
      }
    };

    const createRes = await apiRequest('POST', '/api/specs/library', {
      token: '__superadmin__',
      body: specPayload
    });

    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.body.spec.id);
    createdSpecId = createRes.body.spec.id;
    assert.strictEqual(createRes.body.spec.specName, specPayload.specName);

    // 2. UPDATE Library Spec
    const updateRes = await apiRequest('PUT', `/api/specs/library/${createdSpecId}`, {
      token: '__superadmin__',
      body: {
        specName: specPayload.specName + ' (Rev A)',
        revision: '1.1'
      }
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.spec.specName, specPayload.specName + ' (Rev A)');
    assert.strictEqual(updateRes.body.spec.revision, '1.1');

    // 3. CREATE Project to apply spec onto
    const projRes = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'Target Project for Library Spec ' + Date.now(),
        briefDate: '2026-10-01',
        materials: [{ name: 'Carton Component', type: 'Monocarton' }]
      }
    });
    targetProjId = projRes.body.project.id;

    // 4. APPLY Library Spec to Project Component
    const applyRes = await apiRequest('POST', `/api/specs/library/${createdSpecId}/apply`, {
      token: '__superadmin__',
      body: {
        projectId: targetProjId,
        materialIdx: 0
      }
    });

    assert.strictEqual(applyRes.status, 200);
    assert.strictEqual(applyRes.body.success, true);
    assert.strictEqual(applyRes.body.project.materials[0].pmCode, 'PM/PR/MNC/99999');
    assert.strictEqual(applyRes.body.project.materials[0].specSheet.docHeader.docName, 'Master Monocarton Spec');

    // 5. DELETE Library Spec
    const delRes = await apiRequest('DELETE', `/api/specs/library/${createdSpecId}`, {
      token: '__superadmin__'
    });
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.deletedId, createdSpecId);

    // Verify it's removed
    const listRes = await apiRequest('GET', '/api/specs/library', { token: '__superadmin__' });
    const exists = listRes.body.specs.some(s => s.id === createdSpecId);
    assert.strictEqual(exists, false);
    createdSpecId = null;
  });
});

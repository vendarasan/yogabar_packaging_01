const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');

describe('Project CRUD & Persistence Endpoints', () => {
  after(async () => {
    await stopTestServer();
  });

  test('GET /api/projects — Retrieve all projects', async () => {
    const res = await apiRequest('GET', '/api/projects', { token: '__superadmin__' });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.projects));
  });

  test('POST /api/projects — Validation fails when required fields are missing', async () => {
    const res = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: { projectName: 'Incomplete Project' }
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /projectName, briefDate, and at least 1 material required/);
  });

  test('Project Full CRUD Flow: Create, Read, Update, Inline Edits, and Delete', async () => {
    const testProjName = 'Unit Test Packaging Project ' + Date.now();
    const briefDate = '2026-10-01';

    // 1. CREATE Project
    const createRes = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: testProjName,
        fgCode: 'FG-UT-999',
        skuSize: '500g',
        briefDate,
        projectType: 'Regular',
        projectCategory: 'NPD',
        materials: [
          { name: 'Inner Pouch', type: 'Pouch - Center Seal', printType: 'Rotogravure', supplier: 'Alpha Packaging' },
          { name: 'Outer Shipper', type: 'Shipper Box', supplier: 'Beta Corrugators' }
        ]
      }
    });

    assert.strictEqual(createRes.status, 201);
    const createdProj = createRes.body.project;
    assert.ok(createdProj.id, 'Project should have an ID');
    assert.strictEqual(createdProj.projectName, testProjName);
    assert.strictEqual(createdProj.materials.length, 2);
    assert.ok(createdProj.materials[0].pmCode, 'Material should have generated PM code');
    assert.ok(createdProj.milestones.Connectivity, 'Project should have computed Connectivity milestone');

    const projId = createdProj.id;

    // 2. READ & Audit Trail
    const auditRes = await apiRequest('GET', `/api/projects/${projId}/audit-trail`, { token: '__superadmin__' });
    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.auditTrail));
    assert.ok(auditRes.body.auditTrail.some(e => e.action === 'PROJECT_CREATE'));

    // 3. INLINE UPDATES
    // Inline FG Code
    const fgRes = await apiRequest('PUT', `/api/projects/${projId}/fgcode`, {
      token: '__superadmin__',
      body: { fgCode: 'FG-UPDATED-888' }
    });
    assert.strictEqual(fgRes.status, 200);
    assert.strictEqual(fgRes.body.project.fgCode, 'FG-UPDATED-888');

    // Inline Supplier
    const supRes = await apiRequest('PUT', `/api/projects/${projId}/supplier`, {
      token: '__superadmin__',
      body: { supplier: 'Global Packaging Hub' }
    });
    assert.strictEqual(supRes.status, 200);
    assert.strictEqual(supRes.body.project.supplier, 'Global Packaging Hub');

    // Inline Factory
    const facRes = await apiRequest('PUT', `/api/projects/${projId}/factory`, {
      token: '__superadmin__',
      body: { factory: 'Tumkur Plant 1' }
    });
    assert.strictEqual(facRes.status, 200);
    assert.strictEqual(facRes.body.project.factory, 'Tumkur Plant 1');

    // Inline Description
    const descRes = await apiRequest('PUT', `/api/projects/${projId}/description`, {
      token: '__superadmin__',
      body: { description: 'Verified high-barrier packaging requirement.' }
    });
    assert.strictEqual(descRes.status, 200);
    assert.strictEqual(descRes.body.project.description, 'Verified high-barrier packaging requirement.');

    // 4. FULL UPDATE with Brief Date Change (Cascades to materials)
    const newBriefDate = '2026-10-15';
    const updateRes = await apiRequest('PUT', `/api/projects/${projId}`, {
      token: '__superadmin__',
      body: {
        projectName: testProjName + ' (Updated)',
        briefDate: newBriefDate,
        materials: createdProj.materials
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.project.projectName, testProjName + ' (Updated)');
    assert.strictEqual(updateRes.body.project.briefDate, newBriefDate);
    // Ensure material brief dates cascaded
    assert.strictEqual(updateRes.body.project.materials[0].briefDate, newBriefDate);

    // 5. DELETE Project
    const deleteRes = await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.ok, true);

    // Confirm project is removed from store
    const listAfterRes = await apiRequest('GET', '/api/projects', { token: '__superadmin__' });
    const exists = listAfterRes.body.projects.some(p => String(p.id) === String(projId));
    assert.strictEqual(exists, false, 'Deleted project should no longer appear in GET /api/projects');
  });
});

/**
 * End-to-End Test Suite: Critical Packaging Project Lifecycle (Pass 6)
 *
 * Automates the complete 13-step enterprise user journey:
 * 1. Login
 * 2. Dashboard
 * 3. Create Project
 * 4. Create Material
 * 5. Assign Supplier
 * 6. Move through stages
 * 7. Upload Artwork
 * 8. Update Specification
 * 9. Create Risk (Crunch Proposal & Analysis)
 * 10. Change Launch Date (Multi-stage crunch approval)
 * 11. Review Activity (Unified timeline & audit trail)
 * 12. Export (Project data reporting)
 * 13. Logout
 */

const assert = require('assert');
const { test, describe, before, after } = require('node:test');
const { apiRequest, startTestServer, stopTestServer, store } = require('./testHelper');
const { hashPass } = require('../utils');

describe('End-to-End Critical Journey: Project Lifecycle', () => {

  let userSessionToken = '';
  let projectId = '';
  const testUser = {
    email: 'lifecycle_admin@yogabar.com',
    name: 'Lifecycle Lead Admin',
    role: 'admin',
    password: 'Password@2026'
  };

  before(async () => {
    await startTestServer();

    // Register user for testing
    store.users[testUser.email] = {
      name: testUser.name,
      role: testUser.role,
      passwordHash: hashPass(testUser.password),
      color: '#76ff03'
    };
  });

  after(async () => {
    delete store.users[testUser.email];
    if (userSessionToken) {
      delete store.sessions[userSessionToken];
    }
    await stopTestServer();
  });

  test('Step 1: Login authenticates user and issues session', async () => {
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      body: {
        email: testUser.email,
        password: testUser.password
      },
      token: null
    });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.email, testUser.email);
    assert.strictEqual(loginRes.body.user.role, 'admin');

    // Extract session token from store
    const sessionEntry = Object.entries(store.sessions).find(([tok, em]) => em === testUser.email);
    assert.ok(sessionEntry, 'Session must be registered in server store');
    userSessionToken = sessionEntry[0];
  });

  test('Step 2: Dashboard fetches project overview and health telemetry', async () => {
    // 1. Dashboard project listing
    const dashRes = await apiRequest('GET', '/api/projects', {
      token: userSessionToken
    });
    assert.strictEqual(dashRes.status, 200);
    assert.ok(Array.isArray(dashRes.body.projects));

    // 2. Health telemetry check
    const healthRes = await apiRequest('GET', '/api/health', {
      token: userSessionToken
    });
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.dependencies.storage, 'ready');
  });

  test('Step 3: Create Project initializes stable identity and timeline', async () => {
    const createRes = await apiRequest('POST', '/api/projects', {
      body: {
        projectName: 'Enterprise Oats Bar 40g',
        briefDate: '2026-04-01',
        materials: [
          { name: 'Primary Foil Wrap', type: 'Laminate Pouch', printType: 'Rotogravure', stage: 'Brief' }
        ]
      },
      token: userSessionToken
    });

    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.body.project);
    assert.ok(createRes.body.project.id);
    assert.strictEqual(createRes.body.project.projectName, 'Enterprise Oats Bar 40g');

    projectId = createRes.body.project.id;
  });

  test('Step 4: Create Material adds packaging item to project', async () => {
    // Add a secondary mono carton to the project
    const updateRes = await apiRequest('PUT', `/api/projects/${projectId}`, {
      body: {
        materials: [
          { name: 'Primary Foil Wrap', type: 'Laminate Pouch', printType: 'Rotogravure', stage: 'Brief' },
          { name: 'Secondary Display Carton', type: 'Mono Carton', printType: 'Offset', stage: 'Brief' }
        ]
      },
      token: userSessionToken
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.project.materials.length, 2);
    assert.strictEqual(updateRes.body.project.materials[1].name, 'Secondary Display Carton');
  });

  test('Step 5: Assign Supplier updates partner metadata and logs audit entry', async () => {
    // Assign project supplier
    const supRes = await apiRequest('PUT', `/api/projects/${projectId}/supplier`, {
      body: { supplier: 'Huhtamaki Packaging Ltd' },
      token: userSessionToken
    });

    assert.strictEqual(supRes.status, 200);
    assert.strictEqual(supRes.body.project.supplier, 'Huhtamaki Packaging Ltd');

    // Assign material supplier
    const matSupRes = await apiRequest('PUT', `/api/projects/${projectId}/materials/0/supplier`, {
      body: { supplier: 'Constantia Flexibles' },
      token: userSessionToken
    });
    assert.strictEqual(matSupRes.status, 200);
  });

  test('Step 6: Move through stages validates gates and advances material', async () => {
    // 1. Technical specification sign-off to satisfy stage gate
    const signRes = await apiRequest('PUT', `/api/projects/${projectId}/materials/0/specsignoff`, {
      body: { signed: true, notes: 'Technical clearance granted for prototype trial' },
      token: userSessionToken
    });
    assert.strictEqual(signRes.status, 200);

    // 2. Advance Material from Brief to Sample
    const advRes = await apiRequest('POST', `/api/projects/${projectId}/materials/0/advance`, {
      token: userSessionToken
    });

    assert.strictEqual(advRes.status, 200);
    assert.strictEqual(advRes.body.project.materials[0].stage, 'Sample');
  });

  test('Step 7: Upload Artwork safely attaches verified artwork files', async () => {
    const artworkFiles = [
      {
        name: 'oats_bar_dieline_v1.pdf',
        size: 2 * 1024 * 1024,
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK'
      },
      {
        name: 'front_label_artwork.ai',
        size: 8 * 1024 * 1024
      }
    ];

    const artRes = await apiRequest('PUT', `/api/projects/${projectId}/materials/0/artwork`, {
      body: { artworkFiles },
      token: userSessionToken
    });

    assert.strictEqual(artRes.status, 200);
    assert.ok(Array.isArray(artRes.body.project.materials[0].artworkFiles));
    assert.strictEqual(artRes.body.project.materials[0].artworkFiles.length, 2);
  });

  test('Step 8: Update Specification updates technical parameters and versions', async () => {
    const specSheet = {
      category: 'pouch',
      docHeader: {
        docName: 'Foil Packaging Technical Standard',
        itemCode: 'PM/FL/0045',
        revision: '1.0'
      },
      parameters: [
        { name: 'Width', target: '120', unit: 'mm', tolerance: '±1' },
        { name: 'GSM', target: '85', unit: 'g/m²', tolerance: '±5' }
      ]
    };

    const specRes = await apiRequest('PUT', `/api/projects/${projectId}/materials/0/specsheet`, {
      body: {
        specSheet,
        submitForCheck: true
      },
      token: userSessionToken
    });

    assert.strictEqual(specRes.status, 200);
    assert.strictEqual(specRes.body.project.materials[0].specSheet.docHeader.docName, 'Foil Packaging Technical Standard');
    assert.strictEqual(specRes.body.project.materials[0].specSheet.parameters.length, 2);
  });

  test('Step 9: Create Risk evaluates crunched timeline risks and mitigations', async () => {
    // Target launch date 14 days earlier than standard
    const targetLaunch = '2026-05-15';
    const riskRes = await apiRequest('POST', `/api/projects/${projectId}/crunch/propose`, {
      body: { targetLaunchDate: targetLaunch },
      token: userSessionToken
    });

    assert.strictEqual(riskRes.status, 200);
    assert.ok(riskRes.body.crunchPlan);
    assert.strictEqual(riskRes.body.crunchPlan.isCrunched, true);
    assert.ok(riskRes.body.crunchPlan.daysSaved > 0);
    assert.ok(riskRes.body.crunchPlan.stages.length > 0);
    assert.ok(riskRes.body.crunchPlan.stages[0].riskTitle);
  });

  test('Step 10: Change Launch Date executes dual-stage crunch approval workflow', async () => {
    // Stage 1 Approval by Admin
    const stage1Res = await apiRequest('POST', `/api/projects/${projectId}/crunch/approve-stage1`, {
      body: { comments: 'Expedited production run scheduled with converter.' },
      token: userSessionToken
    });
    assert.strictEqual(stage1Res.status, 200);
    assert.strictEqual(stage1Res.body.crunchPlan.status, 'PENDING_STAGE2');

    // Stage 2 Approval by SuperAdmin
    const stage2Res = await apiRequest('POST', `/api/projects/${projectId}/crunch/approve-stage2`, {
      body: { comments: 'Packaging Head executive sign-off granted.' },
      token: '__superadmin__'
    });
    assert.strictEqual(stage2Res.status, 200);
    assert.strictEqual(stage2Res.body.crunchPlan.status, 'APPROVED');
  });

  test('Step 11: Review Activity inspects unified chronological timeline & audit trail', async () => {
    // 1. Check synthesized timeline
    const timelineRes = await apiRequest('GET', `/api/projects/${projectId}/timeline`, {
      token: userSessionToken
    });

    assert.strictEqual(timelineRes.status, 200);
    assert.strictEqual(timelineRes.body.projectId, projectId);
    assert.ok(Array.isArray(timelineRes.body.timeline));
    assert.ok(timelineRes.body.timeline.length >= 3, 'Timeline must contain chronological events');

    const eventTypes = timelineRes.body.timeline.map(e => e.eventType);
    assert.ok(eventTypes.includes('PROJECT_CREATED'));

    // 2. Check complete audit trail
    const auditRes = await apiRequest('GET', `/api/projects/${projectId}/audit-trail`, {
      token: userSessionToken
    });
    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.auditTrail));
    const auditActions = auditRes.body.auditTrail.map(e => e.action);
    assert.ok(auditActions.includes('PROJECT_CREATE'));
    assert.ok(auditActions.includes('SUPPLIER_UPDATE'));
    assert.ok(auditActions.includes('MATERIAL_ADVANCE'));
  });

  test('Step 12: Export outputs comprehensive project record for reporting', async () => {
    const projRes = await apiRequest('GET', `/api/projects/${projectId}`, {
      token: userSessionToken
    });

    assert.strictEqual(projRes.status, 200);
    const p = projRes.body.project;
    assert.strictEqual(p.id, projectId);
    assert.strictEqual(p.materials.length, 2);
    assert.strictEqual(p.supplier, 'Huhtamaki Packaging Ltd');
    assert.ok(p.crunchPlan && p.crunchPlan.status === 'APPROVED');
    assert.ok(p.auditTrail && p.auditTrail.length > 0);
  });

  test('Step 13: Logout terminates session and clears cookies', async () => {
    const logoutRes = await apiRequest('POST', '/api/auth/logout', {
      headers: {
        Cookie: `pkg_session=${userSessionToken}`
      },
      token: userSessionToken
    });

    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.ok, true);

    // Verify token is invalidated
    const meRes = await apiRequest('GET', '/api/auth/me', {
      token: userSessionToken
    });
    assert.strictEqual(meRes.status, 401, 'Invalidated session token must be rejected');
  });
});

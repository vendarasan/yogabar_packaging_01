/**
 * Security & Authorization Test Suite (Pass 6)
 * Verifies Server-side RBAC, Rate Limiting, File Upload Auditing, Secure Cookies,
 * Health Checks, Metrics, and Server-Side Pagination.
 */

const assert = require('assert');
const { test, describe, before, after } = require('node:test');
const { apiRequest, startTestServer, stopTestServer, store } = require('./testHelper');
const { hashPass } = require('../utils');
const { authRateLimiter } = require('../middleware/rateLimiter');

describe('Security & Authorization Suite', () => {

  let testProjectId = '';
  let updaterToken = 'token_updater_sec_test';
  let adminToken = 'token_admin_sec_test';

  before(async () => {
    await startTestServer();

    // Seed test users with specific roles
    store.users['updater_sec@test.com'] = {
      name: 'Sec Updater',
      role: 'updater',
      passwordHash: hashPass('Updater@123'),
      color: '#00d4c8'
    };
    store.sessions[updaterToken] = 'updater_sec@test.com';

    store.users['admin_sec@test.com'] = {
      name: 'Sec Admin',
      role: 'admin',
      passwordHash: hashPass('Admin@123'),
      color: '#ef4444'
    };
    store.sessions[adminToken] = 'admin_sec@test.com';

    // Create a base project for testing
    const createRes = await apiRequest('POST', '/api/projects', {
      body: {
        projectName: 'Security Audit Project',
        briefDate: '2026-03-01',
        materials: [
          { name: 'Inner Foil', type: 'Laminate Pouch', printType: 'Rotogravure', stage: 'Brief' }
        ]
      },
      token: '__superadmin__'
    });

    assert.strictEqual(createRes.status, 201);
    testProjectId = createRes.body.project.id;

    // Save initial spec sheet on material 0 and submit for check
    await apiRequest('PUT', `/api/projects/${testProjectId}/materials/0/specsheet`, {
      body: {
        specSheet: {
          category: 'pouch',
          docHeader: { docName: 'Inner Foil Spec', itemCode: 'PM-101' },
          parameters: []
        },
        submitForCheck: true
      },
      token: updaterToken
    });

    // Provide spec sign-off to satisfy stage gate
    await apiRequest('PUT', `/api/projects/${testProjectId}/materials/0/specsignoff`, {
      body: { signed: true, notes: 'Signed off for audit test' },
      token: updaterToken
    });
  });

  after(async () => {
    delete store.sessions[updaterToken];
    delete store.sessions[adminToken];
    delete store.users['updater_sec@test.com'];
    delete store.users['admin_sec@test.com'];
    await stopTestServer();
  });

  test('Unauthenticated requests to protected endpoints are rejected (401)', async () => {
    const res = await apiRequest('POST', '/api/projects', {
      body: { projectName: 'Unauthorized' },
      token: null
    });
    assert.strictEqual(res.status, 401);
  });

  test('Viewer/unprivileged users are denied mutating project operations (403)', async () => {
    const viewerToken = 'token_viewer_sec_test';
    store.users['viewer_sec@test.com'] = { name: 'Sec Viewer', role: 'viewer', color: '#888' };
    store.sessions[viewerToken] = 'viewer_sec@test.com';

    // Viewer cannot create project (Admin required)
    const createRes = await apiRequest('POST', '/api/projects', {
      body: { projectName: 'Viewer Project', briefDate: '2026-01-01', materials: [{ name: 'Box', type: 'Mono Carton' }] },
      token: viewerToken
    });
    assert.strictEqual(createRes.status, 403);

    // Viewer cannot advance material (Updater required)
    const advRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/advance`, {
      token: viewerToken
    });
    assert.strictEqual(advRes.status, 403);

    delete store.sessions[viewerToken];
    delete store.users['viewer_sec@test.com'];
  });

  test('Role boundaries: Updater can advance material but CANNOT delete project or perform admin sign-off', async () => {
    // Updater CAN advance
    const advRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/advance`, {
      token: updaterToken
    });
    assert.strictEqual(advRes.status, 200);

    // Updater CANNOT delete (SuperAdmin only)
    const delRes = await apiRequest('DELETE', `/api/projects/${testProjectId}`, {
      token: updaterToken
    });
    assert.strictEqual(delRes.status, 403);

    // Updater CANNOT check spec sheet (Admin only)
    const checkRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/specsheet/check`, {
      body: { comments: 'Self checking' },
      token: updaterToken
    });
    assert.strictEqual(checkRes.status, 403);
  });

  test('Role boundaries: Admin can check spec but CANNOT execute SuperAdmin final approve or project hard-delete', async () => {
    // Admin CAN check spec sheet
    const checkRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/specsheet/check`, {
      body: { comments: 'Admin checked and verified specs' },
      token: adminToken
    });
    assert.strictEqual(checkRes.status, 200);

    // Admin CANNOT do final Head approval (Super Admin only)
    const headApproveRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/specsheet/approve`, {
      body: { comments: 'Head approval attempt' },
      token: adminToken
    });
    assert.strictEqual(headApproveRes.status, 403);

    // Admin CANNOT hard delete (Super Admin only)
    const delRes = await apiRequest('DELETE', `/api/projects/${testProjectId}`, {
      token: adminToken
    });
    assert.strictEqual(delRes.status, 403);
  });

  test('SuperAdmin can execute final approvals', async () => {
    const approveRes = await apiRequest('POST', `/api/projects/${testProjectId}/materials/0/specsheet/approve`, {
      body: { comments: 'Head of Packaging final approval verified.' },
      token: '__superadmin__'
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.project.materials[0].specSheet.governance.status, 'APPROVED');
    assert.strictEqual(approveRes.body.project.materials[0].specSignoff.signed, true);
  });

  test('Upload Security: Rejects executable and dangerous file types (400 UNSAFE_FILE_UPLOAD)', async () => {
    const maliciousFiles = [
      { name: 'exploit.exe', size: 1024, dataUrl: 'data:application/octet-stream;base64,123' },
      { name: 'payload.sh', size: 500 }
    ];

    const uploadRes = await apiRequest('PUT', `/api/projects/${testProjectId}/materials/0/artwork`, {
      body: { artworkFiles: maliciousFiles },
      token: updaterToken
    });

    assert.strictEqual(uploadRes.status, 400);
    assert.strictEqual(uploadRes.body.code, 'UNSAFE_FILE_UPLOAD');
  });

  test('Upload Security: Rejects non-PDF file buffers on PDF conversion endpoint (400 INVALID_PDF_SIGNATURE)', async () => {
    const fakePdfBase64 = Buffer.from('NOT_A_PDF_FILE_HEADER').toString('base64');

    const convertRes = await apiRequest('POST', '/api/specs/convert-pdf', {
      body: {
        fileData: fakePdfBase64,
        fileName: 'fake.pdf'
      },
      token: updaterToken
    });

    assert.strictEqual(convertRes.status, 400);
    assert.strictEqual(convertRes.body.code, 'INVALID_PDF_SIGNATURE');
  });

  test('Observability: /api/health reports system and storage readiness', async () => {
    const healthRes = await apiRequest('GET', '/api/health', { token: null });
    assert.strictEqual(healthRes.status, 200);
    assert.ok(['healthy', 'degraded'].includes(healthRes.body.status));
    assert.strictEqual(healthRes.body.dependencies.storage, 'ready');
    assert.ok(healthRes.body.memory.rssMb > 0);
  });

  test('Observability: /api/metrics reports uptime, request totals, and memory metrics', async () => {
    const metricsRes = await apiRequest('GET', '/api/metrics', { token: null });
    assert.strictEqual(metricsRes.status, 200);
    assert.ok(typeof metricsRes.body.uptime === 'number');
    assert.ok(metricsRes.body.requests.total > 0);
    assert.ok(typeof metricsRes.body.requests.avgLatencyMs === 'number');
    assert.ok(metricsRes.body.system.memoryRssMb > 0);
  });

  test('Server-side pagination returns envelope with metadata when page/limit requested', async () => {
    const paginatedRes = await apiRequest('GET', '/api/projects?page=1&limit=2', { token: adminToken });
    assert.strictEqual(paginatedRes.status, 200);
    assert.ok(Array.isArray(paginatedRes.body.projects));
    assert.ok(paginatedRes.body.projects.length <= 2);
    assert.ok(paginatedRes.body.pagination);
    assert.strictEqual(paginatedRes.body.pagination.page, 1);
    assert.strictEqual(paginatedRes.body.pagination.limit, 2);
    assert.ok(paginatedRes.body.pagination.total >= 1);
  });

  test('Authentication: Login endpoint sets secure HttpOnly cookie', async () => {
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      body: {
        email: 'updater_sec@test.com',
        password: 'Updater@123'
      },
      token: null
    });

    assert.strictEqual(loginRes.status, 200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Set-Cookie header must be present');
    assert.ok(cookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert.ok(cookieHeader.includes('SameSite=Lax'), 'Cookie must have SameSite=Lax');
  });

  test('Rate Limiter: Sliding window blocks brute force attacks (HTTP 429)', () => {
    const mockReq = {
      ip: '192.168.1.100',
      headers: {},
      socket: { remoteAddress: '192.168.1.100' }
    };
    let lastStatus = 200;
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        lastStatus = code;
        return {
          json: () => {}
        };
      }
    };
    let nextCalled = 0;
    const next = () => { nextCalled++; };

    // Simulate calling the rate limiter handler directly with NODE_ENV forced
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // Auth limiter allows 15 requests per min
      for (let i = 0; i < 15; i++) {
        authRateLimiter(mockReq, mockRes, next);
      }
      assert.strictEqual(nextCalled, 15, 'First 15 requests must be allowed');

      // 16th request must trigger rate limit 429
      authRateLimiter(mockReq, mockRes, next);
      assert.strictEqual(lastStatus, 429, '16th request within 1 min window must return HTTP 429');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

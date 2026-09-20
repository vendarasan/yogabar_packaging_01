'use strict';
/**
 * expansion.integration.test.js — Express route integration tests for Pass 8 endpoints.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const store = require('../store');
const { SUPERADMIN } = require('../constants');

// Setup mini test app mounting the exact same routes as server/index.js
const app = express();
app.use(express.json());
app.use(cookieParser());

const authRoutes = require('../routes/authRoutes');
const projectRoutes = require('../routes/projectRoutes');
const webhookRoutes = require('../routes/webhookRoutes');
const reportRoutes = require('../routes/reportRoutes');
const dataQualityRoutes = require('../routes/dataQualityRoutes');
const importRoutes = require('../routes/importRoutes');
const apiDocsRoutes = require('../routes/apiDocsRoutes');

const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/projects', projectRoutes);
v1.use('/webhooks', webhookRoutes);
v1.use('/reports', reportRoutes);
v1.use('/data-quality', dataQualityRoutes);
v1.use('/import', importRoutes);
v1.use('/', apiDocsRoutes);

app.use('/api/v1', v1);
app.use('/api', v1);

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer __superadmin__', // superadmin bypass
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('Pass 8: Integration Tests', () => {
  before(async () => {
    // Seed test project
    store.projects = store.projects || [];
    if (!store.projects.some(p => p.id === 'PRJ-EXP-001')) {
      store.projects.push({
        id: 'PRJ-EXP-001',
        projectName: 'Pass 8 Integration SKU Bar',
        fgCode: 'FG-EXP-001',
        skuSize: '45g',
        stage: 'Artwork',
        status: 'On Track',
        risk: 'Low',
        briefDate: '2026-09-01',
        targetLaunchDate: '2026-11-20',
        supplier: 'Huhtamaki Flexibles',
        materials: [
          {
            id: 'MAT-EXP-1',
            name: 'Primary Film',
            type: 'Pouch',
            pmCode: 'PM/PR/POU/50560',
            stage: 'Artwork',
            supplier: 'Huhtamaki Flexibles',
            artworkApproved: false
          }
        ],
        risks: [],
        auditTrail: []
      });
    }

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('1. GET /api/v1/openapi.json and GET /api/docs return valid API documentation', async () => {
    const specRes = await request('GET', '/api/v1/openapi.json');
    assert.strictEqual(specRes.status, 200);
    assert.strictEqual(specRes.body.openapi, '3.0.3');
    assert.ok(specRes.body.paths['/projects']);
    assert.ok(specRes.body.paths['/reports/management']);

    const docsRes = await request('GET', '/api/v1/docs');
    assert.strictEqual(docsRes.status, 200);
    assert.ok(typeof docsRes.body === 'string' && docsRes.body.includes('Packaging Development Platform API'));
  });

  it('2. GET /api/v1/reports/project-review/:id generates authoritative project briefing', async () => {
    const res = await request('GET', '/api/v1/reports/project-review/PRJ-EXP-001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.report.reportType, 'EXECUTIVE_PROJECT_REVIEW');
    assert.strictEqual(res.body.report.project.id, 'PRJ-EXP-001');
    assert.strictEqual(res.body.report.materials.length, 1);
    assert.strictEqual(res.body.report.criticalPath.materialName, 'Primary Film');
  });

  it('3. GET /api/v1/reports/management returns classified KPI categories', async () => {
    const res = await request('GET', '/api/v1/reports/management');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.report.reportType, 'MANAGEMENT_EXECUTIVE_SUMMARY');
    const cats = res.body.report.metricCategories;
    assert.ok(cats.current, 'Must contain Current category');
    assert.ok(cats.calculated, 'Must contain Calculated category');
    assert.ok(cats.historical, 'Must contain Historical category');
    assert.ok(cats.userEntered, 'Must contain User-entered category');
  });

  it('4. GET /api/v1/reports/suppliers and GET /api/v1/reports/stages calculate fact-based metrics', async () => {
    const suppRes = await request('GET', '/api/v1/reports/suppliers');
    assert.strictEqual(suppRes.status, 200);
    assert.ok(Array.isArray(suppRes.body.report.suppliers));
    assert.ok(suppRes.body.report.methodologyNote.includes('No arbitrary rankings'));

    const stageRes = await request('GET', '/api/v1/reports/stages');
    assert.strictEqual(stageRes.status, 200);
    assert.ok(Array.isArray(stageRes.body.report.stages));
    assert.ok(stageRes.body.report.stages.some(s => s.stage === 'Artwork'));
  });

  it('5. GET /api/v1/data-quality/audit returns health scorecard and anomalies', async () => {
    const res = await request('GET', '/api/v1/data-quality/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.audit.score === 'number');
    assert.ok(Array.isArray(res.body.audit.anomalies));
    assert.ok(['EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'CRITICAL'].includes(res.body.audit.rating));
  });

  it('6. POST /api/v1/import/validate and POST /api/v1/import/commit execute atomic ingestion', async () => {
    const validateRes = await request('POST', '/api/v1/import/validate', {
      records: [
        {
          projectName: 'Imported Energy Bite 30g',
          targetLaunchDate: '2026-12-10',
          supplier: 'Parksons Packaging',
          materials: [{ name: 'Outer Mono', type: 'Monocarton' }]
        }
      ]
    });
    assert.strictEqual(validateRes.status, 200);
    assert.strictEqual(validateRes.body.result.canCommit, true);

    const commitRes = await request('POST', '/api/v1/import/commit', {
      records: [
        {
          projectName: 'Imported Energy Bite 30g',
          targetLaunchDate: '2026-12-10',
          supplier: 'Parksons Packaging',
          materials: [{ name: 'Outer Mono', type: 'Monocarton' }]
        }
      ]
    });
    assert.strictEqual(commitRes.status, 201);
    assert.strictEqual(commitRes.body.result.importedCount, 1);
  });

  it('7. Webhook CRUD lifecycle: POST, GET, PUT, DELETE /api/v1/webhooks', async () => {
    // 1. Create
    const createRes = await request('POST', '/api/v1/webhooks', {
      name: 'Integration Test Hook',
      url: 'https://example.internal/webhooks/listener',
      events: ['StageChanged', 'ArtworkApproved']
    });
    assert.strictEqual(createRes.status, 201);
    const hookId = createRes.body.webhook.id;
    assert.ok(hookId.startsWith('WHK-'));

    // 2. Read
    const getRes = await request('GET', `/api/v1/webhooks/${hookId}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.webhook.name, 'Integration Test Hook');

    // 3. Update
    const putRes = await request('PUT', `/api/v1/webhooks/${hookId}`, {
      name: 'Updated Webhook Name',
      isActive: false
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.webhook.name, 'Updated Webhook Name');
    assert.strictEqual(putRes.body.webhook.isActive, false);

    // 4. Delete
    const delRes = await request('DELETE', `/api/v1/webhooks/${hookId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });
});

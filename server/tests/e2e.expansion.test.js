'use strict';
/**
 * e2e.expansion.test.js — Complete End-to-End Lifecycle Test for Pass 8.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const store = require('../store');
const { webhookService, verifySignature } = require('../services/WebhookService');
const eventBus = require('../services/EventBus');

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
let mockReceiverServer;
let mockReceiverUrl;
let receivedWebhooks = [];

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
        'Authorization': 'Bearer __superadmin__',
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

describe('Pass 8: Complete E2E Lifecycle', () => {
  before(async () => {
    // 1. Start mock webhook receiver HTTP server
    await new Promise((resolve) => {
      const receiverApp = express();
      receiverApp.use(express.json());
      receiverApp.post('/mock-webhook', (req, res) => {
        receivedWebhooks.push({
          headers: req.headers,
          body: req.body
        });
        res.status(200).json({ received: true });
      });

      mockReceiverServer = receiverApp.listen(0, () => {
        const port = mockReceiverServer.address().port;
        mockReceiverUrl = `http://127.0.0.1:${port}/mock-webhook`;
        resolve();
      });
    });

    // 2. Start main API server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    if (mockReceiverServer) await new Promise(r => mockReceiverServer.close(r));
  });

  it('Executes Full Pass 8 Execution Flow: Webhooks, Import, Auditing, Reports & Supplier Scoping', async () => {
    // ── Phase 1: Register Outbound Webhook with Secret ──
    const webhookSecret = 'sec_pass8_e2e_testing_987';
    const hookRes = await request('POST', '/api/v1/webhooks', {
      name: 'E2E ERP Webhook',
      url: mockReceiverUrl,
      secret: webhookSecret,
      events: ['*']
    });
    assert.strictEqual(hookRes.status, 201);
    const webhookId = hookRes.body.webhook.id;

    // ── Phase 2: Controlled Batch Import ──
    const importBatch = [
      {
        projectName: 'Pass 8 E2E Protein Muesli 400g',
        fgCode: 'FG-E2E-MUESLI-400',
        skuSize: '400g',
        briefDate: '2026-09-01',
        targetLaunchDate: '2026-12-25',
        supplier: 'Parksons Ltd',
        materials: [
          { name: 'Inner Barrier Pouch', type: 'Pouch', pmCode: 'PM/PR/POU/50561', supplier: 'Huhtamaki' },
          { name: 'Outer Monocarton', type: 'Monocarton', pmCode: 'PM/SE/MON/50562', supplier: 'Parksons Ltd' }
        ]
      }
    ];

    const commitRes = await request('POST', '/api/v1/import/commit', { records: importBatch });
    assert.strictEqual(commitRes.status, 201);
    assert.strictEqual(commitRes.body.result.importedCount, 1);
    const createdProjectId = commitRes.body.result.projects[0].id;
    assert.ok(createdProjectId);

    // Wait for EventBus async ticks to dispatch webhook
    await new Promise(r => setTimeout(r, 400));

    // Verify webhook receiver caught ProjectCreated event with valid HMAC
    assert.ok(receivedWebhooks.length > 0, 'Webhook receiver should have received event');
    const projectCreatedEvent = receivedWebhooks.find(w => w.body.eventType === 'ProjectCreated');
    assert.ok(projectCreatedEvent, 'ProjectCreated event must be received');
    const sigHeader = projectCreatedEvent.headers['x-signature-sha256'];
    assert.ok(sigHeader);
    const isSigValid = verifySignature(JSON.stringify(projectCreatedEvent.body), sigHeader, webhookSecret);
    assert.strictEqual(isSigValid, true, 'Webhook HMAC signature must be cryptographically valid');

    // ── Phase 3: Non-Destructive Data Quality Audit ──
    const auditRes = await request('GET', '/api/v1/data-quality/audit');
    assert.strictEqual(auditRes.status, 200);
    assert.ok(auditRes.body.audit.score >= 0 && auditRes.body.audit.score <= 100);
    assert.ok(auditRes.body.audit.totalProjectsAudited >= 1);

    // ── Phase 4: Executive Project Review Report ──
    const reportRes = await request('GET', `/api/v1/reports/project-review/${createdProjectId}`);
    assert.strictEqual(reportRes.status, 200);
    assert.strictEqual(reportRes.body.report.project.id, createdProjectId);
    assert.strictEqual(reportRes.body.report.materials.length, 2);
    assert.ok(reportRes.body.report.criticalPath.leadTimeDays > 0);

    // ── Phase 5: Factual Supplier Performance & Stage Analytics ──
    const suppReportRes = await request('GET', '/api/v1/reports/suppliers');
    assert.strictEqual(suppReportRes.status, 200);
    assert.ok(suppReportRes.body.report.suppliers.length > 0);

    const stageReportRes = await request('GET', '/api/v1/reports/stages');
    assert.strictEqual(stageReportRes.status, 200);
    assert.ok(stageReportRes.body.report.stages.length === 10);

    // ── Phase 6: Supplier Scoped Isolation ──
    // Create a mock supplier user session in store
    store.users = store.users || {};
    store.sessions = store.sessions || {};
    const supplierEmail = 'vendor@huhtamaki.com';
    store.users[supplierEmail] = {
      email: supplierEmail,
      name: 'Huhtamaki Rep',
      role: 'supplier',
      supplierName: 'Huhtamaki'
    };
    store.sessions['supplier-token-huhtamaki'] = supplierEmail;

    const supplierViewRes = await request('GET', `/api/v1/projects/${createdProjectId}`, null, {
      'Authorization': 'Bearer supplier-token-huhtamaki'
    });
    assert.strictEqual(supplierViewRes.status, 200);
    assert.strictEqual(supplierViewRes.body.project.projectName, 'Pass 8 E2E Protein Muesli 400g');
    // Supplier Huhtamaki should ONLY see Inner Barrier Pouch, NOT Parksons Outer Monocarton!
    assert.strictEqual(supplierViewRes.body.project.materials.length, 1);
    assert.strictEqual(supplierViewRes.body.project.materials[0].name, 'Inner Barrier Pouch');
    assert.deepStrictEqual(supplierViewRes.body.project.risks, [], 'Internal risks must be empty');
    assert.strictEqual(supplierViewRes.body.project.comments, '', 'Internal comments must be empty');

    // ── Phase 7: Webhook Delivery Log Verification ──
    const deliveriesRes = await request('GET', `/api/v1/webhooks/${webhookId}/deliveries`);
    assert.strictEqual(deliveriesRes.status, 200);
    assert.ok(Array.isArray(deliveriesRes.body.deliveries));
    assert.ok(deliveriesRes.body.deliveries.length > 0);
    assert.strictEqual(deliveriesRes.body.deliveries[0].status, 'SUCCESS');
    assert.strictEqual(deliveriesRes.body.deliveries[0].statusCode, 200);

    // Clean up created project & webhook
    await request('DELETE', `/api/v1/webhooks/${webhookId}`);
  });
});

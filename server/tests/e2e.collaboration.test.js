'use strict';

const { test, describe, after, before } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');

describe('Pass 7 E2E Execution: Comprehensive Collaboration & Lifecycle Journey', () => {
  let projId = null;
  let approvalId = null;
  let taskId = null;
  let riskId = null;

  before(async () => {
    // 1. Create a Project with full functional ownership
    const res = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'E2E Execution Project ' + Date.now(),
        briefDate: '2026-09-01',
        targetLaunchDate: '2026-11-30',
        ownership: {
          projectOwner: 'alexsander@company.com',
          packagingOwner: 'packaging.lead@company.com',
          artworkOwner: 'design.lead@company.com',
          procurementOwner: 'procurement.lead@company.com',
          qaOwner: 'qa.lead@company.com'
        },
        materials: [
          {
            name: 'Panchmeva Premium Tin Box',
            type: 'Tin Container',
            printType: 'Offset Lithography'
          }
        ]
      }
    });
    assert.strictEqual(res.status, 201);
    projId = res.body.project.id;
  });

  after(async () => {
    if (projId) {
      await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
    }
    await stopTestServer();
  });

  test('Execution Journey: Task Assignment -> Approval -> Stage Gate -> Risk & Comments', async () => {
    // 1. Assign Task to Design Lead
    const taskRes = await apiRequest('POST', '/api/tasks', {
      token: '__superadmin__',
      body: {
        projectId: projId,
        materialId: 'Panchmeva Premium Tin Box',
        title: 'Complete Panchmeva Tin Lid Artwork and Embossing Specs',
        stage: 'Artwork',
        assignedTo: 'design.lead@company.com',
        dueDate: '2026-09-25',
        priority: 'High'
      }
    });
    assert.strictEqual(taskRes.status, 201);
    taskId = taskRes.body.task.id;

    // 2. Sign technical spec for material
    await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsignoff`, {
      token: '__superadmin__',
      body: { signed: true, notes: 'Tin dimensions and food-grade coating confirmed' }
    });

    // 3. Advance to Artwork stage (Brief -> Sample -> Trial -> KLD -> Artwork)
    for (const stage of ['Sample', 'Trial', 'KLD', 'Artwork']) {
      const adv = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
        token: '__superadmin__'
      });
      assert.strictEqual(adv.status, 200);
      assert.strictEqual(adv.body.project.materials[0].stage, stage);
    }

    // 4. Request Artwork Approval
    const appReqRes = await apiRequest('POST', '/api/approvals', {
      token: '__superadmin__',
      body: {
        entityType: 'ARTWORK',
        entityId: 'Panchmeva Premium Tin Box',
        projectId: projId,
        materialId: 'Panchmeva Premium Tin Box',
        title: 'Approve Panchmeva Tin Embossing & Colors',
        reviewer: 'alexsander@company.com',
        comments: 'Gold foil stamping and embossed typography reviewed'
      }
    });
    assert.strictEqual(appReqRes.status, 201);
    approvalId = appReqRes.body.approval.id;

    // 5. Verify stage gate: Material CANNOT advance past Artwork until approved
    // (Non-admin updater attempt)
    const updaterToken = 'token-upd-e2e-' + Date.now();
    store.users['updater_e2e@company.com'] = { name: 'E2E Updater', role: 'updater' };
    store.sessions[updaterToken] = 'updater_e2e@company.com';

    const gateBlockedRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
      token: updaterToken
    });
    assert.strictEqual(gateBlockedRes.status, 403);
    assert.match(gateBlockedRes.body.error, /Artwork approval for.*is required before advancing to VPDF/);

    // 6. Complete task and approve artwork
    await apiRequest('POST', `/api/tasks/${taskId}/complete`, { token: '__superadmin__' });

    const approveRes = await apiRequest('POST', `/api/approvals/${approvalId}/decide`, {
      token: '__superadmin__',
      body: {
        decision: 'APPROVED',
        comments: 'Approved by Packaging Lead with gold foil embossing pass'
      }
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.approval.status, 'APPROVED');

    // 7. Advance past Artwork to VPDF succeeds now that artwork is approved!
    const vpdfAdvRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
      token: updaterToken
    });
    assert.strictEqual(vpdfAdvRes.status, 200);
    assert.strictEqual(vpdfAdvRes.body.project.materials[0].stage, 'VPDF');

    // 8. Log Stage Risk on Printing stage
    const riskRes = await apiRequest('POST', `/api/projects/${projId}/risks`, {
      token: '__superadmin__',
      body: {
        title: 'Tin plate shortage at stamping plant',
        category: 'Raw Materials',
        severity: 'Critical',
        probability: 'High',
        stage: 'Printing',
        materialId: 'Panchmeva Premium Tin Box',
        owner: 'procurement.lead@company.com',
        action: 'Import cold-rolled tin sheets from alternate vendor'
      }
    });
    assert.strictEqual(riskRes.status, 201);
    riskId = riskRes.body.risk.id;

    // 9. Add Contextual Collaboration Comment with mention
    const commentRes = await apiRequest('POST', '/api/comments', {
      token: '__superadmin__',
      body: {
        contextType: 'RISK',
        contextId: riskId,
        projectId: projId,
        content: 'Urgent: @procurement.lead@company.com alternate vendor shipment ETA requested.'
      }
    });
    assert.strictEqual(commentRes.status, 201);
    assert.strictEqual(commentRes.body.comment.mentions[0], 'procurement.lead@company.com');

    // 10. Verify audit trail on project has all structured events
    const projDetailRes = await apiRequest('GET', `/api/projects/${projId}`, {
      token: '__superadmin__'
    });
    const p = projDetailRes.body.project || projDetailRes.body;
    const audit = p.auditTrail || [];
    assert.ok(audit.some(a => a.action === 'APPROVAL_REQUESTED'));
    assert.ok(audit.some(a => a.action === 'APPROVAL_COMPLETED'));
    assert.ok(audit.some(a => a.action === 'TASK_ASSIGNED'));
    assert.ok(audit.some(a => a.action === 'RISK_LOGGED'));
  });
});

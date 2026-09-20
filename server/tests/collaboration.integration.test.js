'use strict';

const { test, describe, after, before } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');

describe('Pass 7 Integration: Advanced Workflow, Approvals, Tasks & Collaboration', () => {
  let projId = null;
  let approvalId = null;
  let taskId = null;

  before(async () => {
    // Create a dedicated test project
    const res = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'Pass 7 Collab Project ' + Date.now(),
        briefDate: '2026-09-01',
        targetLaunchDate: '2026-11-20',
        ownership: {
          projectOwner: 'alexsander@company.com',
          packagingOwner: 'amudhan@company.com',
          artworkOwner: 'priya@company.com',
          procurementOwner: 'vikram@company.com',
          qaOwner: 'neha@company.com'
        },
        materials: [
          { name: 'Primary Printed Pouch', type: 'Stand-up Pouch', printType: 'Flexo' }
        ]
      }
    });
    projId = res.body.project.id;
  });

  after(async () => {
    if (projId) {
      await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
    }
    await stopTestServer();
  });

  test('Project Ownership: Fetch and Update Functional Owners', async () => {
    const ownRes = await apiRequest('PUT', `/api/projects/${projId}/ownership`, {
      token: '__superadmin__',
      body: {
        ownership: {
          projectOwner: 'lead@company.com',
          packagingOwner: 'packaging.lead@company.com'
        }
      }
    });
    assert.strictEqual(ownRes.status, 200);
    assert.strictEqual(ownRes.body.ownership.projectOwner, 'lead@company.com');
    assert.strictEqual(ownRes.body.ownership.packagingOwner, 'packaging.lead@company.com');
  });

  test('Universal Approval Lifecycle: Request, List, Reject, and Approve with History', async () => {
    // 1. Request Artwork Approval
    const reqRes = await apiRequest('POST', '/api/approvals', {
      token: '__superadmin__',
      body: {
        entityType: 'ARTWORK',
        entityId: 'Primary Printed Pouch',
        projectId: projId,
        materialId: 'Primary Printed Pouch',
        title: 'Approve Pouch Front & Back Graphics',
        reviewer: 'brand.reviewer@company.com',
        comments: 'Check barcode size and regulatory text'
      }
    });
    assert.strictEqual(reqRes.status, 201);
    assert.ok(reqRes.body.approval.id);
    approvalId = reqRes.body.approval.id;
    assert.strictEqual(reqRes.body.approval.status, 'PENDING');

    // 2. Query Approvals
    const listRes = await apiRequest('GET', `/api/approvals?projectId=${projId}`, {
      token: '__superadmin__'
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.approvals.some(a => a.id === approvalId));

    // 3. Reject Approval with feedback
    const rejRes = await apiRequest('POST', `/api/approvals/${approvalId}/decide`, {
      token: '__superadmin__',
      body: {
        decision: 'REJECTED',
        comments: 'Barcode contrast is insufficient for high-speed scanners'
      }
    });
    assert.strictEqual(rejRes.status, 200);
    assert.strictEqual(rejRes.body.approval.status, 'REJECTED');
    assert.strictEqual(rejRes.body.approval.history.length, 2);

    // 4. Approve after designer revisions
    const appRes = await apiRequest('POST', `/api/approvals/${approvalId}/decide`, {
      token: '__superadmin__',
      body: {
        decision: 'APPROVED',
        comments: 'High contrast black barcode verified'
      }
    });
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.body.approval.status, 'APPROVED');
    // Verify history array kept all past decisions
    assert.strictEqual(appRes.body.approval.history.length, 3);
    assert.strictEqual(appRes.body.approval.history[1].decision, 'REJECTED');
    assert.strictEqual(appRes.body.approval.history[2].decision, 'APPROVED');
  });

  test('Tasks & Actions: Create, Query, Update, and Complete', async () => {
    // 1. Create Task
    const createRes = await apiRequest('POST', '/api/tasks', {
      token: '__superadmin__',
      body: {
        projectId: projId,
        materialId: 'Primary Printed Pouch',
        title: 'Conduct Cylinder Proof Run',
        description: 'Check dot gain and trapping on test press',
        stage: 'Printing',
        assignedTo: 'operator@printer.com',
        dueDate: '2026-10-28',
        priority: 'High'
      }
    });
    assert.strictEqual(createRes.status, 201);
    taskId = createRes.body.task.id;
    assert.strictEqual(createRes.body.task.status, 'PENDING');

    // 2. Query Tasks for project
    const listRes = await apiRequest('GET', `/api/tasks?projectId=${projId}`, {
      token: '__superadmin__'
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.tasks.some(t => t.id === taskId));

    // 3. Mark Task as BLOCKED
    const blockRes = await apiRequest('PUT', `/api/tasks/${taskId}`, {
      token: '__superadmin__',
      body: { status: 'BLOCKED', priority: 'Critical' }
    });
    assert.strictEqual(blockRes.status, 200);
    assert.strictEqual(blockRes.body.task.status, 'BLOCKED');
    assert.strictEqual(blockRes.body.task.priority, 'Critical');

    // 4. Complete Task
    const compRes = await apiRequest('POST', `/api/tasks/${taskId}/complete`, {
      token: '__superadmin__'
    });
    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.body.task.status, 'COMPLETED');
    assert.ok(compRes.body.task.completedAt);
  });

  test('Risk Register Integration: Add, Query, and Resolve Structured Risks', async () => {
    // 1. Add Risk connected to Material and Action
    const addRiskRes = await apiRequest('POST', `/api/projects/${projId}/risks`, {
      token: '__superadmin__',
      body: {
        title: 'Cylinder lead time delay',
        description: 'Vendor reporting copper plating maintenance',
        category: 'Manufacturing',
        severity: 'High',
        probability: 'Medium',
        stage: 'Printing',
        materialId: 'Primary Printed Pouch',
        owner: 'vikram@company.com',
        action: 'Route second set of artwork to backup cylinder engraver'
      }
    });
    assert.strictEqual(addRiskRes.status, 201);
    const riskId = addRiskRes.body.risk.id;
    assert.strictEqual(addRiskRes.body.risk.status, 'Open');

    // 2. Query Project Risks
    const getRisksRes = await apiRequest('GET', `/api/projects/${projId}/risks`, {
      token: '__superadmin__'
    });
    assert.strictEqual(getRisksRes.status, 200);
    assert.ok(getRisksRes.body.risks.some(r => r.id === riskId));

    // 3. Update Risk to Resolved
    const updRiskRes = await apiRequest('PUT', `/api/projects/${projId}/risks/${riskId}`, {
      token: '__superadmin__',
      body: {
        status: 'Resolved',
        action: 'Backup engraver delivered on schedule'
      }
    });
    assert.strictEqual(updRiskRes.status, 200);
    assert.strictEqual(updRiskRes.body.risk.status, 'Resolved');
  });

  test('Contextual Comments: Add Threaded Comment with @Mentions', async () => {
    const cmtRes = await apiRequest('POST', '/api/comments', {
      token: '__superadmin__',
      body: {
        contextType: 'PROJECT',
        contextId: projId,
        projectId: projId,
        content: 'Critical path update: @vikram@company.com please confirm proof dispatch date.'
      }
    });
    assert.strictEqual(cmtRes.status, 201);
    assert.strictEqual(cmtRes.body.comment.mentions.length, 1);
    assert.strictEqual(cmtRes.body.comment.mentions[0], 'vikram@company.com');

    // Query comments
    const listRes = await apiRequest('GET', `/api/comments?contextType=PROJECT&contextId=${projId}`, {
      token: '__superadmin__'
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.comments.some(c => c.id === cmtRes.body.comment.id));
  });

  test('Notification Center: Get User Notifications, Read Status, and Preferences', async () => {
    // 1. Get notifications for Super Admin
    const notifRes = await apiRequest('GET', '/api/notifications', {
      token: '__superadmin__'
    });
    assert.strictEqual(notifRes.status, 200);
    assert.ok(Array.isArray(notifRes.body.notifications));

    // 2. Preferences
    const prefRes = await apiRequest('GET', '/api/notifications/preferences', {
      token: '__superadmin__'
    });
    assert.strictEqual(prefRes.status, 200);
    assert.strictEqual(prefRes.body.preferences.inAppEnabled, true);

    // 3. Update Preferences
    const updPrefRes = await apiRequest('PUT', '/api/notifications/preferences', {
      token: '__superadmin__',
      body: {
        dailySummaryEnabled: true,
        notificationCategories: { Supplier: false }
      }
    });
    assert.strictEqual(updPrefRes.status, 200);
    assert.strictEqual(updPrefRes.body.preferences.dailySummaryEnabled, true);
    assert.strictEqual(updPrefRes.body.preferences.notificationCategories.Supplier, false);
  });

  test('Global Search: Search across Projects, Materials, Tasks, Risks, and Specs', async () => {
    const searchRes = await apiRequest('GET', '/api/search?q=pouch', {
      token: '__superadmin__'
    });
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.totalMatches > 0);
    assert.ok(searchRes.body.results.materials.length > 0 || searchRes.body.results.projects.length > 0);
  });
});

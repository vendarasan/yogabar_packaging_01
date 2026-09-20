'use strict';

const test = require('node:test');
const assert = require('node:assert');

const store = require('../store');
const ApprovalService = require('../services/ApprovalService');
const TaskService = require('../services/TaskService');
const CommentService = require('../services/CommentService');
const NotificationService = require('../services/NotificationService');
const RiskService = require('../services/RiskService');
const workflow = require('../config/workflow');

test('Pass 7 Unit: Approval Engine & Immutable History', async (t) => {
  const dummyUser = { name: 'Packaging Manager', email: 'pkg.mgr@company.com', role: 'admin' };
  const dummyReviewer = { name: 'Brand Approver', email: 'brand.lead@company.com', role: 'superadmin' };

  // Setup a test project in store
  const testProj = {
    id: 'PRJ-TEST-APP',
    projectName: 'Protein Wafer Approval Test',
    stage: 'Artwork',
    materials: [
      {
        id: 'MAT-001',
        name: 'Primary Printed Pouch',
        type: 'Pouch',
        stage: 'Artwork',
        artworkApproved: false
      }
    ],
    ownership: { packagingOwner: 'pkg.mgr@company.com' }
  };
  store.projects = store.projects || [];
  store.projects.push(testProj);

  // 1. Create Approval Request
  const approval = await ApprovalService.createApproval({
    entityType: 'ARTWORK',
    entityId: 'MAT-001',
    projectId: testProj.id,
    materialId: 'MAT-001',
    title: 'Protein Wafer Final Artwork Approval',
    reviewer: dummyReviewer.email,
    comments: 'Please verify regulatory and nutrition table typography'
  }, dummyUser);

  assert.ok(approval.id.startsWith('APP-'));
  assert.strictEqual(approval.status, 'PENDING');
  assert.strictEqual(approval.history.length, 1);
  assert.strictEqual(approval.history[0].action, 'REQUESTED');

  // 2. Decide: REJECTED with feedback
  const rejected = await ApprovalService.decide(approval.id, {
    decision: 'REJECTED',
    comments: 'Nutrition table font size is below 6pt specification'
  }, dummyReviewer);

  assert.strictEqual(rejected.status, 'REJECTED');
  assert.strictEqual(rejected.history.length, 2);
  assert.strictEqual(rejected.history[1].decision, 'REJECTED');
  assert.strictEqual(testProj.materials[0].artworkApproved, false);

  // 3. Second Decision cycle: Re-approved after designer fix
  const approved = await ApprovalService.decide(approval.id, {
    decision: 'APPROVED',
    comments: 'Nutrition table resized to 7.5pt. Compliant with legal guidelines.'
  }, dummyReviewer);

  assert.strictEqual(approved.status, 'APPROVED');
  // History preserved! Never overwritten
  assert.strictEqual(approved.history.length, 3);
  assert.strictEqual(approved.history[1].decision, 'REJECTED');
  assert.strictEqual(approved.history[2].decision, 'APPROVED');
  // Cascaded to material
  assert.strictEqual(testProj.materials[0].artworkApproved, true);
  assert.strictEqual(testProj.materials[0].artworkStatus, 'Approved');
});

test('Pass 7 Unit: Structured Tasks & Action Items Lifecycle', async (t) => {
  const user = { name: 'Design Lead', email: 'designer@company.com', role: 'updater' };

  const task = await TaskService.createTask({
    projectId: 'PRJ-TEST-APP',
    materialId: 'MAT-001',
    title: 'Approve VPDF for Protein Wafer',
    description: 'Review digital proof against approved artwork',
    stage: 'VPDF',
    assignedTo: 'design@company.com',
    dueDate: '2026-10-15',
    priority: 'High'
  }, user);

  assert.ok(task.id.startsWith('TSK-'));
  assert.strictEqual(task.status, 'PENDING');
  assert.strictEqual(task.priority, 'High');

  // Update status to IN_PROGRESS then BLOCKED
  const blocked = await TaskService.updateTask(task.id, { status: 'BLOCKED' }, user);
  assert.strictEqual(blocked.status, 'BLOCKED');

  // Complete task
  const completed = await TaskService.completeTask(task.id, user);
  assert.strictEqual(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt);
});

test('Pass 7 Unit: Contextual Comments & @Mentions Parsing', async (t) => {
  const author = { name: 'QA Specialist', email: 'qa@company.com', role: 'updater' };

  store.users['procurement@company.com'] = { name: 'Procurement Specialist', role: 'updater' };

  const comment = await CommentService.addComment({
    contextType: 'PROJECT',
    contextId: 'PRJ-TEST-APP',
    projectId: 'PRJ-TEST-APP',
    content: 'Please check the cylinder engraving status @procurement@company.com before printing stage'
  }, author);

  assert.ok(comment.id.startsWith('CMT-'));
  assert.strictEqual(comment.mentions.length, 1);
  assert.strictEqual(comment.mentions[0], 'procurement@company.com');

  const thread = await CommentService.getComments({ contextType: 'PROJECT', contextId: 'PRJ-TEST-APP' });
  assert.ok(thread.some(c => c.id === comment.id));
});

test('Pass 7 Unit: Risk Register Integration & Severity Escalation', async (t) => {
  const user = { name: 'Supply Chain Mgr', email: 'supply@company.com', role: 'admin' };

  const risk = await RiskService.addRisk('PRJ-TEST-APP', {
    title: 'Supplier lead-time delay on printed pouch laminate',
    description: 'Solvent delivery backlog at converting facility',
    category: 'Supply Chain',
    severity: 'High',
    stage: 'Printing',
    materialId: 'MAT-001',
    owner: 'procurement@company.com',
    action: 'Confirm alternate converting capacity with secondary converter'
  }, user);

  assert.ok(risk.id.startsWith('RSK-'));
  assert.strictEqual(risk.owner, 'procurement@company.com');
  assert.strictEqual(risk.status, 'Open');

  // Update risk to Mitigating then Resolved
  const updated = await RiskService.updateRisk('PRJ-TEST-APP', risk.id, {
    status: 'Resolved',
    action: 'Secondary capacity booked for 25th September'
  }, user);

  assert.strictEqual(updated.status, 'Resolved');
  assert.ok(updated.resolvedAt);
});

test('Pass 7 Unit: Stage Gating & Workflow Dependencies', async (t) => {
  assert.ok(Array.isArray(workflow.workflowDependencies));
  assert.strictEqual(workflow.workflowDependencies.length, 5);
  assert.strictEqual(workflow.workflowDependencies[0].fromStage, 'Artwork');
  assert.strictEqual(workflow.workflowDependencies[0].toStage, 'VPDF');

  // Test Artwork Gate
  const unapprovedMat = { name: 'Box', artworkApproved: false };
  const approvedMat = { name: 'Pouch', artworkApproved: true };

  // Non-admin check fails
  const nonAdminCheck = workflow.stageGates.Artwork.check([unapprovedMat], { user: { role: 'updater' } });
  assert.strictEqual(nonAdminCheck.pass, false);
  assert.match(nonAdminCheck.error, /Artwork approval for.*is required before advancing/);

  // Admin override passes
  const adminCheck = workflow.stageGates.Artwork.check([unapprovedMat], { user: { role: 'admin' } });
  assert.strictEqual(adminCheck.pass, true);
  assert.strictEqual(adminCheck.adminOverride, true);

  // Approved material passes
  const approvedCheck = workflow.stageGates.Artwork.check([approvedMat], { user: { role: 'updater' } });
  assert.strictEqual(approvedCheck.pass, true);
});

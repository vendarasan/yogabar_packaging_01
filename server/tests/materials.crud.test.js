const { test, describe, after, before } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');

describe('Material Lifecycle, Governance, & PO Endpoints', () => {
  let projId = null;

  before(async () => {
    // Create a fresh test project for material operations
    const res = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'Material Lifecycle Project ' + Date.now(),
        briefDate: '2026-09-01',
        materials: [
          { name: 'Printed Film Roll', type: 'Film Roll (Flow Wrap)', printType: 'Rotogravure' }
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

  test('Material Spec Sign-off: Confirm and Revoke', async () => {
    // 1. Confirm spec sign-off
    const signRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsignoff`, {
      token: '__superadmin__',
      body: { signed: true, notes: 'Confirmed all roll parameters' }
    });
    assert.strictEqual(signRes.status, 200);
    assert.strictEqual(signRes.body.specSignoff.signed, true);
    assert.strictEqual(signRes.body.specSignoff.notes, 'Confirmed all roll parameters');

    // 2. Revoke spec sign-off
    const revokeRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsignoff`, {
      token: '__superadmin__',
      body: { signed: false }
    });
    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(revokeRes.body.specSignoff, null);
  });

  test('Stage Gating: Advancing without Spec Sign-off requires Admin Approval', async () => {
    // Non-admin user attempt
    const updaterToken = 'token-upd-' + Date.now();
    store.users['updater_gate@yogabar.com'] = { name: 'Gate Updater', role: 'updater' };
    store.sessions[updaterToken] = 'updater_gate@yogabar.com';

    const gateRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
      token: updaterToken
    });
    assert.strictEqual(gateRes.status, 403);
    assert.match(gateRes.body.error, /Technical specifications for.*must be signed off before advancing/);

    // Re-sign specs for subsequent advance tests
    await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsignoff`, {
      token: '__superadmin__',
      body: { signed: true, notes: 'Signed off by Packaging Engineer' }
    });
  });

  test('Material Stage Progression: Advance from Brief -> Sample -> Trial -> KLD -> Artwork -> VPDF', async () => {
    // Advance through the initial stages
    const stages = ['Sample', 'Trial', 'KLD', 'Artwork', 'VPDF'];
    for (const expectedStage of stages) {
      const advRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
        token: '__superadmin__'
      });
      assert.strictEqual(advRes.status, 200);
      assert.strictEqual(advRes.body.project.materials[0].stage, expectedStage);
    }
  });

  test('Stage Gating: Cannot advance from VPDF to Printing unless PO is Raised', async () => {
    // Current stage is VPDF, poStatus is default 'RFQ in progress'
    const failAdvRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
      token: '__superadmin__'
    });
    assert.strictEqual(failAdvRes.status, 400);
    assert.match(failAdvRes.body.error, /Purchase Order for.*must be 'Raised' first/);

    // Update PO to 'Raised'
    const poRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/po`, {
      token: '__superadmin__',
      body: { poStatus: 'Raised', poNumber: 'PO-2026-999' }
    });
    assert.strictEqual(poRes.status, 200);
    assert.strictEqual(poRes.body.project.materials[0].poStatus, 'Raised');
    assert.strictEqual(poRes.body.project.materials[0].poNumber, 'PO-2026-999');

    // Advance to Printing succeeds
    const printAdvRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/advance`, {
      token: '__superadmin__'
    });
    assert.strictEqual(printAdvRes.status, 200);
    assert.strictEqual(printAdvRes.body.project.materials[0].stage, 'Printing');
  });

  test('Material Stage Revoke: Revoke backward from Printing to VPDF', async () => {
    const revRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/revoke`, {
      token: '__superadmin__'
    });
    assert.strictEqual(revRes.status, 200);
    assert.strictEqual(revRes.body.project.materials[0].stage, 'VPDF');
  });

  test('Material Spec Sheet Governance Workflow: Save Draft -> Check -> Approve / Reject', async () => {
    const mockSpecSheet = {
      category: 'film_roll',
      docHeader: { docName: 'Flow Wrap Master Spec', itemCode: 'PM/PR/FLM/50560', revision: '1.0' },
      parameters: [
        { sNo: 1, parameter: 'Total Thickness', standard: '40 micron +/- 5%', defectType: 'CR' },
        { sNo: 2, parameter: 'COF (Kinetic)', standard: '0.25 - 0.35', defectType: 'MJ' }
      ],
      governance: { status: 'PENDING_CHECK' }
    };

    // 1. Save spec sheet draft
    const saveRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/specsheet`, {
      token: '__superadmin__',
      body: { specSheet: mockSpecSheet }
    });
    assert.strictEqual(saveRes.status, 200);
    assert.strictEqual(saveRes.body.specSheet.docHeader.docName, 'Flow Wrap Master Spec');

    // 2. PM Check
    const checkRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/specsheet/check`, {
      token: '__superadmin__',
      body: { comments: 'All barrier parameters verified.' }
    });
    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkRes.body.specSheet.governance.status, 'CHECKED_PENDING_APPROVAL');

    // 3. Super Admin Final Approval
    const approveRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/specsheet/approve`, {
      token: '__superadmin__',
      body: { comments: 'Approved for manufacturing.' }
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.specSheet.governance.status, 'APPROVED');

    // 4. Revision Request
    const rejectRes = await apiRequest('POST', `/api/projects/${projId}/materials/0/specsheet/reject`, {
      token: '__superadmin__',
      body: { reason: 'Need to add oxygen transmission rate requirement.' }
    });
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.body.specSheet.governance.status, 'REVISION_REQUESTED');
  });
});

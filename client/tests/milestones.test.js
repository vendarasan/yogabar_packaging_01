import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calcMatMilestones,
  calcProjectMilestones,
  getProjectStage,
  getProjectProgress,
  getLTStatus,
  getDaysLeft,
  getNextAction,
  determineCPMIndex,
  getMaterialLeadTime,
  getMaterialHierarchyTier,
  isPouch
} from '../src/utils.js';

describe('Packaging Milestones & Critical Path Engine (CPM)', () => {
  const briefDate = '2026-10-01';

  test('calcMatMilestones — Calculates accurate stage dates for Digital Print pouch (15d lead time)', () => {
    const mat = {
      name: 'Energy Bar Pouch',
      type: 'Flexible Pouch',
      printType: 'Digital Print'
    };
    const ms = calcMatMilestones(briefDate, mat);

    assert.strictEqual(ms.Brief, '2026-10-01');
    assert.strictEqual(ms.Sample, '2026-10-06'); // +5d
    assert.strictEqual(ms.Trial, '2026-10-13');  // +7d
    assert.strictEqual(ms.KLD, '2026-10-16');    // +3d
    assert.strictEqual(ms.Artwork, '2026-10-21');// +5d
    assert.strictEqual(ms.VPDF, '2026-10-23');   // +2d
    assert.strictEqual(ms.Printing, '2026-11-07'); // +15d (Digital)
    assert.strictEqual(ms.Dispatch, '2026-11-11'); // +4d
    assert.strictEqual(ms.Connectivity, '2026-11-15'); // +4d
  });

  test('calcMatMilestones — Calculates lead times for Gravure Print pouch (35d lead time)', () => {
    const mat = {
      name: 'Gravure Center Seal Pouch',
      type: 'Stand-up Pouch',
      printType: 'Gravure Print'
    };
    const ms = calcMatMilestones(briefDate, mat);

    assert.strictEqual(ms.VPDF, '2026-10-23');
    // Printing = 2026-10-23 + 35d = 2026-11-27
    assert.strictEqual(ms.Printing, '2026-11-27');
    assert.strictEqual(ms.Dispatch, '2026-12-01');
    assert.strictEqual(ms.Connectivity, '2026-12-05');
  });

  test('calcProjectMilestones — Synchronizes project timeline based on longest component path', () => {
    const mats = [
      {
        name: 'Monocarton',
        type: 'Monocarton',
        milestones: calcMatMilestones(briefDate, { type: 'Monocarton' }) // 15d lead
      },
      {
        name: 'Barrier Pouch',
        type: 'Stand-up Pouch',
        printType: 'Gravure Print',
        milestones: calcMatMilestones(briefDate, { type: 'Stand-up Pouch', printType: 'Gravure Print' }) // 35d lead
      },
      {
        name: 'Shipper Box',
        type: 'Corrugated Shipper',
        milestones: calcMatMilestones(briefDate, { type: 'Corrugated Shipper' }) // 10d lead
      }
    ];

    const projMs = calcProjectMilestones(briefDate, mats);
    // Project Printing and Connectivity must match the longest component (Gravure Pouch)
    assert.strictEqual(projMs.Printing, '2026-11-27');
    assert.strictEqual(projMs.Connectivity, '2026-12-05');
  });

  test('determineCPMIndex — Accurately selects bottleneck material with longest Connectivity date', () => {
    const mats = [
      {
        name: 'Monocarton Box',
        type: 'Monocarton',
        milestones: { Connectivity: '2026-11-10' }
      },
      {
        name: 'Gravure Foil Pouch',
        type: 'Flexible Pouch',
        milestones: { Connectivity: '2026-12-05' } // Latest date
      },
      {
        name: 'Outer Shipper',
        type: 'Corrugated Shipper',
        milestones: { Connectivity: '2026-10-28' }
      }
    ];

    const cpmIdx = determineCPMIndex(mats);
    assert.strictEqual(cpmIdx, 1, 'Index 1 (Gravure Foil Pouch) must be the CPM');
  });

  test('determineCPMIndex — Breaks ties using Packaging Hierarchy (Tier 1 Primary Container over Tier 4 Outer Box)', () => {
    // Both materials have identical Connectivity dates
    const mats = [
      {
        name: 'Outer Monocarton Box',
        type: 'Monocarton', // Tier 4
        milestones: { Connectivity: '2026-11-20' }
      },
      {
        name: 'Primary Glass Jar',
        type: 'Glass Bottle', // Tier 1
        milestones: { Connectivity: '2026-11-20' }
      }
    ];

    const cpmIdx = determineCPMIndex(mats);
    assert.strictEqual(cpmIdx, 1, 'Index 1 (Glass Bottle Tier 1) must take precedence over Tier 4');
  });

  test('getMaterialLeadTime & isPouch helper checks', () => {
    assert.strictEqual(isPouch('Flexible Pouch'), true);
    assert.strictEqual(isPouch('Stand-up Pouch'), true);
    assert.strictEqual(isPouch('Monocarton'), false);

    assert.strictEqual(getMaterialLeadTime({ type: 'Flexible Pouch', printType: 'Digital Print' }), 15);
    assert.strictEqual(getMaterialLeadTime({ type: 'Flexible Pouch', printType: 'Flexo Print' }), 21);
    assert.strictEqual(getMaterialLeadTime({ type: 'Flexible Pouch', printType: 'Gravure Print' }), 35);
    assert.strictEqual(getMaterialLeadTime({ type: 'Monocarton' }), 15);
    assert.strictEqual(getMaterialLeadTime({ type: 'Corrugated Shipper' }), 10);
    assert.strictEqual(getMaterialLeadTime({ type: 'Laminated Tube' }), 45);
    // Custom lead time override
    assert.strictEqual(getMaterialLeadTime({ type: 'Monocarton', customLeadTime: 28 }), 28);
  });

  test('getProjectStage & getProjectProgress logic', () => {
    const project = {
      status: 'In Progress',
      materials: [
        { stage: 'Trial' },
        { stage: 'Brief' },
        { stage: 'Artwork' }
      ]
    };

    // Project stage is governed by the least advanced component (Brief)
    assert.strictEqual(getProjectStage(project), 'Brief');

    // Progress percentage: (30 + 10 + 50) / 3 = 30%
    assert.strictEqual(getProjectProgress(project), 30);

    // Launched project is always 100%
    assert.strictEqual(getProjectProgress({ status: 'Launched' }), 100);
  });

  test('getNextAction — Deterministically derives next action based on workflow gates', () => {
    // 1. Launched project
    assert.strictEqual(getNextAction('Launch', null, { status: 'Launched' }), 'Project Live in Market');

    // 2. Pending Stage 1 crunch approval
    assert.strictEqual(getNextAction('Sample', null, { crunchPlan: { status: 'PENDING_STAGE1' } }), 'Approve Crunched Timeline (Stage 1)');

    // 3. Pending Stage 2 crunch sign-off
    assert.strictEqual(getNextAction('Sample', null, { crunchPlan: { status: 'PENDING_STAGE2' } }), 'Sign-Off Crunched Timeline (Stage 2)');

    // 4. Missing PO for printing at VPDF stage
    const matUnraisedPO = { poStatus: 'RFQ in progress', specSignoff: { signed: true } };
    assert.strictEqual(getNextAction('VPDF', matUnraisedPO), 'Raise Purchase Order for Printing');

    // 5. Missing spec sign-off at non-Brief stage
    const matUnsigned = { specSignoff: { signed: false } };
    assert.strictEqual(getNextAction('Sample', matUnsigned), 'Confirm Technical Spec Sign-Off');

    // 6. Stage specific normal actions
    const matSigned = { specSignoff: { signed: true }, poStatus: 'Raised' };
    assert.strictEqual(getNextAction('Brief', matSigned), 'Complete Brief & Initiate Sampling');
    assert.strictEqual(getNextAction('KLD', matSigned), 'Finalize & Approve KLD');
    assert.strictEqual(getNextAction('Printing', matSigned), 'Release Printing & Quality Inspection');
    assert.strictEqual(getNextAction('Connectivity', matSigned), 'Complete Connectivity & Batch Code');
  });
});

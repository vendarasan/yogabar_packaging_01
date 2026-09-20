'use strict';
/**
 * workflow.js — Configuration-driven packaging development workflow engine.
 *
 * This is the single source of truth for:
 *  - Stage order, colors, completion percentages, and lead times
 *  - Gate rules that must pass before a stage advance is permitted
 *  - Crunch approval chain configuration
 *  - Role hierarchy for workflow actions
 *
 * To add a new stage: add it to `stages`, give it a color/pct/lead, and
 * optionally define a gate in `stageGates`.
 *
 * To add a new gate rule: add a predicate to `stageGates[fromStage]`.
 *
 * Business rules are NOT hard-coded in routes anymore — they live here.
 */

// ── Stage Pipeline ────────────────────────────────────────────────────────────

const stages = [
  'Brief',
  'Sample',
  'Trial',
  'KLD',
  'Artwork',
  'VPDF',
  'Printing',
  'Dispatch',
  'Connectivity',
  'Launch'
];

const stageColors = {
  Brief:        '#7c4dff',
  Sample:       '#00b0ff',
  Trial:        '#00bfa5',
  KLD:          '#ffd740',
  Artwork:      '#ff6d00',
  VPDF:         '#e040fb',
  Printing:     '#76ff03',
  Dispatch:     '#ff4081',
  Connectivity: '#40c4ff',
  Launch:       '#00e676'
};

const stageCompletion = {
  Brief:        10,
  Sample:       20,
  Trial:        30,
  KLD:          40,
  Artwork:      50,
  VPDF:         60,
  Printing:     70,
  Dispatch:     80,
  Connectivity: 90,
  Launch:       100
};

/** Lead time (in working days) for each stage, used in milestone calculation */
const stageLead = {
  Sample:       5,
  Trial:        7,
  KLD:          3,
  Artwork:      5,
  VPDF:         2,
  Dispatch:     4,
  Connectivity: 4
};

// ── Gate Rules ────────────────────────────────────────────────────────────────
/**
 * stageGates defines what checks must pass before materials at a given stage
 * can be advanced to the next stage.
 *
 * Each gate is an object with:
 *   - check(materials, context):   function returning { pass, error, extra }
 *   - adminCanOverride:            if true, admins/superadmins can bypass
 *
 * context = { user, project, adminApproval, adminNotes }
 */
const stageGates = {
  /**
   * Gate: All stages require spec signoff (or admin override).
   * Applied before every advance — checked in ProjectService.
   */
  specSignoff: {
    adminCanOverride: true,
    check(materialsToAdvance, context) {
      const unsigned = materialsToAdvance.filter(
        m => !(m.specSignoff && m.specSignoff.signed)
      );
      if (unsigned.length === 0) return { pass: true };
      const isAdmin = ['admin', 'superadmin'].includes(context.user && context.user.role);
      if (isAdmin || context.adminApproval === true) {
        return { pass: true, adminOverride: true, materials: unsigned };
      }
      return {
        pass: false,
        error: `Action Gated: Technical specifications for "${unsigned.map(m => m.name).join(', ')}" must be signed off before advancing. If not signed off, Admin approval is required.`,
        requiresSpecSignoff: true,
        unsignedMaterials: unsigned.map(m => m.name)
      };
    }
  },

  /**
   * Gate: Advancing from Artwork to VPDF requires Artwork approval (or Admin override).
   */
  Artwork: {
    adminCanOverride: true,
    check(materialsToAdvance, context = {}) {
      const unapproved = materialsToAdvance.filter(m => {
        const isApproved = m.artworkApproved === true ||
          m.artworkStatus === 'Approved' ||
          (m.artworkApproval && m.artworkApproval.status === 'APPROVED') ||
          (m.approvalInfo && m.approvalInfo.status === 'APPROVED');
        return !isApproved;
      });
      if (unapproved.length === 0) return { pass: true };
      const isAdmin = ['admin', 'superadmin'].includes(context.user && context.user.role);
      if (isAdmin || context.adminApproval === true) {
        return { pass: true, adminOverride: true, materials: unapproved };
      }
      return {
        pass: false,
        error: `Action Gated: Artwork approval for "${unapproved.map(m => m.name).join(', ')}" is required before advancing to VPDF. If not approved, Admin approval is required.`,
        requiresArtworkApproval: true,
        unapprovedMaterials: unapproved.map(m => m.name)
      };
    }
  },

  /**
   * Gate: Advancing from VPDF to Printing requires PO to be 'Raised'.
   */
  VPDF: {
    adminCanOverride: false,
    check(materialsToAdvance) {
      const unraised = materialsToAdvance.filter(
        m => (m.poStatus || 'RFQ in progress') !== 'Raised'
      );
      if (unraised.length === 0) return { pass: true };
      return {
        pass: false,
        error: `Cannot advance to Printing: Purchase Order for "${unraised.map(m => m.name).join(', ')}" must be 'Raised' first.`
      };
    }
  }
};

// ── Workflow Sequential Dependencies (Pass 7) ─────────────────────────────────
const workflowDependencies = [
  { fromStage: 'Artwork', toStage: 'VPDF', rule: 'Artwork approval required', isGated: true },
  { fromStage: 'VPDF', toStage: 'Printing', rule: 'Purchase Order raised', isGated: true },
  { fromStage: 'Printing', toStage: 'Dispatch', rule: 'Production completion & QA release', isGated: false },
  { fromStage: 'Dispatch', toStage: 'Connectivity', rule: 'Transit & Plant arrival confirmation', isGated: false },
  { fromStage: 'Connectivity', toStage: 'Launch', rule: 'Line trial & Finished Goods packaging', isGated: false }
];

// ── Crunch Approval Chain ─────────────────────────────────────────────────────
const crunchApproval = {
  /**
   * Stage 1: Admin review — required before any stage advance on a crunched project
   */
  stage1: {
    role: 'admin',
    label: 'Stage 1 (Admin Review)',
    status: 'PENDING_STAGE1'
  },
  /**
   * Stage 2: Super Admin final sign-off — required before production
   */
  stage2: {
    role: 'superadmin',
    label: 'Stage 2 (Super Admin Final Sign-Off)',
    status: 'PENDING_STAGE2'
  },
  approvedStatus: 'APPROVED'
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the zero-based index of a stage in the pipeline.
 * Returns -1 if not found.
 */
function stageIndex(stageName) {
  return stages.indexOf(stageName);
}

/**
 * Get the next stage after the given stage.
 * Returns null if already at the last stage.
 */
function nextStage(stageName) {
  const idx = stageIndex(stageName);
  if (idx === -1 || idx >= stages.length - 1) return null;
  return stages[idx + 1];
}

/**
 * Get the previous stage before the given stage.
 * Returns null if already at the first stage.
 */
function prevStage(stageName) {
  const idx = stageIndex(stageName);
  if (idx <= 0) return null;
  return stages[idx - 1];
}

/**
 * Determine the overall project stage from its materials.
 * The project stage = the minimum stage across all materials.
 */
function deriveProjectStage(materials) {
  if (!materials || !materials.length) return stages[0];
  const minIdx = Math.min(...materials.map(m => stageIndex(m.stage || stages[0])));
  return stages[minIdx];
}

/**
 * Check if a crunch plan is blocking advance.
 * Returns { blocked, reason } 
 */
function checkCrunchGate(crunchPlan) {
  if (!crunchPlan) return { blocked: false };
  const blockingStatuses = [crunchApproval.stage1.status, crunchApproval.stage2.status];
  if (blockingStatuses.includes(crunchPlan.status)) {
    const stage = crunchPlan.status === crunchApproval.stage1.status
      ? crunchApproval.stage1.label
      : crunchApproval.stage2.label;
    return {
      blocked: true,
      reason: `Action Gated: This project has a crunched launch timeline pending ${stage}. Approval must be granted before progressing to the next stage.`,
      crunchStatus: crunchPlan.status
    };
  }
  return { blocked: false };
}

module.exports = {
  stages,
  stageColors,
  stageCompletion,
  stageLead,
  stageGates,
  workflowDependencies,
  crunchApproval,
  stageIndex,
  nextStage,
  prevStage,
  deriveProjectStage,
  checkCrunchGate
};

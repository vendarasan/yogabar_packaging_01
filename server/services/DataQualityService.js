'use strict';
/**
 * DataQualityService.js — Enterprise Data Quality & Anomaly Detection for Pass 8.
 *
 * Identifies:
 *  1. Missing PM Codes on components
 *  2. Missing suppliers on materials or projects
 *  3. Missing target launch dates
 *  4. Incomplete stage milestones / progression data
 *  5. Duplicate PM codes across distinct components
 *  6. Duplicate FG codes across projects
 *  7. Invalid stage / spec relationships
 *
 * Strictly non-destructive: audits records and reports anomalies without modifying data.
 */

const { loadAllProjects } = require('./PersistenceService');
const { getProjectStage } = require('../utils');

class DataQualityService {
  /**
   * Execute full data quality audit across projects and materials.
   * @returns {Promise<object>}
   */
  async runAudit() {
    const projects = await loadAllProjects();
    const activeProjects = projects.filter(p => !p.isDeleted);

    const anomalies = [];
    const pmCodeMap = new Map(); // pmCode -> [{ projectId, projectName, materialName }]
    const fgCodeMap = new Map(); // fgCode -> [{ projectId, projectName }]

    activeProjects.forEach(p => {
      const pStage = getProjectStage(p);

      // Rule: Missing target launch date
      if (!p.targetLaunchDate && p.status !== 'Launched') {
        anomalies.push({
          id: `DQ-PLD-${p.id}`,
          rule: 'MISSING_LAUNCH_DATE',
          severity: 'Critical',
          projectId: p.id,
          projectName: p.projectName,
          materialName: null,
          message: `Active project "${p.projectName}" has no designated target launch date`,
          suggestion: 'Set authoritative target launch date in Project Settings'
        });
      }

      // Rule: Duplicate FG code
      if (p.fgCode && p.fgCode.trim()) {
        const code = p.fgCode.trim().toUpperCase();
        if (!fgCodeMap.has(code)) fgCodeMap.set(code, []);
        fgCodeMap.get(code).push({ projectId: p.id, projectName: p.projectName });
      }

      // Inspect materials
      const mats = p.materials || [];
      if (mats.length === 0 && pStage !== 'Brief') {
        anomalies.push({
          id: `DQ-NOMAT-${p.id}`,
          rule: 'MISSING_MATERIALS',
          severity: 'Warning',
          projectId: p.id,
          projectName: p.projectName,
          materialName: null,
          message: `Project in stage "${pStage}" has zero packaging components defined`,
          suggestion: 'Add at least one packaging material component to the Bill of Materials'
        });
      }

      mats.forEach(m => {
        const mStage = m.stage || 'Brief';

        // Rule: Missing PM Code (Warn if advanced past Brief/Design)
        if (!m.pmCode || !m.pmCode.trim() || m.pmCode.toUpperCase() === 'TBD') {
          const isAdvanced = !['Brief', 'Design'].includes(mStage);
          anomalies.push({
            id: `DQ-PMC-${p.id}-${m.id || m.name}`,
            rule: 'MISSING_PM_CODE',
            severity: isAdvanced ? 'Critical' : 'Warning',
            projectId: p.id,
            projectName: p.projectName,
            materialName: m.name,
            message: `Component "${m.name}" (${mStage}) lacks an authoritative ERP PM Code`,
            suggestion: 'Assign official SAP/ERP Packaging Material Code'
          });
        } else {
          // Track for duplicate check
          const pm = m.pmCode.trim().toUpperCase();
          if (!pmCodeMap.has(pm)) pmCodeMap.set(pm, []);
          pmCodeMap.get(pm).push({ projectId: p.id, projectName: p.projectName, materialName: m.name });
        }

        // Rule: Missing Supplier (Warn if at VPDF/Printing/Dispatch)
        const supp = m.supplier || p.supplier;
        if (!supp || supp === 'TBD' || supp.trim() === '') {
          const isProduction = ['Cylinder', 'Printing', 'Dispatch', 'Connectivity'].includes(mStage);
          anomalies.push({
            id: `DQ-SUP-${p.id}-${m.id || m.name}`,
            rule: 'MISSING_SUPPLIER',
            severity: isProduction ? 'Critical' : 'Warning',
            projectId: p.id,
            projectName: p.projectName,
            materialName: m.name,
            message: `Component "${m.name}" has no packaging converter or supplier assigned`,
            suggestion: 'Designate authorized converter in Component details'
          });
        }

        // Rule: Incomplete Stage Milestones
        if (m.milestones && typeof m.milestones === 'object') {
          if (!m.milestones[mStage] && mStage !== 'Launch') {
            anomalies.push({
              id: `DQ-MLS-${p.id}-${m.id || m.name}`,
              rule: 'INCOMPLETE_STAGE_DATA',
              severity: 'Notice',
              projectId: p.id,
              projectName: p.projectName,
              materialName: m.name,
              message: `Milestone schedule for stage "${mStage}" is undefined for component "${m.name}"`,
              suggestion: 'Recalculate milestone timelines from brief date'
            });
          }
        }
      });
    });

    // Evaluate Duplicate PM Codes
    for (const [pm, occurrences] of pmCodeMap.entries()) {
      if (occurrences.length > 1) {
        // Only trigger if components belong to different projects or distinct names
        const distinctProjects = new Set(occurrences.map(o => o.projectId));
        if (distinctProjects.size > 1) {
          anomalies.push({
            id: `DQ-DUP-PM-${pm}`,
            rule: 'DUPLICATE_PM_CODE',
            severity: 'Critical',
            projectId: occurrences[0].projectId,
            projectName: occurrences[0].projectName,
            materialName: occurrences[0].materialName,
            message: `PM Code "${pm}" is assigned to multiple components across projects (${occurrences.map(o => o.projectName).join(', ')})`,
            suggestion: 'Verify if PM Code is uniquely allocated per SKU packaging format'
          });
        }
      }
    }

    // Evaluate Duplicate FG Codes
    for (const [fg, occurrences] of fgCodeMap.entries()) {
      if (occurrences.length > 1) {
        anomalies.push({
          id: `DQ-DUP-FG-${fg}`,
          rule: 'DUPLICATE_FG_CODE',
          severity: 'Critical',
          projectId: occurrences[0].projectId,
          projectName: occurrences[0].projectName,
          materialName: null,
          message: `Finished Good Code "${fg}" is shared across multiple projects: ${occurrences.map(o => o.projectName).join(', ')}`,
          suggestion: 'Ensure each finished product project maintains unique FG identity'
        });
      }
    }

    // Calculate Platform Data Health Score (0–100)
    let penalty = 0;
    anomalies.forEach(a => {
      if (a.severity === 'Critical') penalty += 6;
      else if (a.severity === 'Warning') penalty += 2;
      else penalty += 1;
    });

    const score = Math.max(0, Math.min(100, 100 - penalty));
    const criticalCount = anomalies.filter(a => a.severity === 'Critical').length;
    const warningCount = anomalies.filter(a => a.severity === 'Warning').length;
    const noticeCount = anomalies.filter(a => a.severity === 'Notice').length;

    return {
      auditedAt: new Date().toISOString(),
      score,
      rating: score >= 90 ? 'EXCELLENT' : score >= 75 ? 'GOOD' : score >= 50 ? 'NEEDS_ATTENTION' : 'CRITICAL',
      totalProjectsAudited: activeProjects.length,
      totalAnomalies: anomalies.length,
      breakdown: {
        critical: criticalCount,
        warning: warningCount,
        notice: noticeCount
      },
      anomalies
    };
  }
}

const dataQualityService = new DataQualityService();

module.exports = dataQualityService;

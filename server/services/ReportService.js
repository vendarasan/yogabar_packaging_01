'use strict';
/**
 * ReportService.js — Authoritative Enterprise Reporting & Analytics Engine for Pass 8.
 *
 * Implements:
 *  1. Project Review Report (Executive Briefing & Audit Summary)
 *  2. Management Reporting (Aggregated KPIs, classified by Current/Historical/Calculated/User-entered)
 *  3. Supplier Performance (Fact-based measurements of lead times, delays, and on-time rates)
 *  4. Stage Analytics (Real historical cycle times, transitions, bottlenecks, or fallback message)
 */

const store = require('../store');
const { loadProject, loadAllProjects } = require('./PersistenceService');
const { AppError } = require('../middleware/errorHandler');
const { determineCPMIndex, getProjectStage, getDaysLeft, getLTStatus, STAGE_ORDER } = require('../utils');
const { getMaterialLeadTime } = require('../constants');

class ReportService {
  /**
   * 1. Generate comprehensive Project Review Report.
   * @param {string} projectId
   * @param {object|null} user
   * @returns {Promise<object>}
   */
  async getProjectReviewReport(projectId, user = null) {
    const project = await loadProject(projectId);
    if (!project) throw AppError.notFound(`Project "${projectId}" not found`);

    const mats = project.materials || [];
    const cpmIdx = determineCPMIndex(mats);
    const projStage = getProjectStage(project);
    const daysLeft = getDaysLeft(project);
    const ltStatus = getLTStatus(project);

    // Filter tasks for this project
    const projectTasks = (store.tasks || []).filter(t => String(t.projectId) === String(project.id));
    const openTasks = projectTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    // Filter approvals for this project
    const projectApprovals = (store.approvals || []).filter(a => String(a.projectId) === String(project.id));

    // Summary of materials
    const materialsSummary = mats.map((m, idx) => {
      const isCpm = idx === cpmIdx;
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        pmCode: m.pmCode || 'TBD',
        artworkCode: m.artworkCode || 'TBD',
        supplier: m.supplier || project.supplier || 'TBD',
        stage: m.stage || 'Brief',
        leadTimeDays: getMaterialLeadTime(m.type) || 15,
        isCriticalPath: isCpm,
        poStatus: m.poStatus || 'Pending',
        poNumber: m.poNumber || null,
        artworkStatus: m.artworkApproved ? 'Approved' : (m.artworkStatus || 'Pending'),
        specStatus: m.specSignoff?.signed ? 'Signed Off' : (m.specSheet?.governance?.status || 'Draft'),
        specSummary: m.specSheet ? {
          dimensions: m.specSheet.dimensions || {},
          structure: m.specSheet.technicalDetails?.materialStructure || '',
          targetGsm: m.specSheet.technicalDetails?.targetGsm || ''
        } : null
      };
    });

    return {
      reportType: 'EXECUTIVE_PROJECT_REVIEW',
      generatedAt: new Date().toISOString(),
      generatedBy: user ? { name: user.name, email: user.email, role: user.role } : { name: 'System Auditor' },
      project: {
        id: project.id,
        projectName: project.projectName,
        fgCode: project.fgCode || 'TBD',
        skuSize: project.skuSize || project.grammage || '',
        projectCategory: project.projectCategory || 'NPD',
        projectType: project.projectType || 'Regular',
        stage: projStage,
        status: project.status || 'On Track',
        risk: project.risk || 'Low',
        supplier: project.supplier || 'TBD',
        factory: project.factory || 'TBD',
        description: project.description || '',
        briefDate: project.briefDate,
        targetLaunchDate: project.targetLaunchDate,
        actualLaunchDate: project.launchDate || null,
        daysLeft,
        ltStatus,
        milestones: project.milestones || {},
        crunchPlan: project.crunchPlan ? {
          isCrunched: project.crunchPlan.isCrunched,
          riskLevel: project.crunchPlan.riskLevel,
          savedDays: project.crunchPlan.savedDays,
          status: project.crunchPlan.status
        } : null
      },
      ownership: project.ownership || {
        projectOwner: '',
        packagingOwner: '',
        artworkOwner: '',
        procurementOwner: '',
        qaOwner: ''
      },
      materials: materialsSummary,
      criticalPath: {
        materialIndex: cpmIdx,
        materialName: cpmIdx >= 0 && mats[cpmIdx] ? mats[cpmIdx].name : 'N/A',
        leadTimeDays: cpmIdx >= 0 && mats[cpmIdx] ? getMaterialLeadTime(mats[cpmIdx].type) : 0,
        bottleneckStage: projStage
      },
      risks: Array.isArray(project.risks) ? project.risks : [],
      tasks: {
        total: projectTasks.length,
        open: openTasks.length,
        items: openTasks.slice(0, 15)
      },
      approvals: projectApprovals.slice(0, 10),
      recentActivity: (project.auditTrail || []).slice(0, 15)
    };
  }

  /**
   * 2. Generate Management Aggregated Report.
   * Categorizes metrics strictly by: Current, Historical, Calculated, User-entered.
   */
  async getManagementReport() {
    const projects = await loadAllProjects();
    const activeProjects = projects.filter(p => !p.isDeleted);
    const nonLaunched = activeProjects.filter(p => p.status !== 'Launched');
    const launched = activeProjects.filter(p => p.status === 'Launched');

    // Status breakdown (Calculated)
    const byStatus = {
      'On Track': 0,
      'At Risk': 0,
      'Delayed': 0,
      'Launched': 0
    };
    activeProjects.forEach(p => {
      const s = p.status || 'On Track';
      if (byStatus[s] !== undefined) byStatus[s]++;
    });

    // Stage breakdown (Calculated)
    const byStage = {};
    STAGE_ORDER.forEach(s => { byStage[s] = 0; });
    nonLaunched.forEach(p => {
      const st = getProjectStage(p);
      byStage[st] = (byStage[st] || 0) + 1;
    });

    // Upcoming launches in 30, 60, 90 days (Calculated)
    const todayMs = Date.now();
    const upcomingLaunches = {
      next30Days: [],
      next60Days: [],
      next90Days: []
    };

    activeProjects.forEach(p => {
      if (p.status === 'Launched') return;
      const tld = p.targetLaunchDate;
      if (!tld) return;
      const diffDays = Math.round((new Date(tld).getTime() - todayMs) / 86400000);
      const item = { id: p.id, projectName: p.projectName, targetLaunchDate: tld, daysLeft: diffDays, stage: getProjectStage(p) };
      if (diffDays >= 0 && diffDays <= 30) upcomingLaunches.next30Days.push(item);
      if (diffDays > 30 && diffDays <= 60) upcomingLaunches.next60Days.push(item);
      if (diffDays > 60 && diffDays <= 90) upcomingLaunches.next90Days.push(item);
    });

    // Delayed Projects (Calculated)
    const delayedProjects = nonLaunched.filter(p => {
      const dl = getDaysLeft(p);
      return p.status === 'Delayed' || (dl !== null && dl < 0);
    }).map(p => ({
      id: p.id,
      projectName: p.projectName,
      stage: getProjectStage(p),
      targetLaunchDate: p.targetLaunchDate,
      daysLate: Math.abs(getDaysLeft(p) || 0),
      supplier: p.supplier
    }));

    // Open Risks Breakdown (Calculated)
    const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    activeProjects.forEach(p => {
      if (Array.isArray(p.risks)) {
        p.risks.forEach(r => {
          if (r.status !== 'Closed' && r.status !== 'Mitigated') {
            const sev = r.severity || 'Medium';
            if (riskCounts[sev] !== undefined) riskCounts[sev]++;
          }
        });
      }
    });

    return {
      reportType: 'MANAGEMENT_EXECUTIVE_SUMMARY',
      generatedAt: new Date().toISOString(),
      metricCategories: {
        current: {
          totalTrackedProjects: activeProjects.length,
          activeDevelopmentProjects: nonLaunched.length,
          launchedCommercialProjects: launched.length
        },
        calculated: {
          statusDistribution: byStatus,
          stageDistribution: byStage,
          delayedProjectsCount: delayedProjects.length,
          delayedProjectsList: delayedProjects.slice(0, 10),
          upcomingLaunchesCount: {
            next30Days: upcomingLaunches.next30Days.length,
            next60Days: upcomingLaunches.next60Days.length,
            next90Days: upcomingLaunches.next90Days.length
          },
          upcomingLaunchesDetails: upcomingLaunches,
          openRisksBySeverity: riskCounts
        },
        historical: {
          totalRecordedLogs: (store.advanceLogs || []).length,
          completedLaunchesCount: launched.length
        },
        userEntered: {
          briefDatesCount: activeProjects.filter(p => Boolean(p.briefDate)).length,
          targetDatesCount: activeProjects.filter(p => Boolean(p.targetLaunchDate)).length,
          designatedSuppliersCount: activeProjects.filter(p => p.supplier && p.supplier !== 'TBD').length
        }
      }
    };
  }

  /**
   * 3. Generate Supplier Performance Report.
   * Fact-based metrics from existing data: projects, materials, lead time, delays, on-time %.
   */
  async getSupplierPerformanceReport() {
    const projects = await loadAllProjects();
    const activeProjects = projects.filter(p => !p.isDeleted);
    const supplierMap = {};

    activeProjects.forEach(p => {
      const mats = p.materials || [];
      mats.forEach(m => {
        const supp = m.supplier || p.supplier;
        if (!supp || supp === 'TBD') return;

        if (!supplierMap[supp]) {
          supplierMap[supp] = {
            supplierName: supp,
            projectIds: new Set(),
            materialsCount: 0,
            totalLeadTimeDays: 0,
            delayedCount: 0,
            onTimeCount: 0
          };
        }

        const record = supplierMap[supp];
        record.projectIds.add(p.id);
        record.materialsCount++;

        const lt = getMaterialLeadTime(m.type) || 15;
        record.totalLeadTimeDays += lt;

        // Determine if delayed
        const dl = getDaysLeft(p);
        if (p.status === 'Delayed' || (dl !== null && dl < 0)) {
          record.delayedCount++;
        } else {
          record.onTimeCount++;
        }
      });
    });

    const suppliersList = Object.values(supplierMap).map(s => {
      const totalMats = s.materialsCount;
      const avgLeadTime = totalMats > 0 ? Math.round(s.totalLeadTimeDays / totalMats) : 0;
      const onTimeRate = totalMats > 0 ? Math.round((s.onTimeCount / totalMats) * 100) : 100;
      const delayRate = totalMats > 0 ? Math.round((s.delayedCount / totalMats) * 100) : 0;

      return {
        supplierName: s.supplierName,
        activeProjectsCount: s.projectIds.size,
        materialsCount: totalMats,
        averageLeadTimeDays: avgLeadTime,
        delayedMaterialsCount: s.delayedCount,
        onTimePerformanceRate: onTimeRate,
        delayRatePercentage: delayRate
      };
    });

    // Sort by materials volume
    suppliersList.sort((a, b) => b.materialsCount - a.materialsCount);

    return {
      reportType: 'SUPPLIER_PERFORMANCE_FACT_SHEET',
      generatedAt: new Date().toISOString(),
      totalTrackedSuppliers: suppliersList.length,
      methodologyNote: 'Measurements are factual calculations based strictly on current project assignments, component lead times, and milestone schedules. No arbitrary rankings or qualitative scores are applied.',
      suppliers: suppliersList
    };
  }

  /**
   * 4. Generate Stage Analytics Report.
   * Calculates real stage duration, transitions, and bottlenecks from advanceLogs.
   */
  async getStageAnalyticsReport() {
    const logs = store.advanceLogs || [];
    const stageData = {};

    STAGE_ORDER.forEach(s => {
      stageData[s] = {
        stage: s,
        transitionCount: 0,
        durations: [],
        delaysCount: 0
      };
    });

    // Inspect logs for stage changes
    logs.forEach(log => {
      const fromStage = log.from || log.metadata?.fromStage;
      const toStage = log.to || log.metadata?.toStage;
      if (fromStage && stageData[fromStage]) {
        stageData[fromStage].transitionCount++;
      }
    });

    // Inspect materials stageHistory
    const projects = await loadAllProjects();
    projects.forEach(p => {
      (p.materials || []).forEach(m => {
        if (Array.isArray(m.stageHistory) && m.stageHistory.length >= 2) {
          for (let i = 0; i < m.stageHistory.length - 1; i++) {
            const current = m.stageHistory[i];
            const next = m.stageHistory[i + 1];
            if (current.completedDate && next.completedDate) {
              const d1 = new Date(current.completedDate);
              const d2 = new Date(next.completedDate);
              const days = Math.round((d2 - d1) / 86400000);
              if (days >= 0 && stageData[current.stage]) {
                stageData[current.stage].durations.push(days);
                if (current.variance && current.variance > 0) {
                  stageData[current.stage].delaysCount++;
                }
              }
            }
          }
        }
      });
    });

    const resultStages = STAGE_ORDER.map(s => {
      const item = stageData[s];
      const count = item.durations.length;
      if (count === 0) {
        return {
          stage: s,
          hasHistoricalData: false,
          transitionCount: item.transitionCount,
          averageDurationDays: null,
          delayFrequencyRate: null,
          note: 'No historical data available'
        };
      }

      const sum = item.durations.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / count);
      const delayRate = Math.round((item.delaysCount / count) * 100);

      return {
        stage: s,
        hasHistoricalData: true,
        transitionCount: item.transitionCount || count,
        dataPointsCount: count,
        averageDurationDays: avg,
        delayFrequencyRate: delayRate,
        isBottleneck: avg > 14 || delayRate > 30
      };
    });

    return {
      reportType: 'STAGE_CYCLE_TIME_ANALYTICS',
      generatedAt: new Date().toISOString(),
      stages: resultStages
    };
  }
}

const reportService = new ReportService();

module.exports = reportService;

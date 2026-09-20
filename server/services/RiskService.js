'use strict';
/**
 * RiskService.js — Structured Risk Register Integration.
 *
 * Connects risks directly to:
 *  - Project
 *  - Material
 *  - Stage
 *  - Owner
 *  - Mitigation Action
 *
 * High/Critical open risks automatically escalate to Needs Attention and trigger notifications.
 */

const store = require('../store');
const { isDbAvailable } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const { logActivity } = require('./AuditService');
const { saveProject, loadProject } = require('./PersistenceService');
const NotificationService = require('./NotificationService');
const eventBus = require('./EventBus');
const logger = require('../utils/logger');

function generateRiskId() {
  return `RSK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

const RiskService = {
  /**
   * Add a structured risk to a project.
   */
  async addRisk(projectId, {
    title,
    description = '',
    category = 'Supply Chain',
    severity = 'Medium', // Critical, High, Medium, Low
    probability = 'Medium', // High, Medium, Low
    stage = null,
    materialId = null,
    owner = null,
    action = ''
  }, user) {
    if (!projectId || !title) {
      throw AppError.validation('Missing required risk fields: projectId, title');
    }

    const project = await loadProject(projectId);
    if (!project) {
      throw AppError.notFound(`Project "${projectId}" not found`);
    }

    const now = new Date().toISOString();
    const risk = {
      id: generateRiskId(),
      projectId,
      title: title.trim(),
      description: description.trim(),
      category,
      severity: ['Critical', 'High', 'Medium', 'Low'].includes(severity) ? severity : 'Medium',
      probability: ['High', 'Medium', 'Low'].includes(probability) ? probability : 'Medium',
      status: 'Open', // Open, Mitigating, Resolved, Closed
      stage: stage || project.stage || 'Brief',
      materialId: materialId || null,
      owner: owner || project?.ownership?.packagingOwner || 'Packaging Team',
      action: action.trim(),
      createdBy: user?.name || user?.email || 'User',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null
    };

    project.risks = Array.isArray(project.risks) ? project.risks : [];
    project.risks.unshift(risk);

    // Update project overall risk if critical/high
    if (risk.severity === 'Critical') {
      project.risk = 'High';
    } else if (risk.severity === 'High' && project.risk !== 'High') {
      project.risk = 'Medium';
    }

    logActivity(project, {
      action: 'RISK_LOGGED',
      title: `Risk Logged: ${risk.title}`,
      details: `${risk.severity} severity risk logged by ${user?.name || 'User'} (Stage: ${risk.stage}, Owner: ${risk.owner}, Action: ${risk.action || 'None'})`,
      materialName: materialId
    }, user);

    await saveProject(project, 'update');
    eventBus.publish('RiskCreated', { project, risk }, user);

    // Notify risk owner if email provided
    if (owner && owner.includes('@')) {
      await NotificationService.createNotification({
        recipientEmail: owner,
        category: 'Risk',
        title: `Assigned Risk: ${risk.title}`,
        message: `You are designated owner for risk "${risk.title}" (${risk.severity} severity) on project "${project.projectName}". Action: ${risk.action || 'Assess mitigation plan'}.`,
        projectId,
        materialId,
        entityType: 'RISK',
        entityId: risk.id,
        priority: risk.severity === 'Critical' ? 'Urgent' : 'High'
      });
    }

    return risk;
  },

  /**
   * Update an existing risk.
   */
  async updateRisk(projectId, riskId, updates, user) {
    const project = await loadProject(projectId);
    if (!project) throw AppError.notFound(`Project "${projectId}" not found`);

    project.risks = Array.isArray(project.risks) ? project.risks : [];
    const risk = project.risks.find(r => r.id === riskId);
    if (!risk) throw AppError.notFound(`Risk "${riskId}" not found on project "${projectId}"`);

    const prevStatus = risk.status;
    const now = new Date().toISOString();

    if (updates.title !== undefined) risk.title = updates.title;
    if (updates.description !== undefined) risk.description = updates.description;
    if (updates.category !== undefined) risk.category = updates.category;
    if (updates.severity !== undefined) risk.severity = updates.severity;
    if (updates.probability !== undefined) risk.probability = updates.probability;
    if (updates.stage !== undefined) risk.stage = updates.stage;
    if (updates.materialId !== undefined) risk.materialId = updates.materialId;
    if (updates.owner !== undefined) risk.owner = updates.owner;
    if (updates.action !== undefined) risk.action = updates.action;
    if (updates.status !== undefined) {
      risk.status = updates.status;
      if (['Resolved', 'Closed'].includes(updates.status)) {
        risk.resolvedAt = now;
      }
    }
    risk.updatedAt = now;

    // Recalculate project risk
    const openCritical = project.risks.some(r => ['Open', 'Mitigating'].includes(r.status) && r.severity === 'Critical');
    const openHigh = project.risks.some(r => ['Open', 'Mitigating'].includes(r.status) && r.severity === 'High');
    if (openCritical) {
      project.risk = 'High';
    } else if (openHigh) {
      project.risk = 'Medium';
    } else {
      project.risk = 'Low';
    }

    let activityAction = 'RISK_UPDATED';
    if (['Resolved', 'Closed'].includes(risk.status) && !['Resolved', 'Closed'].includes(prevStatus)) {
      activityAction = 'RISK_RESOLVED';
    }

    logActivity(project, {
      action: activityAction,
      title: `Risk ${risk.status}: ${risk.title}`,
      details: `Risk "${risk.title}" updated to status "${risk.status}" by ${user?.name || 'User'}`,
      materialName: risk.materialId
    }, user);

    await saveProject(project, 'update');
    return risk;
  },

  /**
   * Get all risks for a project.
   */
  async getProjectRisks(projectId) {
    const project = await loadProject(projectId);
    if (!project) return [];
    return Array.isArray(project.risks) ? project.risks : [];
  },

  /**
   * Delete a risk from a project.
   */
  async deleteRisk(projectId, riskId, user) {
    const project = await loadProject(projectId);
    if (!project) throw AppError.notFound(`Project "${projectId}" not found`);

    project.risks = Array.isArray(project.risks) ? project.risks : [];
    const idx = project.risks.findIndex(r => r.id === riskId);
    if (idx === -1) throw AppError.notFound(`Risk "${riskId}" not found on project "${projectId}"`);

    const [removed] = project.risks.splice(idx, 1);

    // Recalculate project risk
    const openCritical = project.risks.some(r => ['Open', 'Mitigating'].includes(r.status) && r.severity === 'Critical');
    const openHigh = project.risks.some(r => ['Open', 'Mitigating'].includes(r.status) && r.severity === 'High');
    if (openCritical) {
      project.risk = 'High';
    } else if (openHigh) {
      project.risk = 'Medium';
    } else {
      project.risk = 'Low';
    }

    logActivity(project, {
      action: 'RISK_DELETED',
      title: `Risk Deleted: ${removed.title}`,
      details: `Risk "${removed.title}" (${removed.severity}) deleted by ${user?.name || 'User'}`,
      materialName: removed.materialId
    }, user);

    await saveProject(project, 'update');
    return { success: true, deletedRiskId: riskId };
  },

  /**
   * Get all open risks across the enterprise.
   */
  async getAllRisks({ status, severity } = {}) {
    const all = [];
    for (const p of (store.projects || [])) {
      if (p.isDeleted) continue;
      if (Array.isArray(p.risks)) {
        for (const r of p.risks) {
          all.push({
            ...r,
            projectName: p.projectName,
            targetLaunchDate: p.targetLaunchDate
          });
        }
      }
    }

    let filtered = all;
    if (status) filtered = filtered.filter(r => r.status === status);
    if (severity) filtered = filtered.filter(r => r.severity === severity);
    return filtered;
  }
};

module.exports = RiskService;

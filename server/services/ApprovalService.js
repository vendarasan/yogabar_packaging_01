'use strict';
/**
 * ApprovalService.js — Universal Approval Framework.
 *
 * Applicable to:
 *  - Artwork
 *  - Specifications
 *  - KLD
 *  - VPDF
 *  - Documents / Stages
 *
 * Implements immutable decision history, auto-cascades to project/material state,
 * and notifies relevant parties.
 */

const store = require('../store');
const { ApprovalsRepo, ProjectsRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const { logActivity } = require('./AuditService');
const { saveProject, loadProject } = require('./PersistenceService');
const NotificationService = require('./NotificationService');
const eventBus = require('./EventBus');
const logger = require('../utils/logger');

function generateApprovalId() {
  return `APP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

const ApprovalService = {
  /**
   * Request a new approval.
   */
  async createApproval({
    entityType,
    entityId,
    projectId,
    materialId = null,
    title,
    reviewer = null,
    reviewerRole = null,
    comments = null,
    metadata = {}
  }, user) {
    if (!entityType || !entityId || !projectId || !title) {
      throw AppError.validation('Missing required approval fields: entityType, entityId, projectId, title');
    }

    const requestedBy = user ? (user.email || user.name) : 'system';
    const now = new Date().toISOString();

    const approval = {
      id: generateApprovalId(),
      entityType: entityType.toUpperCase(),
      entityId,
      projectId,
      materialId: materialId || null,
      title,
      status: 'PENDING',
      requestedBy,
      requestedAt: now,
      reviewer: reviewer || null,
      reviewerRole: reviewerRole || null,
      decision: null,
      decisionDate: null,
      comments: comments || null,
      history: [
        {
          action: 'REQUESTED',
          requestedBy,
          date: now,
          comments: comments || 'Approval requested'
        }
      ],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now
    };

    // 1. In-memory store
    store.approvals = store.approvals || [];
    store.approvals.unshift(approval);
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    // 2. PostgreSQL persistence
    if (isDbAvailable()) {
      try {
        await ApprovalsRepo.create(approval);
      } catch (err) {
        logger.warn('ApprovalService', 'Failed inserting approval into DB:', err.message);
      }
    }

    // 3. Activity log on project
    const project = await loadProject(projectId);
    if (project) {
      logActivity(project, {
        action: 'APPROVAL_REQUESTED',
        title: `Approval Requested: ${title}`,
        details: `${entityType} approval requested for ${entityId} by ${user.name || requestedBy}`,
        materialName: materialId || entityId
      }, user);
      await saveProject(project, 'update');
    }

    // 4. Notify reviewer if designated, or packaging/project owner
    const recipient = reviewer || project?.ownership?.packagingOwner || project?.ownership?.projectOwner;
    if (recipient) {
      await NotificationService.createNotification({
        recipientEmail: recipient,
        category: 'Approval',
        title: `Approval Pending: ${title}`,
        message: `${user.name || requestedBy} requested approval for ${entityType} (${entityId}) in project "${project?.projectName || projectId}".`,
        projectId,
        materialId,
        entityType,
        entityId: approval.id,
        priority: 'High'
      });
    }

    return approval;
  },

  /**
   * Decide on an approval (Approve / Reject).
   * Appends to history, never overwrites previous decisions.
   */
  async decide(id, { decision, comments = '' }, user) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw AppError.validation('Decision must be either APPROVED or REJECTED');
    }

    let approval = null;
    if (isDbAvailable()) {
      try {
        approval = await ApprovalsRepo.getById(id);
      } catch (err) {
        logger.warn('ApprovalService', 'DB fetch approval failed, falling back to store:', err.message);
      }
    }

    if (!approval) {
      approval = (store.approvals || []).find(a => a.id === id);
    }

    if (!approval) {
      throw AppError.notFound(`Approval request "${id}" not found`);
    }

    const previousStatus = approval.status;
    const now = new Date().toISOString();
    const reviewerName = user.name || user.email || 'reviewer';
    const reviewerRole = user.role || 'reviewer';

    approval.status = decision;
    approval.reviewer = reviewerName;
    approval.reviewerRole = reviewerRole;
    approval.decision = decision;
    approval.decisionDate = now;
    approval.comments = comments;
    approval.updatedAt = now;

    approval.history = Array.isArray(approval.history) ? approval.history : [];
    approval.history.push({
      action: 'DECISION',
      decision,
      reviewer: reviewerName,
      reviewerRole,
      date: now,
      comments,
      previousStatus
    });

    // Update in store
    const memIdx = (store.approvals || []).findIndex(a => a.id === id);
    if (memIdx !== -1) {
      store.approvals[memIdx] = approval;
    } else {
      store.approvals = store.approvals || [];
      store.approvals.unshift(approval);
    }
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    // Update in DB
    if (isDbAvailable()) {
      try {
        await ApprovalsRepo.update(id, approval);
      } catch (err) {
        logger.warn('ApprovalService', 'DB update approval failed:', err.message);
      }
    }

    // Cascade state to Project / Material
    const project = await loadProject(approval.projectId);
    if (project) {
      if (approval.materialId) {
        const mat = (project.materials || []).find(m => String(m.id) === String(approval.materialId) || m.name === approval.materialId);
        if (mat) {
          if (approval.entityType === 'ARTWORK') {
            mat.artworkApproved = (decision === 'APPROVED');
            mat.artworkStatus = decision === 'APPROVED' ? 'Approved' : 'Rejected';
            mat.artworkApproval = {
              status: decision,
              reviewer: reviewerName,
              date: now,
              comments
            };
          } else if (approval.entityType === 'SPECIFICATION') {
            if (decision === 'APPROVED') {
              mat.specSignoff = {
                signed: true,
                signedBy: reviewerName,
                date: now,
                notes: comments || 'Signed off via universal approval workflow'
              };
            } else {
              mat.specSignoff = null;
            }
          }
        }
      }

      logActivity(project, {
        action: 'APPROVAL_COMPLETED',
        title: `Approval ${decision}: ${approval.title}`,
        details: `${approval.entityType} ${approval.entityId} was ${decision} by ${reviewerName} (${reviewerRole})${comments ? ` — Comments: ${comments}` : ''}`,
        materialName: approval.materialId || approval.entityId
      }, user);

      await saveProject(project, 'update');

      if (decision === 'APPROVED') {
        if (approval.entityType === 'ARTWORK') {
          eventBus.publish('ArtworkApproved', { project, approval }, user);
        } else if (approval.entityType === 'SPECIFICATION') {
          eventBus.publish('SpecificationApproved', { project, approval }, user);
        }
      }
    }

    // Notify requester
    if (approval.requestedBy && approval.requestedBy.includes('@')) {
      await NotificationService.createNotification({
        recipientEmail: approval.requestedBy,
        category: 'Approval',
        title: `Approval ${decision}: ${approval.title}`,
        message: `Your approval request for ${approval.entityType} (${approval.entityId}) was ${decision} by ${reviewerName}.`,
        projectId: approval.projectId,
        materialId: approval.materialId,
        entityType: approval.entityType,
        entityId: approval.id,
        priority: decision === 'APPROVED' ? 'Normal' : 'High'
      });
    }

    return approval;
  },

  /**
   * Cancel / Withdraw an approval request.
   */
  async cancelApproval(id, user) {
    let approval = await this.getApprovalById(id);
    if (!approval) throw AppError.notFound(`Approval request "${id}" not found`);
    if (['APPROVED', 'REJECTED'].includes(approval.status)) {
      throw AppError.validation(`Cannot cancel approval with status "${approval.status}"`);
    }

    const isRequester = approval.requestedBy === (user?.email || user?.name);
    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    if (!isRequester && !isAdmin) {
      throw AppError.forbidden('Only the requester or an administrator can cancel this approval request');
    }

    const now = new Date().toISOString();
    approval.status = 'CANCELLED';
    approval.updatedAt = now;
    approval.history = Array.isArray(approval.history) ? approval.history : [];
    approval.history.push({
      action: 'CANCELLED',
      date: now,
      user: user?.name || user?.email || 'User'
    });

    const memIdx = (store.approvals || []).findIndex(a => a.id === id);
    if (memIdx !== -1) {
      store.approvals[memIdx] = approval;
    }
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    if (isDbAvailable()) {
      try {
        await ApprovalsRepo.update(id, approval);
      } catch (err) {
        logger.warn('ApprovalService', 'DB update approval failed:', err.message);
      }
    }

    if (approval.projectId) {
      const project = await loadProject(approval.projectId);
      if (project) {
        logActivity(project, {
          action: 'APPROVAL_CANCELLED',
          title: `Approval Cancelled: ${approval.title}`,
          details: `Approval request for ${approval.entityType} (${approval.entityId}) was cancelled by ${user?.name || 'User'}`,
          materialName: approval.materialId || approval.entityId
        }, user);
        await saveProject(project, 'update');
      }
    }

    return approval;
  },

  /**
   * Get approvals with filters.
   */
  async getApprovals({ projectId, status, entityType } = {}) {
    if (isDbAvailable()) {
      try {
        return await ApprovalsRepo.getAll({ projectId, status, entityType });
      } catch (err) {
        logger.warn('ApprovalService', 'DB get approvals failed, using store:', err.message);
      }
    }

    let items = store.approvals || [];
    if (projectId) items = items.filter(a => String(a.projectId) === String(projectId));
    if (status) items = items.filter(a => a.status === status);
    if (entityType) items = items.filter(a => a.entityType === entityType.toUpperCase());
    return items;
  },

  /**
   * Get single approval by ID.
   */
  async getApprovalById(id) {
    if (isDbAvailable()) {
      try {
        const item = await ApprovalsRepo.getById(id);
        if (item) return item;
      } catch (err) {
        logger.warn('ApprovalService', 'DB getById failed:', err.message);
      }
    }
    return (store.approvals || []).find(a => a.id === id) || null;
  }
};

module.exports = ApprovalService;

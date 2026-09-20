'use strict';
/**
 * CommentService.js — Contextual Collaboration & Mentions.
 *
 * Scoped threads for:
 *  - Project
 *  - Material
 *  - Artwork
 *  - Specification
 *  - Risk
 *  - Task
 *
 * Parses `@User` mentions and dispatches notifications.
 */

const store = require('../store');
const { CommentsRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const { logActivity } = require('./AuditService');
const { saveProject, loadProject } = require('./PersistenceService');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');

function generateCommentId() {
  return `CMT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

function parseMentions(text) {
  if (!text) return [];
  // Match @username or @user@domain.com
  const regex = /@([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)?)/g;
  const mentions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}

const CommentService = {
  /**
   * Add a comment to a contextual thread.
   */
  async addComment({
    contextType,
    contextId,
    projectId = null,
    content
  }, user) {
    if (!contextType || !contextId || !content || !content.trim()) {
      throw AppError.validation('Missing required comment fields: contextType, contextId, content');
    }

    const validContexts = ['PROJECT', 'MATERIAL', 'ARTWORK', 'SPECIFICATION', 'RISK', 'TASK'];
    if (!validContexts.includes(contextType.toUpperCase())) {
      throw AppError.validation(`Invalid contextType. Allowed: ${validContexts.join(', ')}`);
    }

    const mentions = parseMentions(content);
    const now = new Date().toISOString();
    const userEmail = user?.email || user?.name || 'anonymous';
    const userName = user?.name || user?.email || 'Anonymous User';

    const comment = {
      id: generateCommentId(),
      contextType: contextType.toUpperCase(),
      contextId: String(contextId),
      projectId: projectId || null,
      userEmail,
      userName,
      content: content.trim(),
      mentions,
      createdAt: now,
      updatedAt: now
    };

    // 1. In-memory store
    store.comments = store.comments || [];
    store.comments.push(comment);
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    // 2. PostgreSQL persistence
    if (isDbAvailable()) {
      try {
        await CommentsRepo.create(comment);
      } catch (err) {
        logger.warn('CommentService', 'Failed inserting comment into DB:', err.message);
      }
    }

    // 3. Project activity log if projectId provided
    if (projectId) {
      const project = await loadProject(projectId);
      if (project) {
        logActivity(project, {
          action: 'COMMENT_ADDED',
          title: `Comment Added on ${contextType}`,
          details: `${userName} commented on ${contextType} (${contextId}): "${content.length > 60 ? content.slice(0, 57) + '...' : content}"`,
          materialName: contextType === 'MATERIAL' ? contextId : null
        }, user);
        await saveProject(project, 'update');
      }
    }

    // 4. Notify mentioned users
    for (const mention of mentions) {
      // Check if mention matches an email or username in store.users
      let targetEmail = mention;
      if (!mention.includes('@')) {
        const found = Object.entries(store.users || {}).find(([email, u]) =>
          (u.name && u.name.toLowerCase().replace(/\s+/g, '') === mention.toLowerCase()) ||
          email.split('@')[0].toLowerCase() === mention.toLowerCase()
        );
        if (found) targetEmail = found[0];
      }

      if (targetEmail.includes('@') && targetEmail !== userEmail) {
        await NotificationService.createNotification({
          recipientEmail: targetEmail,
          category: 'System',
          title: `Mentioned in ${contextType} comment`,
          message: `${userName} mentioned you in a comment on ${contextType} (${contextId}): "${content.slice(0, 80)}"`,
          projectId,
          entityType: contextType,
          entityId: contextId,
          priority: 'Normal'
        });
      }
    }

    return comment;
  },

  /**
   * Get comments for a context thread.
   */
  async getComments({ contextType, contextId, projectId } = {}) {
    if (isDbAvailable()) {
      try {
        return await CommentsRepo.getAll({ contextType, contextId, projectId });
      } catch (err) {
        logger.warn('CommentService', 'DB fetch comments failed, using store:', err.message);
      }
    }

    let items = store.comments || [];
    if (contextType && contextId) {
      items = items.filter(c => c.contextType === contextType.toUpperCase() && String(c.contextId) === String(contextId));
    } else if (projectId) {
      items = items.filter(c => String(c.projectId) === String(projectId));
    }
    return items;
  },

  /**
   * Delete comment (owner or admin only).
   */
  async deleteComment(id, user) {
    let comment = null;
    if (isDbAvailable()) {
      try {
        comment = await CommentsRepo.getById(id);
      } catch (err) {
        logger.warn('CommentService', 'DB fetch comment failed:', err.message);
      }
    }
    if (!comment) {
      comment = (store.comments || []).find(c => c.id === id);
    }
    if (!comment) throw AppError.notFound('Comment not found');

    const isAdmin = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = comment.userEmail === (user?.email || user?.name);
    if (!isAdmin && !isOwner) {
      throw AppError.forbidden('Not authorized to delete this comment');
    }

    if (isDbAvailable()) {
      try {
        await CommentsRepo.delete(id);
      } catch (err) {
        logger.warn('CommentService', 'DB delete comment failed:', err.message);
      }
    }

    const idx = (store.comments || []).findIndex(c => c.id === id);
    if (idx !== -1) {
      store.comments.splice(idx, 1);
      if (typeof store.saveLocalStore === 'function') store.saveLocalStore();
    }
    return true;
  }
};

module.exports = CommentService;

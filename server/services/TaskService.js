'use strict';
/**
 * TaskService.js — Structured Task & Action Item Model.
 *
 * Connects action items directly to Projects, Materials, and Stages with:
 *  - Assignees & Roles
 *  - Due Dates
 *  - Priorities: Critical, High, Medium, Low
 *  - Status: PENDING, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
 *  - Escalation handling for overdue/blocked items
 */

const store = require('../store');
const { TasksRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const { logActivity } = require('./AuditService');
const { saveProject, loadProject } = require('./PersistenceService');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');

function generateTaskId() {
  return `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

const TaskService = {
  /**
   * Create a new task.
   */
  async createTask({
    projectId,
    materialId = null,
    title,
    description = '',
    stage = null,
    assignedTo = null,
    assignedRole = null,
    dueDate = null,
    priority = 'Medium',
    metadata = {}
  }, user) {
    if (!projectId || !title) {
      throw AppError.validation('Missing required task fields: projectId, title');
    }

    const createdBy = user ? (user.email || user.name) : 'system';
    const now = new Date().toISOString();

    const task = {
      id: generateTaskId(),
      projectId,
      materialId: materialId || null,
      title,
      description: description || '',
      stage: stage || null,
      assignedTo: assignedTo || null,
      assignedRole: assignedRole || null,
      dueDate: dueDate || null,
      status: 'PENDING',
      priority: ['Critical', 'High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      createdBy,
      completedAt: null,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now
    };

    // 1. In-memory store
    store.tasks = store.tasks || [];
    store.tasks.unshift(task);
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    // 2. PostgreSQL persistence
    if (isDbAvailable()) {
      try {
        await TasksRepo.create(task);
      } catch (err) {
        logger.warn('TaskService', 'Failed inserting task into DB:', err.message);
      }
    }

    // 3. Project activity log
    const project = await loadProject(projectId);
    if (project) {
      logActivity(project, {
        action: 'TASK_ASSIGNED',
        title: `Task Created: ${title}`,
        details: `Task "${title}" created and assigned to ${assignedTo || 'unassigned'} (Due: ${dueDate || 'No due date'}, Priority: ${priority})`,
        materialName: materialId
      }, user);
      await saveProject(project, 'update');
    }

    // 4. Notification to assignee
    if (assignedTo && assignedTo.includes('@')) {
      await NotificationService.createNotification({
        recipientEmail: assignedTo,
        category: 'Task',
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned task "${title}" in project "${project?.projectName || projectId}". Due: ${dueDate || 'Not set'}. Priority: ${priority}.`,
        projectId,
        materialId,
        entityType: 'TASK',
        entityId: task.id,
        priority: priority === 'Critical' ? 'Urgent' : (priority === 'High' ? 'High' : 'Normal')
      });
    }

    return task;
  },

  /**
   * Update task status, assignee, priority, or due date.
   */
  async updateTask(id, updates, user) {
    let task = null;
    if (isDbAvailable()) {
      try {
        task = await TasksRepo.getById(id);
      } catch (err) {
        logger.warn('TaskService', 'DB fetch task failed, using store:', err.message);
      }
    }

    if (!task) {
      task = (store.tasks || []).find(t => t.id === id);
    }

    if (!task) {
      throw AppError.notFound(`Task "${id}" not found`);
    }

    const previousStatus = task.status;
    const now = new Date().toISOString();

    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.stage !== undefined) task.stage = updates.stage;
    if (updates.assignedTo !== undefined) task.assignedTo = updates.assignedTo;
    if (updates.assignedRole !== undefined) task.assignedRole = updates.assignedRole;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.priority !== undefined) {
      task.priority = ['Critical', 'High', 'Medium', 'Low'].includes(updates.priority) ? updates.priority : task.priority;
    }
    if (updates.status !== undefined) {
      task.status = updates.status;
      if (updates.status === 'COMPLETED') {
        task.completedAt = now;
      } else {
        task.completedAt = null;
      }
    }
    if (updates.metadata !== undefined) {
      task.metadata = { ...task.metadata, ...updates.metadata };
    }
    task.updatedAt = now;

    // Update in store
    const memIdx = (store.tasks || []).findIndex(t => t.id === id);
    if (memIdx !== -1) {
      store.tasks[memIdx] = task;
    } else {
      store.tasks = store.tasks || [];
      store.tasks.unshift(task);
    }
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();

    // Update in DB
    if (isDbAvailable()) {
      try {
        await TasksRepo.update(id, task);
      } catch (err) {
        logger.warn('TaskService', 'DB update task failed:', err.message);
      }
    }

    // Escalation & Activity log
    const project = await loadProject(task.projectId);
    if (project) {
      let action = 'TASK_UPDATED';
      if (task.status === 'COMPLETED' && previousStatus !== 'COMPLETED') action = 'TASK_COMPLETED';
      if (task.status === 'BLOCKED' && previousStatus !== 'BLOCKED') action = 'DEPENDENCY_BLOCKED';

      logActivity(project, {
        action,
        title: `Task ${task.status}: ${task.title}`,
        details: `Task status changed from ${previousStatus} to ${task.status} by ${user.name || user.email || 'user'}`,
        materialName: task.materialId
      }, user);

      await saveProject(project, 'update');
    }

    // If task became BLOCKED or escalated, alert project owner
    if (task.status === 'BLOCKED' || task.priority === 'Critical') {
      const ownerEmail = project?.ownership?.projectOwner || project?.ownership?.packagingOwner;
      if (ownerEmail && ownerEmail.includes('@')) {
        await NotificationService.createNotification({
          recipientEmail: ownerEmail,
          category: 'Task',
          title: `Task Blocked: ${task.title}`,
          message: `Task "${task.title}" in project "${project?.projectName || task.projectId}" was marked as BLOCKED. Immediate resolution required.`,
          projectId: task.projectId,
          materialId: task.materialId,
          entityType: 'TASK',
          entityId: task.id,
          priority: 'Urgent'
        });
      }
    }

    return task;
  },

  /**
   * Complete task helper.
   */
  async completeTask(id, user) {
    return this.updateTask(id, { status: 'COMPLETED' }, user);
  },

  /**
   * Delete task.
   */
  async deleteTask(id, user) {
    const task = await this.getTaskById(id);
    if (!task) return false;

    if (isDbAvailable()) {
      try {
        await TasksRepo.delete(id);
      } catch (err) {
        logger.warn('TaskService', 'DB delete task failed:', err.message);
      }
    }

    const idx = (store.tasks || []).findIndex(t => t.id === id);
    if (idx !== -1) {
      store.tasks.splice(idx, 1);
      if (typeof store.saveLocalStore === 'function') store.saveLocalStore();
    }

    if (task.projectId) {
      const project = await loadProject(task.projectId);
      if (project) {
        logActivity(project, {
          action: 'TASK_DELETED',
          title: `Task Removed: ${task.title}`,
          details: `Task "${task.title}" was removed by ${user?.name || user?.email || 'user'}`
        }, user);
        await saveProject(project, 'update');
      }
    }
    return true;
  },

  /**
   * Query tasks with filters.
   */
  async getTasks({ projectId, status, assignedTo, stage } = {}) {
    if (isDbAvailable()) {
      try {
        return await TasksRepo.getAll({ projectId, status, assignedTo, stage });
      } catch (err) {
        logger.warn('TaskService', 'DB get tasks failed, using store:', err.message);
      }
    }

    let items = store.tasks || [];
    if (projectId) items = items.filter(t => String(t.projectId) === String(projectId));
    if (status) items = items.filter(t => t.status === status);
    if (assignedTo) items = items.filter(t => t.assignedTo === assignedTo);
    if (stage) items = items.filter(t => t.stage === stage);
    return items;
  },

  /**
   * Get single task by ID.
   */
  async getTaskById(id) {
    if (isDbAvailable()) {
      try {
        const item = await TasksRepo.getById(id);
        if (item) return item;
      } catch (err) {
        logger.warn('TaskService', 'DB getById failed:', err.message);
      }
    }
    return (store.tasks || []).find(t => t.id === id) || null;
  }
};

module.exports = TaskService;

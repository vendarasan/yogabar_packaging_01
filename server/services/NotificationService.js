'use strict';
/**
 * NotificationService.js — Multi-category Notification Engine & User Preferences.
 *
 * Supports Categories:
 *  - Approval
 *  - Task
 *  - Stage
 *  - Risk
 *  - Launch
 *  - Supplier
 *  - System
 *
 * Implements dual-write with PostgreSQL and in-memory fallback.
 */

const store = require('../store');
const { NotificationsRepo, UserPreferencesRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const logger = require('../utils/logger');

function generateNotificationId() {
  return `NTF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

const NotificationService = {
  /**
   * Create and deliver a notification to a specific user.
   */
  async createNotification({
    recipientEmail,
    category = 'System',
    title,
    message,
    projectId = null,
    materialId = null,
    entityType = null,
    entityId = null,
    priority = 'Normal'
  }) {
    if (!recipientEmail || !title || !message) {
      return null;
    }

    // Check user preference
    const prefs = await this.getUserPreferences(recipientEmail);
    if (prefs && prefs.notificationCategories && prefs.notificationCategories[category] === false) {
      // User disabled this notification category
      return null;
    }

    const notif = {
      id: generateNotificationId(),
      recipientEmail,
      category,
      title,
      message,
      projectId,
      materialId,
      entityType,
      entityId,
      isRead: false,
      readAt: null,
      priority,
      createdAt: new Date().toISOString()
    };

    // 1. In-memory store
    store.notifications = store.notifications || [];
    store.notifications.unshift(notif);
    if (store.notifications.length > 1000) {
      store.notifications = store.notifications.slice(0, 1000);
    }
    if (typeof store.saveLocalStore === 'function') {
      store.saveLocalStore();
    }

    // 2. PostgreSQL persistence
    if (isDbAvailable()) {
      try {
        await NotificationsRepo.create(notif);
      } catch (err) {
        logger.warn('NotificationService', 'Failed inserting notification into DB:', err.message);
      }
    }

    return notif;
  },

  /**
   * Broadcast a notification to multiple recipients or roles.
   */
  async broadcastNotification(recipientEmails, payload) {
    if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) return [];
    const results = [];
    for (const email of recipientEmails) {
      const n = await this.createNotification({ ...payload, recipientEmail: email });
      if (n) results.push(n);
    }
    return results;
  },

  /**
   * Get notifications for a user.
   */
  async getUserNotifications(userEmail, { isRead, limit = 50 } = {}) {
    if (!userEmail) return [];

    if (isDbAvailable()) {
      try {
        return await NotificationsRepo.getAll({ recipientEmail: userEmail, isRead, limit });
      } catch (err) {
        logger.warn('NotificationService', 'DB fetch notifications failed, using store:', err.message);
      }
    }

    // Fallback in-memory
    let items = (store.notifications || []).filter(n => n.recipientEmail === userEmail);
    if (typeof isRead === 'boolean') {
      items = items.filter(n => n.isRead === isRead);
    }
    return items.slice(0, limit);
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id, userEmail) {
    if (isDbAvailable()) {
      try {
        const updated = await NotificationsRepo.markAsRead(id, userEmail);
        if (updated) {
          const mem = (store.notifications || []).find(n => n.id === id);
          if (mem) {
            mem.isRead = true;
            mem.readAt = new Date().toISOString();
          }
          return updated;
        }
      } catch (err) {
        logger.warn('NotificationService', 'DB markAsRead failed:', err.message);
      }
    }

    const n = (store.notifications || []).find(x => x.id === id && x.recipientEmail === userEmail);
    if (n) {
      n.isRead = true;
      n.readAt = new Date().toISOString();
      if (typeof store.saveLocalStore === 'function') store.saveLocalStore();
      return n;
    }
    return null;
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userEmail) {
    if (isDbAvailable()) {
      try {
        await NotificationsRepo.markAllAsRead(userEmail);
      } catch (err) {
        logger.warn('NotificationService', 'DB markAllAsRead failed:', err.message);
      }
    }

    (store.notifications || []).forEach(n => {
      if (n.recipientEmail === userEmail && !n.isRead) {
        n.isRead = true;
        n.readAt = new Date().toISOString();
      }
    });
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();
    return true;
  },

  /**
   * Get user preferences.
   */
  async getUserPreferences(userEmail) {
    if (!userEmail) return null;

    if (isDbAvailable()) {
      try {
        return await UserPreferencesRepo.get(userEmail);
      } catch (err) {
        logger.warn('NotificationService', 'DB get preferences failed:', err.message);
      }
    }

    store.userPreferences = store.userPreferences || {};
    if (!store.userPreferences[userEmail]) {
      store.userPreferences[userEmail] = {
        userEmail,
        inAppEnabled: true,
        emailSummaryEnabled: true,
        dailySummaryEnabled: false,
        notificationCategories: {
          Approval: true,
          Task: true,
          Stage: true,
          Risk: true,
          Launch: true,
          Supplier: true,
          System: true
        }
      };
    }
    return store.userPreferences[userEmail];
  },

  /**
   * Update user preferences.
   */
  async updateUserPreferences(userEmail, updates) {
    if (!userEmail) return null;

    if (isDbAvailable()) {
      try {
        const updated = await UserPreferencesRepo.upsert(userEmail, updates);
        store.userPreferences = store.userPreferences || {};
        store.userPreferences[userEmail] = updated;
        return updated;
      } catch (err) {
        logger.warn('NotificationService', 'DB upsert preferences failed:', err.message);
      }
    }

    store.userPreferences = store.userPreferences || {};
    const existing = await this.getUserPreferences(userEmail);
    const merged = {
      ...existing,
      ...updates,
      notificationCategories: {
        ...existing.notificationCategories,
        ...(updates.notificationCategories || {})
      },
      updatedAt: new Date().toISOString()
    };
    store.userPreferences[userEmail] = merged;
    if (typeof store.saveLocalStore === 'function') store.saveLocalStore();
    return merged;
  }
};

module.exports = NotificationService;

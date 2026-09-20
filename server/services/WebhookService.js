'use strict';
/**
 * WebhookService — Enterprise Outbound Webhook Delivery & Retry Engine for Pass 8.
 *
 * Implements:
 *  - HMAC-SHA256 signature verification (X-Signature-SHA256)
 *  - Exponential backoff retry mechanism (up to 3 attempts)
 *  - Delivery status logging (SUCCESS, FAILED, PENDING_RETRY)
 *  - Webhook failure threshold & circuit breaker (disables after 5 consecutive failures)
 *  - Manual delivery retry endpoint support
 */

const crypto = require('crypto');
const store = require('../store');
const { WebhooksRepo, WebhookDeliveriesRepo } = require('../db/repository');
const { isDbAvailable } = require('../db');
const eventBus = require('./EventBus');

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const MAX_FAILURES_BEFORE_DEGRADED = 5;

/**
 * Generate HMAC-SHA256 signature for outbound webhook payload.
 */
function generateSignature(payloadString, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify incoming webhook signature against secret.
 */
function verifySignature(payloadString, signature, secret) {
  if (!signature || !secret) return false;
  const expected = generateSignature(payloadString, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

class WebhookService {
  constructor() {
    // Automatically register EventBus wildcard listener
    eventBus.on('*', (eventData) => {
      this.dispatchToSubscribers(eventData).catch(err => {
        console.error('❌ [WebhookService] Event dispatch error:', err.message);
      });
    });
  }

  /**
   * Retrieve all registered webhooks.
   */
  async getWebhooks() {
    if (isDbAvailable()) {
      try {
        return await WebhooksRepo.getAll();
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error, falling back to memory store:', err.message);
      }
    }
    return store.webhooks || [];
  }

  /**
   * Retrieve single webhook by ID.
   */
  async getWebhookById(id) {
    if (isDbAvailable()) {
      try {
        const found = await WebhooksRepo.getById(id);
        if (found) return found;
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error fetching webhook:', err.message);
      }
    }
    return (store.webhooks || []).find(w => w.id === id) || null;
  }

  /**
   * Create a new webhook registration.
   */
  async createWebhook(data, user) {
    if (!data.name || !data.url) {
      const err = new Error('Webhook name and destination URL are required');
      err.status = 400;
      throw err;
    }

    try {
      new URL(data.url);
    } catch {
      const err = new Error('Invalid destination URL format');
      err.status = 400;
      throw err;
    }

    const secret = data.secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const id = `WHK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const newWebhook = {
      id,
      name: String(data.name).trim(),
      url: String(data.url).trim(),
      secret,
      events: Array.isArray(data.events) && data.events.length > 0 ? data.events : ['*'],
      isActive: data.isActive !== false,
      failureCount: 0,
      createdBy: user ? user.email : 'system',
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDbAvailable()) {
      try {
        const saved = await WebhooksRepo.create(newWebhook);
        store.webhooks = [saved, ...(store.webhooks || []).filter(x => x.id !== id)];
        store.saveLocalStore();
        return saved;
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error saving webhook, saving to local store:', err.message);
      }
    }

    store.webhooks = [newWebhook, ...(store.webhooks || []).filter(x => x.id !== id)];
    store.saveLocalStore();
    return newWebhook;
  }

  /**
   * Update existing webhook.
   */
  async updateWebhook(id, updates) {
    const webhook = await this.getWebhookById(id);
    if (!webhook) {
      const err = new Error('Webhook not found');
      err.status = 404;
      throw err;
    }

    if (updates.url) {
      try {
        new URL(updates.url);
      } catch {
        const err = new Error('Invalid destination URL format');
        err.status = 400;
        throw err;
      }
    }

    const payload = {
      name: updates.name !== undefined ? String(updates.name).trim() : webhook.name,
      url: updates.url !== undefined ? String(updates.url).trim() : webhook.url,
      secret: updates.secret !== undefined ? String(updates.secret).trim() : webhook.secret,
      events: updates.events !== undefined ? updates.events : webhook.events,
      isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : webhook.isActive,
      failureCount: updates.failureCount !== undefined ? Number(updates.failureCount) : webhook.failureCount,
      metadata: updates.metadata !== undefined ? updates.metadata : webhook.metadata
    };

    if (isDbAvailable()) {
      try {
        const updated = await WebhooksRepo.update(id, payload);
        if (updated) {
          store.webhooks = (store.webhooks || []).map(w => w.id === id ? updated : w);
          store.saveLocalStore();
          return updated;
        }
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error updating webhook:', err.message);
      }
    }

    const merged = { ...webhook, ...payload, updatedAt: new Date().toISOString() };
    store.webhooks = (store.webhooks || []).map(w => w.id === id ? merged : w);
    store.saveLocalStore();
    return merged;
  }

  /**
   * Delete a webhook registration.
   */
  async deleteWebhook(id) {
    if (isDbAvailable()) {
      try {
        await WebhooksRepo.delete(id);
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error deleting webhook:', err.message);
      }
    }

    store.webhooks = (store.webhooks || []).filter(w => w.id !== id);
    store.webhookDeliveries = (store.webhookDeliveries || []).filter(d => d.webhookId !== id);
    store.saveLocalStore();
    return true;
  }

  /**
   * Retrieve deliveries for a specific webhook.
   */
  async getDeliveries(webhookId, limit = 50) {
    if (isDbAvailable()) {
      try {
        return await WebhookDeliveriesRepo.getByWebhookId(webhookId, limit);
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error fetching deliveries:', err.message);
      }
    }
    return (store.webhookDeliveries || [])
      .filter(d => d.webhookId === webhookId)
      .slice(0, limit);
  }

  /**
   * Dispatch an EventBus event to matching active webhooks.
   */
  async dispatchToSubscribers(eventData) {
    const webhooks = await this.getWebhooks();
    const activeSubscribers = webhooks.filter(w => {
      if (!w.isActive) return false;
      if (Array.isArray(w.events) && (w.events.includes('*') || w.events.includes(eventData.eventType))) {
        return true;
      }
      return false;
    });

    for (const webhook of activeSubscribers) {
      this.executeDelivery(webhook, eventData, 1).catch(err => {
        console.warn(`⚠️ [WebhookService] Failed delivering ${eventData.eventType} to ${webhook.name}:`, err.message);
      });
    }
  }

  /**
   * Execute single delivery attempt with signature and latency tracking.
   */
  async executeDelivery(webhook, eventData, attempt = 1) {
    const deliveryId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const payloadStr = JSON.stringify(eventData);
    const signature = generateSignature(payloadStr, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'PackagingPlatform-Webhooks/1.0',
      'X-Event-Type': eventData.eventType,
      'X-Delivery-Id': deliveryId,
      'X-Signature-SHA256': signature,
      'X-Attempt': String(attempt),
      'X-Timestamp': eventData.timestamp
    };

    const deliveryRecord = {
      id: deliveryId,
      webhookId: webhook.id,
      eventType: eventData.eventType,
      payload: eventData,
      statusCode: null,
      attempt,
      status: 'PENDING_RETRY',
      error: null,
      requestHeaders: headers,
      responseBody: null,
      durationMs: 0,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const startTime = Date.now();
    let isSuccess = false;
    let statusCode = 0;
    let responseText = '';
    let errorMessage = null;

    try {
      // 5-second timeout controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadStr,
        signal: controller.signal
      });
      clearTimeout(timeout);

      statusCode = res.status;
      responseText = await res.text().catch(() => '');
      deliveryRecord.durationMs = Date.now() - startTime;
      deliveryRecord.statusCode = statusCode;
      deliveryRecord.responseBody = responseText ? responseText.slice(0, 2000) : null;

      if (res.ok) {
        isSuccess = true;
        deliveryRecord.status = 'SUCCESS';
        deliveryRecord.completedAt = new Date().toISOString();

        // Reset failure count on success
        if (webhook.failureCount > 0) {
          await this.updateWebhook(webhook.id, { failureCount: 0 });
        }
      } else {
        errorMessage = `HTTP ${statusCode}: ${responseText.slice(0, 100)}`;
        deliveryRecord.error = errorMessage;
      }
    } catch (netErr) {
      deliveryRecord.durationMs = Date.now() - startTime;
      errorMessage = netErr.name === 'AbortError' ? 'Delivery timed out after 5000ms' : netErr.message;
      deliveryRecord.error = errorMessage;
    }

    if (!isSuccess) {
      const newFailureCount = (webhook.failureCount || 0) + 1;
      const shouldDisable = newFailureCount >= MAX_FAILURES_BEFORE_DEGRADED;

      if (attempt < MAX_RETRIES) {
        deliveryRecord.status = 'PENDING_RETRY';
        // Exponential backoff
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        setTimeout(() => {
          this.executeDelivery(webhook, eventData, attempt + 1).catch(() => {});
        }, delayMs);
      } else {
        deliveryRecord.status = 'FAILED';
        deliveryRecord.completedAt = new Date().toISOString();
      }

      await this.updateWebhook(webhook.id, {
        failureCount: newFailureCount,
        isActive: shouldDisable ? false : webhook.isActive
      });
    }

    // Persist delivery record
    if (isDbAvailable()) {
      try {
        await WebhookDeliveriesRepo.create(deliveryRecord);
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error saving delivery log:', err.message);
      }
    }

    store.webhookDeliveries = [deliveryRecord, ...(store.webhookDeliveries || []).slice(0, 499)];
    store.saveLocalStore();

    return deliveryRecord;
  }

  /**
   * Manual delivery retry trigger for failed deliveries.
   */
  async retryDelivery(deliveryId) {
    let delivery = null;
    if (isDbAvailable()) {
      try {
        delivery = await WebhookDeliveriesRepo.getById(deliveryId);
      } catch (err) {
        console.warn('⚠️ [WebhookService] DB error fetching delivery for retry:', err.message);
      }
    }
    if (!delivery) {
      delivery = (store.webhookDeliveries || []).find(d => d.id === deliveryId);
    }
    if (!delivery) {
      const err = new Error('Delivery record not found');
      err.status = 404;
      throw err;
    }

    const webhook = await this.getWebhookById(delivery.webhookId);
    if (!webhook) {
      const err = new Error('Associated webhook configuration no longer exists');
      err.status = 404;
      throw err;
    }

    return await this.executeDelivery(webhook, delivery.payload, (delivery.attempt || 1) + 1);
  }

  /**
   * Ping / test event dispatch.
   */
  async testWebhook(webhookId) {
    const webhook = await this.getWebhookById(webhookId);
    if (!webhook) {
      const err = new Error('Webhook not found');
      err.status = 404;
      throw err;
    }

    const testEvent = {
      eventId: `TEST-${Date.now().toString(36).toUpperCase()}`,
      eventType: 'WebhookPing',
      timestamp: new Date().toISOString(),
      user: { email: 'system@yogabar.com', name: 'System Auditor' },
      payload: {
        message: 'Ping event testing connectivity between Packaging Platform and subscriber endpoint',
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    };

    return await this.executeDelivery(webhook, testEvent, 1);
  }
}

const webhookService = new WebhookService();

module.exports = {
  webhookService,
  generateSignature,
  verifySignature
};

'use strict';
/**
 * EventBus — Centralized Publish/Subscribe Domain Event Bus for Pass 8.
 *
 * Exposes canonical business events:
 *  - ProjectCreated
 *  - MaterialCreated
 *  - StageChanged
 *  - ArtworkApproved
 *  - SpecificationApproved
 *  - RiskCreated
 *  - LaunchDateChanged
 *  - ProjectLaunched
 */

const EventEmitter = require('events');

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Publish a business domain event.
   * @param {string} eventType - One of the canonical event types
   * @param {object} payload - Event data payload
   * @param {object|null} user - The actor triggering the event
   */
  publish(eventType, payload = {}, user = null) {
    const eventData = {
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      eventType,
      timestamp: new Date().toISOString(),
      user: user ? { email: user.email, name: user.name, role: user.role } : { email: 'system@yogabar.com', name: 'System' },
      payload
    };

    // Emit event asynchronously on next tick so main request flow is never blocked
    setImmediate(() => {
      try {
        this.emit(eventType, eventData);
        this.emit('*', eventData); // Wildcard listener for webhooks & integration dispatchers
      } catch (err) {
        console.error(`❌ [EventBus] Error handling event ${eventType}:`, err);
      }
    });

    return eventData;
  }
}

const eventBus = new DomainEventBus();

module.exports = eventBus;

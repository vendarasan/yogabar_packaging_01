'use strict';
/**
 * logger.js — Structured, leveled application logger.
 *
 * A thin wrapper over console that:
 *  - Adds log levels (debug, info, warn, error)
 *  - Formats output as: [LEVEL] [MODULE] message
 *  - Is controlled by LOG_LEVEL env var (default: 'info')
 *  - Is designed as a drop-in shim for winston/pino when the app scales
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('ProjectService', 'Project created', { id: 'PRJ-001' });
 *   logger.warn('PersistenceService', 'DB unavailable, using local store');
 *   logger.error('AuthMiddleware', 'Token verification failed', err);
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const configuredLevel = LEVELS[process.env.LOG_LEVEL] !== undefined
  ? LEVELS[process.env.LOG_LEVEL]
  : LEVELS.info;

function formatMessage(level, module, message, context) {
  const ts = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}] [${module}]`;
  if (context !== undefined) {
    return `${ts} ${prefix} ${message} ${typeof context === 'object' ? JSON.stringify(context) : context}`;
  }
  return `${ts} ${prefix} ${message}`;
}

function debug(module, message, context) {
  if (configuredLevel <= LEVELS.debug) {
    console.debug(formatMessage('debug', module, message, context));
  }
}

function info(module, message, context) {
  if (configuredLevel <= LEVELS.info) {
    console.info(formatMessage('info', module, message, context));
  }
}

function warn(module, message, context) {
  if (configuredLevel <= LEVELS.warn) {
    console.warn(formatMessage('warn', module, message, context));
  }
}

function error(module, message, context) {
  if (configuredLevel <= LEVELS.error) {
    console.error(formatMessage('error', module, message, context));
  }
}

module.exports = { debug, info, warn, error };

'use strict';
/**
 * errorHandler.js — Centralized error handling middleware & AppError class.
 *
 * Usage in routes/services:
 *   throw new AppError('Project not found', 404, 'NOT_FOUND');
 *   throw AppError.notFound('Project not found');
 *   throw AppError.forbidden('Admin role required');
 *   throw AppError.validation('briefDate is required');
 *
 * The Express errorHandler middleware must be registered LAST in index.js:
 *   app.use(errorHandler);
 */

const logger = require('../utils/logger');

/**
 * AppError — Structured error with HTTP status code and machine-readable code.
 * All services should throw AppError instead of calling res.status(...) directly.
 */
class AppError extends Error {
  /**
   * @param {string} message       - Human-readable error message
   * @param {number} statusCode    - HTTP status code (default: 500)
   * @param {string} code          - Machine-readable error code (default: 'INTERNAL_ERROR')
   * @param {object} [details]     - Optional additional context
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  // ── Factory helpers ───────────────────────────────────────────────

  /** 404 Not Found */
  static notFound(message = 'Resource not found', details = null) {
    return new AppError(message, 404, 'NOT_FOUND', details);
  }

  /** 400 Bad Request / Validation */
  static validation(message = 'Validation error', details = null) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  /** 403 Forbidden */
  static forbidden(message = 'Access denied', details = null) {
    return new AppError(message, 403, 'FORBIDDEN', details);
  }

  /** 401 Unauthorized */
  static unauthorized(message = 'Not authenticated', details = null) {
    return new AppError(message, 401, 'UNAUTHORIZED', details);
  }

  /** 409 Conflict */
  static conflict(message = 'Conflict', details = null) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  /** 500 Internal Server Error */
  static internal(message = 'Internal server error', details = null) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details);
  }
}

/**
 * Express error-handling middleware.
 * Must be the LAST middleware registered in index.js (after all routes).
 *
 * Handles:
 *  - AppError (structured, expected errors from services/routes)
 *  - Express body-parser errors (413 payload too large)
 *  - Unhandled errors (unexpected crashes)
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Payload too large
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Uploaded file/payload is too large (exceeds 50MB limit).',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  // Structured AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('errorHandler', `${err.code}: ${err.message}`, { stack: err.stack });
    } else {
      logger.warn('errorHandler', `${err.code} (${err.statusCode}): ${err.message}`);
    }
    const response = { error: err.message, code: err.code };
    if (err.details) response.details = err.details;
    return res.status(err.statusCode).json(response);
  }

  // Unhandled / unexpected error
  logger.error('errorHandler', 'Unhandled server error', {
    message: err && err.message,
    stack: err && err.stack
  });
  return res.status(err && err.status ? err.status : 500).json({
    error: (err && err.message) || 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, errorHandler, asyncHandler };

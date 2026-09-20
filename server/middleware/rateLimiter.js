'use strict';
/**
 * rateLimiter.js — Sliding window in-memory rate limiter for enterprise API security.
 *
 * Protects against brute-force attacks on authentication endpoints and
 * DoS/abusive traffic on general API routes without requiring external Redis.
 */

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * Create a rate limiter middleware instance.
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60,000)
 * @param {number} options.max - Maximum allowed requests per IP within the window
 * @param {string} [options.message] - Custom error message
 * @param {boolean} [options.skipInTest] - Skip throttling in test environment (default: false)
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests from this IP, please try again later.';
  const skipInTest = options.skipInTest !== undefined ? options.skipInTest : false;

  // Map of IP -> array of timestamps
  const hits = new Map();

  // Periodic cleanup every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, Math.max(windowMs * 2, 60000));

  if (cleanupInterval.unref) cleanupInterval.unref();

  const middleware = (req, res, next) => {
    // Check if test bypass is active and requested
    if (skipInTest && process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const ip = getClientIp(req);
    const now = Date.now();

    const userHits = (hits.get(ip) || []).filter(t => now - t < windowMs);

    if (userHits.length >= max) {
      const oldestHit = userHits[0];
      const resetTime = Math.ceil((oldestHit + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(resetTime, 1)));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');

      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: Math.max(resetTime, 1)
      });
    }

    userHits.push(now);
    hits.set(ip, userHits);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - userHits.length, 0)));

    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

// 1. Strict Auth Limiter: Max 15 attempts per minute per IP
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please try again in 1 minute.',
  skipInTest: true
});

// 2. General API Limiter: Max 600 requests per minute per IP
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'API rate limit exceeded. Please slow down your requests.',
  skipInTest: true
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  getClientIp
};

const rateLimit = require('express-rate-limit');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Creates a rate limiter middleware for authentication routes
 * Specifically targeted at preventing brute-force login attempts
 */
const loginLimiter = rateLimit({
  // Rate limiting options
  windowMs: config.security.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes by default
  max: config.security.rateLimit.maxAttempts || 5, // 5 login attempts per window by default

  // Return standardized error response
  handler: (req, res, next) => {
    next(new AppError('Too many login attempts. Please try again after 15 minutes.', 429));
  },

  // Should the client be informed about X-RateLimit headers?
  standardHeaders: true,

  // Add headers to the legacy rate limit header spec
  legacyHeaders: false,

  // Skip rate-limiting for requests that don't reach the backend
  skipFailedRequests: false,

  // IP customization options
  skipSuccessfulRequests: false, // Don't count successful logins

  // Message to display when rate limit is reached
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
});

/**
 * General API rate limiter to prevent abuse
 * Applied to all routes with less strict limits
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

module.exports = {
  loginLimiter,
  apiLimiter,
};

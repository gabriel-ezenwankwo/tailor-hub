/**
 * Secure logger utility
 * Provides standardized, secure logging with sanitized data
 */
const config = require('../config');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Sanitizes sensitive data from objects before logging
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized copy of the object
 */
const sanitizeData = obj => {
  if (!obj || typeof obj !== 'object') return obj;

  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(obj));

  // Fields to redact
  const sensitiveFields = [
    'password',
    'passwordConfirm',
    'token',
    'authorization',
    'cookie',
    'jwt',
    'secret',
    'apiKey',
    'key',
  ];

  // Recursive function to find and sanitize fields
  const redactSensitive = object => {
    if (!object || typeof object !== 'object') return;

    Object.keys(object).forEach(key => {
      // Check if current key is sensitive
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (typeof object[key] === 'string') {
          // Redact the value but keep the first and last character to help with debugging
          const value = object[key];
          object[key] =
            value.length > 2 ? `${value.charAt(0)}****${value.charAt(value.length - 1)}` : '****';
        } else {
          object[key] = '****';
        }
      } else if (typeof object[key] === 'object' && object[key] !== null) {
        // Recursively process nested objects
        redactSensitive(object[key]);
      }
    });
  };

  redactSensitive(sanitized);
  return sanitized;
};

/**
 * Create a formatted log message with consistent structure
 * @param {String} level - Log level
 * @param {String} message - Main log message
 * @param {Object} meta - Additional metadata to include
 * @returns {String} - Formatted log message
 */
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitizeData(meta);

  // Create base log object
  const logObject = {
    timestamp,
    level,
    message,
    ...sanitizedMeta,
  };

  // Return formatted string for console, or JSON for structured logging systems
  return config.server.env === 'development'
    ? `[${timestamp}][${level}] ${message} ${Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta, null, 2) : ''}`
    : JSON.stringify(logObject);
};

/**
 * Log an error with sanitized data
 * @param {String} message - Error message
 * @param {Error} err - Error object
 * @param {Object} req - Express request object (optional)
 */
const logError = (message, err, req = null) => {
  // Extract useful info from request if available
  const requestInfo = req
    ? {
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        requestId: req.id || 'no-id',
        // Extract userId if available, for security audit
        userId: req.user?._id?.toString() || 'unauthenticated',
      }
    : {};

  // Extract useful, non-sensitive error data
  const errorInfo = {
    errorType: err.name || 'Error',
    statusCode: err.statusCode,
    status: err.status,
    // Include error message but not stack trace in production
    message: err.message,
    ...(config.server.env === 'development' ? { stack: err.stack } : {}),
  };

  // Log to console with sanitized data
  console.error(
    formatLogMessage(LOG_LEVELS.ERROR, message, {
      ...requestInfo,
      error: errorInfo,
    })
  );
};

module.exports = {
  logError,
  sanitizeData,
  LOG_LEVELS,
};

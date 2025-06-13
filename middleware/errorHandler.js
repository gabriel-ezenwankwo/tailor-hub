const AppError = require('../utils/AppError');
const { logError } = require('../utils/logger');
const config = require('../config');

const handleJWTError = () => new AppError('Invalid token. Please log in again', 401);
const handleJWTExpiredError = () => new AppError('Token expired. Please log in again', 401);

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

// Development error response - detailed information
const sendErrorDev = (err, req, res) => {
  // Log all errors in development
  logError('Error in development mode', err, req);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

// Production error response - limited information
const sendErrorProd = (err, req, res) => {
  // For all authentication errors, log securely with additional context
  if (err.statusCode === 401 || err.statusCode === 403) {
    logError(`Authentication error: ${err.message}`, err, req);
  }
  // For 500 server errors, always log as they indicate potential issues
  else if (err.statusCode >= 500) {
    logError(`Server error: ${err.message}`, err, req);
  }
  // For 400 validation errors, only log in verbose mode (can be noisy)
  else if (config.logging.verbose && err.statusCode === 400) {
    logError(`Validation error`, err, req);
  }

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      status: err.status,
      message: err.message,
    };

    // For token errors, add a more specific code
    if (err.type) {
      response.code = err.type;
    }

    return res.status(err.statusCode).json(response);
  }

  // Programming or other unknown error: don't leak error details
  // Log unknown errors as they're likely bugs that need fixing
  logError('Unexpected error', err, req);

  // Send generic message
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

// Main error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);

    // Handle common database/authentication error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

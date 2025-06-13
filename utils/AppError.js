class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    if (statusCode === 401) {
      if (message.includes('expired')) {
        this.type = 'token_expired';
      } else if (message.includes('Invalid token')) {
        this.type = 'token_invalid';
      } else {
        this.type = 'authentication_failed';
      }
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

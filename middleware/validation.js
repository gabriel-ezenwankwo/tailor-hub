const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

exports.validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map(err => `${err.path}: ${err.msg}`)
      .join(', ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add a unique request ID to each request
 * This helps with correlating logs across a request lifecycle
 */
const requestId = (req, res, next) => {
  // Generate a unique ID for the request
  const id = uuidv4();
  req.id = id;

  // Add as a response header too
  res.setHeader('X-Request-ID', id);

  next();
};

module.exports = requestId;

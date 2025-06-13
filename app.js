/**
 * Main application setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { configureRoutes } = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const app = express();

// Create logs directory if it doesn't exist
if (!fs.existsSync(config.logging.directory)) {
  fs.mkdirSync(config.logging.directory, { recursive: true });
}

// Configure environment-specific logging
if (config.app.isProduction) {
  const accessLogStream = fs.createWriteStream(path.join(config.logging.directory, 'access.log'), {
    flags: 'a',
  });
  app.use(morgan(config.logging.format, { stream: accessLogStream }));
} else {
  app.use(morgan(config.logging.format));
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.security.corsOrigins,
  })
);

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Setup API documentation endpoint (placeholder for future Swagger/OpenAPI)
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    message: 'API documentation will be available here',
    // Will be replaced with actual documentation in the future
  });
});

// Configure all application routes
configureRoutes(app);

// Handle unhandled routes (404)
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

module.exports = app;

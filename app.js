const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');

require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const AppError = require('./utils/AppError');

const app = express();

// Create logs directory if it doesn't exist
if (!fs.existsSync(config.logging.directory)) {
  fs.mkdirSync(config.logging.directory, { recursive: true });
}

// Configure environment-specific logging
if (config.app.isProduction) {
  // Create a write stream for access logs
  const accessLogStream = fs.createWriteStream(
    path.join(config.logging.directory, 'access.log'),
    { flags: 'a' }
  );

  // Use combined format for production
  app.use(morgan(config.logging.format, { stream: accessLogStream }));
} else {
  app.use(morgan(config.logging.format));
}


// Existing middleware
app.use(helmet());
app.use(cors({
  origin: config.security.corsOrigins
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', require('./routes/health'));

// Handle unhandled routes (404)
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

module.exports = app;
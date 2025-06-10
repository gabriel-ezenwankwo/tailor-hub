const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure environment-specific logging
if (process.env.NODE_ENV === 'production') {
  // Create a write stream for access logs
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' } // 'a' flag for appending to the log file
  );
  
  // Use combined format for production
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  // Continue using dev format for development
  app.use(morgan('dev'));
}

// Existing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', require('./routes/health'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
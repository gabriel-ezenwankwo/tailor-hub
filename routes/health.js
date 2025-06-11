/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring application health and status.
 */

const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * @route   GET /
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TailorHub API is running',
    environment: config.app.environment,
    timestamp: new Date(),
    version: '1.0.0'
  });
});

/**
 * @route   GET /detailed
 * @desc    Detailed system status (could include more system info)
 * @access  Public
 */
router.get('/detailed', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TailorHub API is running',
    environment: config.app.environment,
    timestamp: new Date(),
    version: '1.0.0',
    system: {
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    }
  });
});

module.exports = router;
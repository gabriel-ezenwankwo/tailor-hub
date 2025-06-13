/**
 * API Routes Index
 *
 * Central hub for registering all API routes with versioning support.
 * All routes are organized under /api/v{n} where n is the API version.
 */

const express = require('express');

// Import route modules
const authRoutes = require('./authRoutes');
const healthRoutes = require('./health');

/**
 * Register all routes for a specific API version
 *
 * @param {string} version - API version (e.g., 'v1')
 * @returns {express.Router} Express router with all routes for this version
 */
const createVersionedRoutes = () => {
  const router = express.Router();

  // Register routes with the router
  // Using consistent patterns for all route types

  // Core system routes
  router.use('/health', healthRoutes);
  router.use('/auth', authRoutes);

  return router;
};

/**
 * Configure all application routes
 *
 * @param {express.Application} app - Express application instance
 */
const configureRoutes = app => {
  // API version 1 routes
  app.use('/api/v1', createVersionedRoutes('v1'));

  // For backward compatibility or testing, we can keep the health endpoint
  // at the root level as well
  app.use('/health', healthRoutes);

  console.log('Routes configured successfully');
};

module.exports = {
  configureRoutes,
};

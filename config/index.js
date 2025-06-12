/**
 * Application Configuration
 *
 * Centralizes all configuration settings and provides environment-specific values.
 * Loads variables from .env file and structures them for application use.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({
  path: path.join(__dirname, '../.env'),
});

// Environment detection
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const isDevelopment = environment === 'development';
const isTest = environment === 'test';

/**
 * Base configuration object with defaults and environment overrides
 */
const config = {
  // Application settings
  app: {
    name: 'TailorHub',
    environment,
    isProduction,
    isDevelopment,
    isTest,
  },

  // Server settings
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  },

  // Database settings
  database: {
    // MongoDB connection string - Default to localhost if no MONGO_URI provided
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/tailorhub',

    // Connection options
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: process.env.MONGO_POOL_SIZE ? parseInt(process.env.MONGO_POOL_SIZE) : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },

    // Debug mode (enabled in development)
    debug: process.env.NODE_ENV === 'development',

    // Atlas configuration (if using MongoDB Atlas)
    atlas: {
      enabled: process.env.MONGO_USE_ATLAS === 'true',
      username: process.env.MONGO_ATLAS_USERNAME,
      password: process.env.MONGO_ATLAS_PASSWORD,
      cluster: process.env.MONGO_ATLAS_CLUSTER,
      database: process.env.MONGO_ATLAS_DATABASE || 'tailorhub',
    },
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'tailorhub-dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7,
  },

  // Logging configuration
  logging: {
    level: isProduction ? 'info' : 'debug',
    format: isProduction ? 'combined' : 'dev',
    directory: path.join(__dirname, '../logs'),
  },

  // Email configuration (placeholder for future implementation)
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    fromEmail: process.env.EMAIL_FROM || 'noreply@tailorhub.com',
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'],
    rateLimit: {
      // Rate limiting window in milliseconds (15 minutes)
      windowMs: process.env.RATE_LIMIT_WINDOW_MS
        ? parseInt(process.env.RATE_LIMIT_WINDOW_MS)
        : 15 * 60 * 1000,

      // Maximum number of attempts within window
      maxAttempts: process.env.RATE_LIMIT_MAX_ATTEMPTS
        ? parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS)
        : 5,
    },
  },
};

// Build MongoDB Atlas connection string if enabled
if (
  config.database.atlas.enabled &&
  config.database.atlas.username &&
  config.database.atlas.password &&
  config.database.atlas.cluster
) {
  const { username, password, cluster, database } = config.database.atlas;

  config.database.uri = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
}

/**
 * Environment-specific overrides
 */
if (isProduction) {
  // Production-specific settings
  if (!process.env.JWT_SECRET) {
    console.error('WARNING: JWT_SECRET is not set in production environment');
  }

  if (config.jwt.secret === 'tailorhub-dev-secret-key-change-in-production') {
    console.error('WARNING: Using default JWT secret in production environment');
  }
} else if (isDevelopment) {
  // Development-specific settings
  // Nothing special needed here as defaults are development-friendly
} else if (isTest) {
  // Test-specific settings
  config.database.url = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/tailorhub_test';
}

// Configuration validation
const requiredInProduction = ['DATABASE_URL'];
if (isProduction) {
  requiredInProduction.forEach(key => {
    if (!process.env[key]) {
      console.error(`WARNING: ${key} is not set in production environment`);
    }
  });
}

module.exports = config;

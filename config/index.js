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
  path: path.join(__dirname, '../.env')
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
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/tailorhub',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: isProduction ? true : false,
      autoIndex: !isProduction,
    }
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
    corsOrigins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:3000'],
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    },
  },
};

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
const request = require('supertest');
const express = require('express');
const { loginLimiter } = require('../../middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();

    // Mock error handler to capture rate limit errors
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        message: err.message,
      });
    });
  });

  it('should allow requests within the rate limit', async () => {
    // Create a test route with rate limiting
    app.post('/test-login', loginLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    // Send a request that should be under the limit
    const response = await request(app).post('/test-login');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });

  it('should block requests that exceed the rate limit', async () => {
    // Create a rate limiter with a very low limit for testing
    const testLimiter = require('express-rate-limit')({
      windowMs: 15 * 60 * 1000,
      max: 1, // Only allow 1 request
      handler: (req, res) => {
        res.status(429).json({
          status: 'error',
          message: 'Too many requests',
        });
      },
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Create a test route with our test limiter
    app.post('/test-login', testLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    // First request should succeed
    const response1 = await request(app).post('/test-login');
    expect(response1.status).toBe(200);

    // Second request should be rate limited
    const response2 = await request(app).post('/test-login');
    expect(response2.status).toBe(429);
    expect(response2.body.status).toBe('error');
    expect(response2.body.message).toBe('Too many requests');
  });
});

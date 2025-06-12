const jwt = require('jsonwebtoken');

// Mocking jwt.sign
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockImplementation((token, secret, callback) => {
    if (token === 'valid-token' || process.env.NODE_ENV === 'test') {
      callback(null, { id: 'user-id', iat: Math.floor(Date.now() / 1000) });
    } else {
      callback(new Error('Invalid token'), null);
    }
  }),
}));

module.exports = jwt;

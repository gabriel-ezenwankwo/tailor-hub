const jwt = require('jsonwebtoken');

// Mocking jwt.sign
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockImplementation((token, secret, callback) => {
    if (token === 'valid-token') {
      callback(null, { id: 'user-id' });
    } else {
      callback(new Error('Invalid token'));
    }
  }),
}));

module.exports = jwt;

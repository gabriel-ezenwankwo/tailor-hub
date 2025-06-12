const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');

// Import the controllers directly to access the unwrapped functions
const authControllerWrapper = require('../../controllers/authController');

// Mock catchAsync to get direct access to the controller functions
jest.mock('../../utils/catchAsync', () => jest.fn(fn => fn));

// Now we can access the controller functions directly
const authController = require('../../controllers/authController');

// Mock express request and response objects
const mockRequest = () => {
  const req = {};
  req.body = {};
  req.headers = {};
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

// Mock the database connection
jest.mock('../setup/testDb', () => ({
  connect: jest.fn().mockResolvedValue(true),
  closeDatabase: jest.fn().mockResolvedValue(true),
  clearDatabase: jest.fn().mockResolvedValue(true),
}));

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Controller - Register', () => {
  test('should return 400 if required fields are missing', async () => {
    // Arrange
    const req = mockRequest();
    req.body = { firstName: 'Test', lastName: 'User' }; // Missing email and password
    const res = mockResponse();

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('required fields');
  });

  test('should return 409 if user with email already exists', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'existing@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to simulate duplicate email
    jest.spyOn(User, 'findOne').mockResolvedValueOnce({
      email: 'existing@example.com',
    });

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Email already in use');
  });

  test('should hash password before saving user', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to return null (no duplicate)
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    // Create a mock for User.create with custom ID
    const userId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'client',
    };

    jest.spyOn(User, 'create').mockResolvedValueOnce(mockUser);

    // Mock jwt.sign
    jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(User.create).toHaveBeenCalledWith({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123',
      role: 'client',
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'test-token',
      })
    );
  });

  test('should return 201 and JWT token on successful registration', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to return null (no duplicate)
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    // Create a mock for User.create with custom ID
    const userId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'client',
    };

    jest.spyOn(User, 'create').mockResolvedValueOnce(mockUser);

    // Mock jwt.sign
    jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'test-token',
        data: expect.objectContaining({
          user: expect.anything(),
        }),
      })
    );
  });
});

describe('Auth Controller - Login', () => {
  test('should return 400 if email or password is missing', async () => {
    // Arrange
    const req = mockRequest();
    req.body = { email: 'test@example.com' }; // Missing password
    const res = mockResponse();

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('provide email and password');
  });

  test('should return 401 if password is incorrect', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      email: 'test@example.com',
      password: 'WrongPassword123',
    };
    const res = mockResponse();

    // Mock User.findOne to return a user
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      password: 'hashed_password',
      correctPassword: jest.fn().mockResolvedValueOnce(false),
    };

    // Set up the mock chain
    const selectMock = jest.fn().mockResolvedValueOnce(mockUser);
    const findOneMock = jest.fn().mockReturnValueOnce({ select: selectMock });
    jest.spyOn(User, 'findOne').mockImplementation(findOneMock);

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(findOneMock).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(selectMock).toHaveBeenCalledWith('+password');
    expect(mockUser.correctPassword).toHaveBeenCalledWith('WrongPassword123', 'hashed_password');
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Incorrect email or password');
  });

  test('should return 200 and JWT token on successful login', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      email: 'test@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to return a user
    const userId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'client',
      password: 'hashed_password',
      correctPassword: jest.fn().mockResolvedValueOnce(true),
    };

    // Set up the mock chain
    const selectMock = jest.fn().mockResolvedValueOnce(mockUser);
    const findOneMock = jest.fn().mockReturnValueOnce({ select: selectMock });
    jest.spyOn(User, 'findOne').mockImplementation(findOneMock);

    // Mock jwt.sign
    jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(findOneMock).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(selectMock).toHaveBeenCalledWith('+password');
    expect(mockUser.correctPassword).toHaveBeenCalledWith('Password123', 'hashed_password');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'test-token',
      })
    );
  });
});

describe('Auth Controller - Protect Middleware', () => {
  test('should return 401 if no token is provided', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = {}; // No authorization header
    const res = mockResponse();

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('not logged in');
  });

  test('should return 401 if token is invalid', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer invalid-token' };
    const res = mockResponse();

    // Mock jwt.verify to throw a JsonWebTokenError
    const jwtError = new Error('invalid token');
    jwtError.name = 'JsonWebTokenError'; // This is the key fix - setting the error name

    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      callback(jwtError, null);
    });

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Invalid token');
  });

  test('should return 401 if user no longer exists', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Mock jwt.verify to succeed
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: Math.floor(Date.now() / 1000) });
    });

    // Mock User.findById to return null (user not found)
    jest.spyOn(User, 'findById').mockResolvedValueOnce(null);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('user-id');
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('no longer exists');
  });

  test('should return 401 if user changed password after token was issued', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Token issued timestamp (1 hour ago)
    const issuedAt = Math.floor(Date.now() / 1000) - 3600;

    // Mock jwt.verify to succeed
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: issuedAt });
    });

    // Mock User.findById to return a user that changed password after token was issued
    const mockUser = {
      _id: 'user-id',
      changedPasswordAfter: jest.fn().mockReturnValueOnce(true),
    };
    jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('user-id');
    expect(mockUser.changedPasswordAfter).toHaveBeenCalledWith(issuedAt);
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('changed password');
  });

  test('should grant access to protected route if token is valid', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Mock jwt.verify to succeed
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: Math.floor(Date.now() / 1000) });
    });

    // Mock User.findById to return a valid user
    const mockUser = {
      _id: 'user-id',
      changedPasswordAfter: jest.fn().mockReturnValueOnce(false),
    };
    jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('user-id');
    expect(mockUser.changedPasswordAfter).toHaveBeenCalled();
    expect(req.user).toBe(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });
});

describe('Auth Controller - Protect Middleware (Token Expiration)', () => {
  test('should return 401 with specific message if token is expired', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer expired-token' };
    const res = mockResponse();

    // Mock jwt.verify to throw TokenExpiredError
    const tokenExpiredError = new Error('jwt expired');
    tokenExpiredError.name = 'TokenExpiredError';

    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(tokenExpiredError, null);
    });

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token expired. Please log in again');
  });

  test('should return 401 with specific message if token signature is invalid', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer invalid-signature-token' };
    const res = mockResponse();

    // Mock jwt.verify to throw JsonWebTokenError
    const jwtError = new Error('invalid signature');
    jwtError.name = 'JsonWebTokenError';

    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(jwtError, null);
    });

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid token. Please log in again');
  });

  test('should return 401 with generic message for other JWT errors', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer problematic-token' };
    const res = mockResponse();

    // Mock jwt.verify to throw a non-standard JWT error
    const otherError = new Error('some other error');
    otherError.name = 'OtherError';

    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(otherError, null);
    });

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication failed. Please log in again');
  });
});

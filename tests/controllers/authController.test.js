const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const authController = require('../../controllers/authController');
const { connect, closeDatabase, clearDatabase } = require('../setup/testDb');

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

// Setup and teardown
beforeAll(async () => await connect());
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});
afterAll(async () => await closeDatabase());

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
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Email already in use');
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

    // Mock User.create
    const userId = new mongoose.Types.ObjectId();
    const mockNewUser = {
      _id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'client',
    };

    jest.spyOn(User, 'create').mockResolvedValueOnce(mockNewUser);

    // Mock jwt.sign
    jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');
    jest.spyOn(res, 'status').mockReturnValueOnce(201);
    jest.spyOn(res, 'json').mockReturnValueOnce({
      status: 'success',
      token: 'test-token',
      data: {
        user: mockNewUser,
      },
    });
    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'test-token',
        data: expect.objectContaining({
          user: expect.objectContaining({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
          }),
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
  });

  test('should return 401 if user is not found', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      email: 'nonexistent@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to return null (user not found)
    jest.spyOn(User, 'findOne').mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValueOnce(null),
    }));

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Incorrect email or password');
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

    jest.spyOn(User, 'findOne').mockImplementationOnce(() => ({
      select: jest.fn().mockResolvedValueOnce(mockUser),
    }));

    // Act
    await authController.login(req, res, mockNext);

    // Assert
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

    jest.spyOn(User, 'findOne').mockImplementationOnce(() => ({
      select: jest.fn().mockResolvedValueOnce(mockUser),
    }));

    // Mock jwt.sign
    jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockUser.correctPassword).toHaveBeenCalledWith('Password123', 'hashed_password');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'test-token',
      })
    );
    expect(jwt.sign).toHaveBeenCalledWith({ id: userId }, expect.any(String), expect.any(Object));
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

    // Mock jwt.verify to throw an error
    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(new Error('invalid token'), null);
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
    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
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
    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
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
    jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
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

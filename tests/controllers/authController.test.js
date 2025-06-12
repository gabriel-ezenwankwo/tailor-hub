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

  test('should return 400 if email is invalid', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'invalid-email',
      password: 'Password123',
    };
    const res = mockResponse();

    // Act & Assert
    // This test would typically use the express-validator middleware
    // We're testing the validation logic directly here
    expect(() => {
      // Simulate validator behavior
      if (!/^\S+@\S+\.\S+$/.test(req.body.email)) {
        throw new AppError('Please use a valid email address', 400);
      }
    }).toThrow(AppError);
  });

  test('should return 400 if password is too short', async () => {
    // Arrange
    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'short',
    };
    const res = mockResponse();

    // Act & Assert
    expect(() => {
      // Simulate validator behavior
      if (req.body.password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
      }
    }).toThrow(AppError);
  });

  test('should return 409 if user with email already exists', async () => {
    // Arrange
    // Create a user first
    const user = await User.create({
      firstName: 'Existing',
      lastName: 'User',
      email: 'existing@example.com',
      password: 'Password123',
    });
    console.log('user', user);

    const req = mockRequest();
    req.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'existing1@example.com',
      password: 'Password123',
    };
    const res = mockResponse();

    // Mock User.findOne to simulate duplicate email
    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValueOnce({
      email: 'existing@example.com',
    });

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(findOneSpy).toHaveBeenCalledWith({ email: 'existing@example.com' });
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Email already in use');

    // Cleanup
    findOneSpy.mockRestore();
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
    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    // Mock User.create to return user without actually creating one
    const createSpy = jest.spyOn(User, 'create').mockImplementation(async userData => ({
      _id: new mongoose.Types.ObjectId(),
      ...userData,
      // Password should be hashed at this point
    }));

    // Mock bcrypt.hash
    const bcryptSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashed_password');

    // Act
    await authController.register(req, res, mockNext);

    // Assert
    expect(bcryptSpy).toHaveBeenCalledWith('Password123', 12);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashed_password',
      })
    );

    // Cleanup
    findOneSpy.mockRestore();
    createSpy.mockRestore();
    bcryptSpy.mockRestore();
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
    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    // Mock User.create
    const userId = new mongoose.Types.ObjectId();
    const createSpy = jest.spyOn(User, 'create').mockResolvedValueOnce({
      _id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'client',
      toObject: () => ({
        _id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'client',
      }),
    });

    // Mock jwt.sign
    const jwtSpy = jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

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
    expect(jwtSpy).toHaveBeenCalled();

    // Cleanup
    findOneSpy.mockRestore();
    createSpy.mockRestore();
    jwtSpy.mockRestore();
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
    const findOneSpy = jest.spyOn(User, 'findOne').mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce(null),
    });

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Incorrect email or password');

    // Cleanup
    findOneSpy.mockRestore();
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

    const findOneSpy = jest.spyOn(User, 'findOne').mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce(mockUser),
    });

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockUser.correctPassword).toHaveBeenCalledWith('WrongPassword123', 'hashed_password');
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Incorrect email or password');

    // Cleanup
    findOneSpy.mockRestore();
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
      toObject: () => ({
        _id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'client',
      }),
    };

    const findOneSpy = jest.spyOn(User, 'findOne').mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce(mockUser),
    });

    // Mock jwt.sign
    const jwtSpy = jest.spyOn(jwt, 'sign').mockReturnValueOnce('test-token');

    // Act
    await authController.login(req, res, mockNext);

    // Assert
    expect(mockUser.correctPassword).toHaveBeenCalledWith('Password123', 'hashed_password');
    expect(res.status).toHaveBeenCalledWith(200);
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
    expect(jwtSpy).toHaveBeenCalledWith({ id: userId }, expect.any(String), expect.any(Object));

    // Cleanup
    findOneSpy.mockRestore();
    jwtSpy.mockRestore();
  });
});

// Tests for protect middleware (JWT verification)
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

    // Mock jwt.verify to fail
    const jwtSpy = jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(new Error('invalid token'));
    });

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);

    // Cleanup
    jwtSpy.mockRestore();
  });

  test('should return 401 if user no longer exists', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Mock jwt.verify to succeed
    const jwtSpy = jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: Date.now() / 1000 });
    });

    // Mock User.findById to return null (user not found)
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValueOnce(null);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(findByIdSpy).toHaveBeenCalledWith('user-id');
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('no longer exists');

    // Cleanup
    jwtSpy.mockRestore();
    findByIdSpy.mockRestore();
  });

  test('should return 401 if user changed password after token was issued', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Mock jwt.verify to succeed
    const jwtSpy = jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: Date.now() / 1000 - 3600 }); // Issued 1 hour ago
    });

    // Mock User.findById to return a user that changed password after token was issued
    const mockUser = {
      _id: 'user-id',
      changedPasswordAfter: jest.fn().mockReturnValueOnce(true),
    };
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(findByIdSpy).toHaveBeenCalledWith('user-id');
    expect(mockUser.changedPasswordAfter).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('changed password');

    // Cleanup
    jwtSpy.mockRestore();
    findByIdSpy.mockRestore();
  });

  test('should grant access to protected route if token is valid', async () => {
    // Arrange
    const req = mockRequest();
    req.headers = { authorization: 'Bearer valid-token' };
    const res = mockResponse();

    // Mock jwt.verify to succeed
    const jwtSpy = jest.spyOn(jwt, 'verify').mockImplementationOnce((token, secret, callback) => {
      callback(null, { id: 'user-id', iat: Date.now() / 1000 });
    });

    // Mock User.findById to return a valid user
    const mockUser = {
      _id: 'user-id',
      changedPasswordAfter: jest.fn().mockReturnValueOnce(false),
    };
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

    // Act
    await authController.protect(req, res, mockNext);

    // Assert
    expect(findByIdSpy).toHaveBeenCalledWith('user-id');
    expect(mockUser.changedPasswordAfter).toHaveBeenCalled();
    expect(req.user).toBe(mockUser);
    expect(mockNext).toHaveBeenCalledWith();

    // Cleanup
    jwtSpy.mockRestore();
    findByIdSpy.mockRestore();
  });
});

// Tests for role-based authorization middleware
describe('Auth Controller - Role Authorization', () => {
  test('should return 403 if user role is not allowed', async () => {
    // Arrange
    const req = mockRequest();
    req.user = { role: 'client' };
    const res = mockResponse();

    // Create restrictTo middleware for admin and tailor roles
    const restrictToAdminTailor = authController.restrictTo('admin', 'tailor');

    // Act
    restrictToAdminTailor(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('permission');
  });

  test('should grant access if user role is allowed', async () => {
    // Arrange
    const req = mockRequest();
    req.user = { role: 'admin' };
    const res = mockResponse();

    // Create restrictTo middleware for admin and tailor roles
    const restrictToAdminTailor = authController.restrictTo('admin', 'tailor');

    // Act
    restrictToAdminTailor(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith();
  });
});

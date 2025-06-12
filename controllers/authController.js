const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const config = require('../config');

// Helper function to create and sign JWT
const signToken = id => jwt.sign({ id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

// Helper function to create and send token in response
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.register = catchAsync(async (req, res, next) => {
  // Validate required fields
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return next(new AppError('Please provide all required fields', 400));
  }

  // Create user with allowed fields only
  const newUser = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: role || 'client', // Default to client if not specified
  });

  // Send token to client
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Get user from database - explicitly select password field
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists & password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token from request headers
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access', 401));
  }

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, config.jwt.secret);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists', 401));
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please log in again', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Middleware for checking user roles
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is an array ['admin', 'tailor', etc]
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };

const express = require('express');
const authController = require('../controllers/authController');
const { validateUserRegistration, validateLogin } = require('../middleware/validators');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', validateUserRegistration, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);

module.exports = router;

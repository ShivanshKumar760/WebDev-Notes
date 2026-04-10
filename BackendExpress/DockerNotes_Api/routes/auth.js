const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post(
  '/signup',
  validators.signup,
  handleValidationErrors,
  authController.signup
);

/**
 * POST /api/auth/login
 * Authenticate user and get tokens
 */
router.post(
  '/login',
  validators.login,
  handleValidationErrors,
  authController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * POST /api/auth/logout
 * Logout user (requires authentication)
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authMiddleware,
  authController.changePassword
);

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete(
  '/account',
  authMiddleware,
  authController.deleteAccount
);

module.exports = router;

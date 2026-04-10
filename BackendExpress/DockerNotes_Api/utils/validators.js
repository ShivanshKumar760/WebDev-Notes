const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Rules
 * Express validator rules for various API endpoints
 */
const validators = {
  /**
   * Signup validation
   * Checks username, email, password, and confirmation
   */
  signup: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3-30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
      .custom(async (username) => {
        const User = require('../models/User');
        const exists = await User.usernameExists(username);
        if (exists) {
          throw new Error('Username already taken');
        }
      }),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .custom(async (email) => {
        const User = require('../models/User');
        const exists = await User.emailExists(email);
        if (exists) {
          throw new Error('Email already registered');
        }
      }),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and numbers'),

    body('confirmPassword')
      .notEmpty().withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],

  /**
   * Login validation
   */
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),

    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  /**
   * Create project validation
   */
  createProject: [
    body('name')
      .trim()
      .notEmpty().withMessage('Project name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Project name must be between 1-100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

    body('dependencies')
      .optional()
      .custom((value) => {
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('Dependencies must be an object');
        }
        // Validate each dependency version
        for (const [name, version] of Object.entries(value)) {
          if (typeof name !== 'string' || typeof version !== 'string') {
            throw new Error('Invalid dependency format');
          }
        }
        return true;
      })
  ],

  /**
   * Submit code validation
   */
  submitCode: [
    body('projectId')
      .trim()
      .notEmpty().withMessage('Project ID is required')
      .isMongoId().withMessage('Invalid project ID'),

    body('code')
      .notEmpty().withMessage('Code is required')
      .isLength({ max: 10485760 }).withMessage('Code size exceeds limit (10MB)'),

    body('language')
      .optional()
      .isIn(['javascript', 'nodejs']).withMessage('Unsupported language')
  ],

  /**
   * Project ID validation
   */
  projectId: [
    param('projectId')
      .trim()
      .isMongoId().withMessage('Invalid project ID')
  ],

  /**
   * Pagination validation
   */
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),

    query('skip')
      .optional()
      .isInt({ min: 0 }).withMessage('Skip must be 0 or greater')
  ]
};

/**
 * Validation error handler middleware
 * Catches and formats validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  validators,
  handleValidationErrors
};

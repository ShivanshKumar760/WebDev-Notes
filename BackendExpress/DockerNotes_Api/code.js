const express = require('express');
const codeController = require('../controllers/codeController');
const { authMiddleware } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/code/submit
 * Submit code for execution
 */
router.post(
  '/submit',
  validators.submitCode,
  handleValidationErrors,
  codeController.submitCode
);

/**
 * GET /api/code/:projectId/submissions
 * Get submission history with pagination
 */
router.get(
  '/:projectId/submissions',
  validators.projectId,
  validators.pagination,
  handleValidationErrors,
  codeController.getSubmissions
);

/**
 * GET /api/code/:projectId/submissions/:submissionId
 * Get specific submission details
 */
router.get(
  '/:projectId/submissions/:submissionId',
  validators.projectId,
  handleValidationErrors,
  codeController.getSubmissionDetails
);

/**
 * DELETE /api/code/:projectId/submissions
 * Clear all submissions for a project
 */
router.delete(
  '/:projectId/submissions',
  validators.projectId,
  handleValidationErrors,
  codeController.clearSubmissions
);

/**
 * GET /api/code/:projectId/stats
 * Get submission statistics
 */
router.get(
  '/:projectId/stats',
  validators.projectId,
  handleValidationErrors,
  codeController.getSubmissionStats
);

/**
 * GET /api/code/:projectId/search
 * Search submissions
 */
router.get(
  '/:projectId/search',
  validators.projectId,
  handleValidationErrors,
  codeController.searchSubmissions
);

module.exports = router;

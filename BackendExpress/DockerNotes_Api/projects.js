const express = require('express');
const projectController = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../utils/validators');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/projects
 * Create new project
 */
router.post(
  '/',
  validators.createProject,
  handleValidationErrors,
  projectController.createProject
);

/**
 * GET /api/projects
 * Get all user projects with pagination
 */
router.get(
  '/',
  validators.pagination,
  handleValidationErrors,
  projectController.getProjects
);

/**
 * GET /api/projects/:projectId
 * Get project details
 */
router.get(
  '/:projectId',
  validators.projectId,
  handleValidationErrors,
  projectController.getProject
);

/**
 * PUT /api/projects/:projectId
 * Update project
 */
router.put(
  '/:projectId',
  validators.projectId,
  handleValidationErrors,
  projectController.updateProject
);

/**
 * DELETE /api/projects/:projectId
 * Delete project and container
 */
router.delete(
  '/:projectId',
  validators.projectId,
  handleValidationErrors,
  projectController.deleteProject
);

/**
 * GET /api/projects/:projectId/stats
 * Get container stats (CPU, Memory, Network)
 */
router.get(
  '/:projectId/stats',
  validators.projectId,
  handleValidationErrors,
  projectController.getProjectStats
);

/**
 * GET /api/projects/:projectId/metrics
 * Get execution metrics
 */
router.get(
  '/:projectId/metrics',
  validators.projectId,
  handleValidationErrors,
  projectController.getProjectMetrics
);

/**
 * POST /api/projects/:projectId/restart
 * Restart project container
 */
router.post(
  '/:projectId/restart',
  validators.projectId,
  handleValidationErrors,
  projectController.restartProject
);

/**
 * GET /api/projects/:projectId/logs
 * Get container logs
 */
router.get(
  '/:projectId/logs',
  validators.projectId,
  handleValidationErrors,
  projectController.getProjectLogs
);

module.exports = router;

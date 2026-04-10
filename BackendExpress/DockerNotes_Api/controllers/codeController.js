const Project = require('../models/Project');
const codeExecutionService = require('../services/codeExecutionService');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');

/**
 * Code Controller
 * Handles code submission and execution
 */
class CodeController {
  /**
   * Submit code for execution
   * POST /api/code/submit
   */
  async submitCode(req, res, next) {
    try {
      const { projectId, code } = req.body;
      const userId = req.user.userId;

      // Verify project exists and belongs to user
      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to access this project');
      }

      // Validate code size
      const maxSize = parseInt(process.env.MAX_CODE_SIZE) || 10485760;
      if (code.length > maxSize) {
        throw new ValidationError(`Code size exceeds limit (max: ${maxSize / 1024 / 1024}MB)`);
      }

      console.log(`[Code] Executing code in project: ${projectId}`);

      // Execute code
      const result = await codeExecutionService.executeCodeHttp(
        projectId,
        code,
        userId
      );

      res.json({
        success: true,
        message: 'Code executed successfully',
        result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submission history for a project
   * GET /api/code/:projectId/submissions
   */
  async getSubmissions(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;
      const { limit = 20, skip = 0 } = req.query;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to view this project');
      }

      // Get history
      const history = await codeExecutionService.getSubmissionHistory(
        projectId,
        userId,
        parseInt(limit)
      );

      // Paginate
      const start = parseInt(skip);
      const end = start + parseInt(limit);
      const paginatedSubmissions = history.submissions.slice(start, end);

      res.json({
        success: true,
        submissions: paginatedSubmissions,
        pagination: {
          total: history.total,
          limit: parseInt(limit),
          skip: start,
          pages: Math.ceil(history.total / parseInt(limit))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific submission details
   * GET /api/code/:projectId/submissions/:submissionId
   */
  async getSubmissionDetails(req, res, next) {
    try {
      const { projectId, submissionId } = req.params;
      const userId = req.user.userId;

      const submission = await codeExecutionService.getSubmissionDetails(
        projectId,
        submissionId,
        userId
      );

      res.json({
        success: true,
        submission
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear submission history
   * DELETE /api/code/:projectId/submissions
   */
  async clearSubmissions(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const result = await codeExecutionService.clearSubmissionHistory(
        projectId,
        userId
      );

      console.log(`[Code] Cleared ${result.count} submissions for project: ${projectId}`);

      res.json({
        success: true,
        message: `Cleared ${result.count} submissions`,
        cleared: result.count
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submission statistics
   * GET /api/code/:projectId/stats
   */
  async getSubmissionStats(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to view this project');
      }

      const stats = project.getStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Search submissions by code content
   * GET /api/code/:projectId/search?q=query
   */
  async searchSubmissions(req, res, next) {
    try {
      const { projectId } = req.params;
      const { q } = req.query;
      const userId = req.user.userId;

      if (!q || q.length < 3) {
        throw new ValidationError('Search query must be at least 3 characters');
      }

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to access this project');
      }

      // Search in submissions
      const query = q.toLowerCase();
      const results = project.submissions
        .filter(sub => sub.code.toLowerCase().includes(query))
        .map(sub => ({
          id: sub._id,
          executedAt: sub.executedAt,
          status: sub.status,
          executionTime: sub.executionTime,
          codePreview: sub.code.substring(0, 100)
        }))
        .reverse();

      res.json({
        success: true,
        query,
        results,
        count: results.length
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CodeController();

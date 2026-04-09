const Project = require('../models/Project');
const dockerService = require('../services/dockerService');
const { NotFoundError, AuthorizationError } = require('../middleware/errorHandler');

/**
 * Project Controller
 * Handles project CRUD operations and management
 */
class ProjectController {
  /**
   * Create new project
   * POST /api/projects
   */
  async createProject(req, res, next) {
    try {
      const { name, description = '', dependencies = {} } = req.body;
      const userId = req.user.userId;

      // Generate unique project name
      const timestamp = Date.now();
      const projectName = `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

      // Initialize Docker environment
      console.log(`[Project] Initializing Docker for: ${projectName}`);
      const dockerResult = await dockerService.initializeProject(
        userId,
        projectName,
        dependencies
      );

      // Save project to database
      const project = new Project({
        userId,
        name,
        description,
        containerId: dockerResult.containerId,
        containerName: dockerResult.containerName,
        projectPath: dockerResult.projectPath,
        storagePath: dockerResult.projectPath,
        dependencies: new Map(Object.entries(dependencies)),
        status: 'running'
      });

      await project.save();
      console.log(`[Project] Created: ${project._id}`);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project: project.getSummary()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's projects
   * GET /api/projects?limit=10&skip=0
   */
  async getProjects(req, res, next) {
    try {
      const userId = req.user.userId;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const skip = parseInt(req.query.skip) || 0;

      const projects = await Project.findByUserId(userId, limit, skip);
      const total = await Project.countByUserId(userId);

      res.json({
        success: true,
        projects: projects.map(p => p.getSummary()),
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single project details
   * GET /api/projects/:projectId
   */
  async getProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to access this project');
      }

      res.json({
        success: true,
        project: project.getDetails()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project
   * PUT /api/projects/:projectId
   */
  async updateProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;
      const { name, description, tags } = req.body;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to update this project');
      }

      // Update fields
      if (name) project.name = name;
      if (description) project.description = description;
      if (tags) project.tags = tags;

      await project.save();
      console.log(`[Project] Updated: ${projectId}`);

      res.json({
        success: true,
        message: 'Project updated successfully',
        project: project.getDetails()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project
   * DELETE /api/projects/:projectId
   */
  async deleteProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to delete this project');
      }

      // Remove Docker container
      try {
        await dockerService.removeContainer(project.containerId);
        console.log(`[Project] Container removed: ${project.containerId}`);
      } catch (error) {
        console.error('[Project] Error removing container:', error.message);
      }

      // Delete project from database
      await Project.deleteOne({ _id: projectId });
      console.log(`[Project] Deleted: ${projectId}`);

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project container stats
   * GET /api/projects/:projectId/stats
   */
  async getProjectStats(req, res, next) {
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

      // Get container stats
      const stats = await dockerService.getContainerStats(project.containerId);

      // Update project stats
      await project.updateStats(stats);

      res.json({
        success: true,
        stats: {
          ...stats,
          totalRuns: project.totalRuns,
          lastRun: project.lastRun
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project statistics
   * GET /api/projects/:projectId/metrics
   */
  async getProjectMetrics(req, res, next) {
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

      const metrics = project.getStats();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Restart project container
   * POST /api/projects/:projectId/restart
   */
  async restartProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to restart this project');
      }

      // Stop and start container
      try {
        await dockerService.stopContainer(project.containerId);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        await dockerService.startContainer(project.containerId);

        await project.updateStatus('running', 'Container restarted');
        console.log(`[Project] Restarted: ${projectId}`);
      } catch (error) {
        await project.updateStatus('error', error.message);
        throw error;
      }

      res.json({
        success: true,
        message: 'Project restarted successfully',
        status: project.status
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project logs
   * GET /api/projects/:projectId/logs
   */
  async getProjectLogs(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;
      const { tail = 50 } = req.query;

      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project');
      }

      if (project.userId.toString() !== userId) {
        throw new AuthorizationError('You do not have permission to view this project');
      }

      const logs = await dockerService.getContainerLogs(
        project.containerId,
        parseInt(tail)
      );

      res.json({
        success: true,
        logs
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();

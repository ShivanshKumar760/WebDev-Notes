const Project = require('../models/Project');
const dockerService = require('./dockerService');
const jwt = require('../utils/jwt');

/**
 * Code Execution Service
 * Handles code execution and real-time output streaming via WebSocket
 */
class CodeExecutionService {
  /**
   * Execute code and stream output via WebSocket
   * 
   * @param {string} projectId - Project ID
   * @param {string} code - Code to execute
   * @param {object} ws - WebSocket connection
   * @param {string} token - JWT token for authentication
   */
  async executeCodeWithWebSocket(projectId, code, ws, token) {
    try {
      // Verify token
      let decoded;
      try {
        decoded = jwt.verifyToken(token);
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Find project
      const project = await Project.findById(projectId);

      if (!project) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project not found',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Verify ownership
      if (project.userId.toString() !== decoded.userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unauthorized - project does not belong to user',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Check code size
      if (code.length > parseInt(process.env.MAX_CODE_SIZE || 10485760)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Code size exceeds maximum limit',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Send status update
      ws.send(JSON.stringify({
        type: 'status',
        message: 'Starting code execution...',
        timestamp: new Date().toISOString()
      }));

      // Start execution
      const startTime = Date.now();
      
      let result;
      try {
        // Make sure container is running
        const containerInfo = await dockerService.inspectContainer(project.containerId);
        if (!containerInfo.running) {
          await dockerService.startContainer(project.containerId);
          ws.send(JSON.stringify({
            type: 'status',
            message: 'Container restarted',
            timestamp: new Date().toISOString()
          }));
        }

        // Execute code
        result = await dockerService.submitAndExecuteCode(
          project.containerId,
          code,
          'execution.js',
          parseInt(process.env.CODE_TIMEOUT || 30000)
        );
      } catch (execError) {
        result = {
          success: false,
          output: null,
          error: execError.message,
          executionTime: Date.now() - startTime,
          executedAt: new Date()
        };
      }

      const executionTime = Date.now() - startTime;

      // Send output
      if (result.success) {
        ws.send(JSON.stringify({
          type: 'output',
          data: result.output || 'Code executed successfully',
          executionTime,
          status: 'success',
          timestamp: new Date().toISOString()
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'output',
          data: result.error || 'Execution failed',
          executionTime,
          status: 'error',
          timestamp: new Date().toISOString()
        }));
      }

      // Save submission to project
      try {
        await project.addSubmission({
          code,
          language: 'nodejs',
          output: result.output || '',
          error: result.error || '',
          executedAt: new Date(),
          executionTime,
          status: result.success ? 'success' : 'error'
        });

        // Update project last run time
        project.lastRun = new Date();
        project.totalRuns += 1;
        await project.save();
      } catch (saveError) {
        console.error('[CodeExecution] Failed to save submission:', saveError);
      }

      // Send completion message
      ws.send(JSON.stringify({
        type: 'complete',
        message: 'Code execution completed',
        executionTime,
        submissionsSaved: true,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[CodeExecution] Execution error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Execute code via HTTP (fallback from WebSocket)
   */
  async executeCodeHttp(projectId, code, userId) {
    try {
      // Find project
      const project = await Project.findById(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      // Verify ownership
      if (project.userId.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      // Check code size
      if (code.length > parseInt(process.env.MAX_CODE_SIZE || 10485760)) {
        throw new Error('Code size exceeds maximum limit');
      }

      // Ensure container is running
      const containerInfo = await dockerService.inspectContainer(project.containerId);
      if (!containerInfo.running) {
        await dockerService.startContainer(project.containerId);
      }

      // Execute code
      const startTime = Date.now();
      const result = await dockerService.submitAndExecuteCode(
        project.containerId,
        code,
        'execution.js',
        parseInt(process.env.CODE_TIMEOUT || 30000)
      );

      const executionTime = Date.now() - startTime;

      // Save submission
      await project.addSubmission({
        code,
        language: 'nodejs',
        output: result.output || '',
        error: result.error || '',
        executedAt: new Date(),
        executionTime,
        status: result.success ? 'success' : 'error'
      });

      return {
        success: true,
        output: result.output,
        error: result.error,
        executionTime,
        submissionId: project.submissions[project.submissions.length - 1]?._id
      };

    } catch (error) {
      console.error('[CodeExecution] HTTP execution error:', error);
      throw error;
    }
  }

  /**
   * Stream container logs via WebSocket
   */
  async streamContainerLogs(projectId, ws, token) {
    try {
      // Verify token
      let decoded;
      try {
        decoded = jwt.verifyToken(token);
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid or expired token'
        }));
        return;
      }

      // Find project
      const project = await Project.findById(projectId);

      if (!project) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project not found'
        }));
        return;
      }

      // Verify ownership
      if (project.userId.toString() !== decoded.userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unauthorized'
        }));
        return;
      }

      // Get logs
      const logs = await dockerService.getContainerLogs(
        project.containerId,
        100
      );

      ws.send(JSON.stringify({
        type: 'logs',
        data: logs,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[CodeExecution] Get logs error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  /**
   * Get submission history
   */
  async getSubmissionHistory(projectId, userId, limit = 20) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      if (project.userId.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      // Get recent submissions
      const submissions = project.getRecentSubmissions(limit);

      return {
        total: project.submissions.length,
        limit,
        submissions: submissions.map(sub => ({
          id: sub._id,
          language: sub.language,
          status: sub.status,
          executionTime: sub.executionTime,
          hasOutput: !!sub.output,
          hasError: !!sub.error,
          executedAt: sub.executedAt,
          codePreview: sub.code.substring(0, 100) + (sub.code.length > 100 ? '...' : '')
        }))
      };

    } catch (error) {
      console.error('[CodeExecution] Get history error:', error);
      throw error;
    }
  }

  /**
   * Get specific submission details
   */
  async getSubmissionDetails(projectId, submissionId, userId) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      if (project.userId.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      const submission = project.submissions.find(
        sub => sub._id.toString() === submissionId
      );

      if (!submission) {
        throw new Error('Submission not found');
      }

      return {
        code: submission.code,
        language: submission.language,
        output: submission.output,
        error: submission.error,
        status: submission.status,
        executionTime: submission.executionTime,
        executedAt: submission.executedAt
      };

    } catch (error) {
      console.error('[CodeExecution] Get submission details error:', error);
      throw error;
    }
  }

  /**
   * Clear submission history
   */
  async clearSubmissionHistory(projectId, userId) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      if (project.userId.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      const count = project.submissions.length;
      project.submissions = [];
      await project.save();

      return {
        cleared: true,
        count
      };

    } catch (error) {
      console.error('[CodeExecution] Clear history error:', error);
      throw error;
    }
  }
}

module.exports = new CodeExecutionService();

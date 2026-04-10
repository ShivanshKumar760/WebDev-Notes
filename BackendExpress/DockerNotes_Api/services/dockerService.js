const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Docker Service
 * Manages container lifecycle, execution, and monitoring
 */
class DockerService {
  constructor() {
    try {
      // Initialize Docker connection
      this.docker = new Docker({
        socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
      });
      
      this.baseImage = process.env.BASE_IMAGE || 'node:18-alpine';
      this.maxMemory = this.parseMemoryLimit(process.env.MAX_MEMORY || '512m');
      this.cpuShares = parseInt(process.env.MAX_CPU_SHARES) || 1024;
      
      console.log('✓ Docker service initialized');
    } catch (error) {
      console.error('✗ Docker service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Parse memory limit string (e.g., "512m" -> bytes)
   */
  parseMemoryLimit(memStr) {
    const units = { m: 1024 * 1024, g: 1024 * 1024 * 1024, k: 1024 };
    const match = memStr.match(/(\d+)([mgk])?/i);
    if (!match) return 512 * 1024 * 1024;
    
    const value = parseInt(match[1]);
    const unit = units[match[2]?.toLowerCase()] || 1024 * 1024;
    return value * unit;
  }

  /**
   * Initialize Docker environment for a project
   * Creates container with dependencies installed
   * 
   * @param {string} userId - User ID
   * @param {string} projectName - Project name for container
   * @param {object} dependencies - npm dependencies
   * @returns {object} - Container initialization result
   */
  async initializeProject(userId, projectName, dependencies = {}) {
    try {
      console.log(`[Docker] Initializing project: ${projectName}`);
      
      // Create project directory
      const projectPath = path.join(
        process.env.STORAGE_PATH || './storage/projects',
        userId,
        projectName
      );
      
      // Ensure directory exists
      await fs.mkdir(projectPath, { recursive: true });
      console.log(`[Docker] Project directory created: ${projectPath}`);

      // Create package.json with dependencies
      const packageJson = {
        name: projectName,
        version: '1.0.0',
        main: 'app.js',
        description: 'Mini Replit Project',
        scripts: {
          start: 'node app.js',
          dev: 'node app.js'
        },
        dependencies: {
          'express': '^4.18.2',
          'body-parser': '^1.20.2',
          'cors': '^2.8.5',
          ...dependencies
        },
        engines: {
          node: '>=14.0.0'
        }
      };

      const packageJsonPath = path.join(projectPath, 'package.json');
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
      console.log('[Docker] package.json created');

      // Create initial app.js
      const appJsPath = path.join(projectPath, 'app.js');
      const initialCode = `const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to your Mini Replit project!',
    timestamp: new Date()
  });
});

app.get('/api/info', (req, res) => {
  res.json({ 
    project: '${projectName}',
    nodeVersion: process.version,
    platform: process.platform
  });
});

app.post('/api/echo', (req, res) => {
  res.json({ 
    received: req.body,
    timestamp: new Date()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

      await fs.writeFile(appJsPath, initialCode);
      console.log('[Docker] app.js created');

      // Create container
      console.log('[Docker] Creating container...');
      const container = await this.docker.createContainer({
        Image: this.baseImage,
        name: projectName,
        
        // Port bindings
        ExposedPorts: {
          '3000/tcp': {}
        },
        
        PortBindings: {
          '3000/tcp': [{ HostPort: String(8000 + Math.floor(Math.random() * 1000)) }]
        },
        
        // Environment
        Env: [
          'NODE_ENV=development',
          'PORT=3000'
        ],
        
        // Volumes
        Volumes: {
          '/app': {}
        },
        
        WorkingDir: '/app',
        
        // Resource limits
        Memory: this.maxMemory,
        MemorySwap: this.maxMemory * 2,
        CpuShares: this.cpuShares,
        
        // Host config
        HostConfig: {
          Binds: [
            `${projectPath}:/app`
          ],
          RestartPolicy: {
            Name: 'unless-stopped',
            MaximumRetryCount: 3
          },
          LogConfig: {
            Type: 'json-file',
            Config: {
              'max-size': '10m',
              'max-file': '3'
            }
          }
        },

        // Labels for identification
        Labels: {
          'app': 'mini-replit',
          'userId': userId,
          'projectName': projectName,
          'createdAt': new Date().toISOString()
        }
      });

      console.log(`[Docker] Container created: ${container.id.substring(0, 12)}`);

      // Install dependencies by running npm install
      console.log('[Docker] Installing dependencies...');
      await this.runCommand(container.id, 'npm install', 60000);
      console.log('[Docker] Dependencies installed');

      return {
        containerId: container.id,
        containerName: projectName,
        projectPath,
        success: true,
        message: 'Project initialized successfully'
      };

    } catch (error) {
      console.error('[Docker] Initialize project error:', error.message);
      throw new Error(`Failed to initialize project: ${error.message}`);
    }
  }

  /**
   * Write code to file and execute
   * 
   * @param {string} containerId - Container ID
   * @param {string} code - Code to execute
   * @param {string} filename - Filename to write to
   * @param {number} timeout - Execution timeout in ms
   * @returns {object} - Execution result
   */
  async submitAndExecuteCode(containerId, code, filename = 'execution.js', timeout = 30000) {
    try {
      console.log(`[Docker] Executing code in container: ${containerId.substring(0, 12)}`);
      
      // Write code to temporary file
      const writeCmd = `cat > ${filename} << 'ENDOFFILE'\n${code}\nENDOFFILE`;
      
      await this.runCommand(containerId, writeCmd, 5000);
      console.log(`[Docker] Code written to ${filename}`);

      // Execute code with timeout
      const timeoutCmd = `timeout ${Math.ceil(timeout / 1000)} node ${filename}`;
      
      const startTime = Date.now();
      const output = await this.runCommand(containerId, timeoutCmd, timeout + 5000);
      const executionTime = Date.now() - startTime;

      console.log(`[Docker] Code executed successfully in ${executionTime}ms`);

      return {
        success: true,
        output: output || 'Code executed successfully with no output',
        error: null,
        executionTime,
        executedAt: new Date()
      };

    } catch (error) {
      console.error('[Docker] Code execution error:', error.message);
      
      return {
        success: false,
        output: null,
        error: error.message,
        executionTime: 0,
        executedAt: new Date()
      };
    }
  }

  /**
   * Run command in container
   * 
   * @param {string} containerId - Container ID
   * @param {string} command - Command to run
   * @param {number} timeout - Timeout in milliseconds
   * @returns {string} - Command output
   */
  async runCommand(containerId, command, timeout = 30000) {
    try {
      const container = this.docker.getContainer(containerId);

      // Create exec instance
      const exec = await container.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['/bin/sh', '-c', command],
        Tty: false
      });

      // Start exec
      const stream = await exec.start({ Tty: false });

      return new Promise((resolve, reject) => {
        let output = '';
        let timedOut = false;
        
        const timeoutId = setTimeout(() => {
          timedOut = true;
          stream.destroy();
          reject(new Error('Command execution timeout'));
        }, timeout);

        stream.on('data', (chunk) => {
          output += chunk.toString();
        });

        stream.on('end', async () => {
          if (timedOut) return;
          
          clearTimeout(timeoutId);
          
          try {
            const inspectData = await exec.inspect();
            if (inspectData.ExitCode !== 0 && inspectData.ExitCode !== null) {
              reject(new Error(`Command failed with exit code ${inspectData.ExitCode}: ${output}`));
            } else {
              resolve(output);
            }
          } catch (err) {
            reject(err);
          }
        });

        stream.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });

    } catch (error) {
      throw new Error(`Exec error: ${error.message}`);
    }
  }

  /**
   * Start container
   */
  async startContainer(containerId) {
    try {
      console.log(`[Docker] Starting container: ${containerId.substring(0, 12)}`);
      const container = this.docker.getContainer(containerId);
      await container.start();
      return { success: true, message: 'Container started' };
    } catch (error) {
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }

  /**
   * Stop container
   */
  async stopContainer(containerId, timeout = 10) {
    try {
      console.log(`[Docker] Stopping container: ${containerId.substring(0, 12)}`);
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
      return { success: true, message: 'Container stopped' };
    } catch (error) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }

  /**
   * Remove container
   */
  async removeContainer(containerId) {
    try {
      console.log(`[Docker] Removing container: ${containerId.substring(0, 12)}`);
      const container = this.docker.getContainer(containerId);
      
      // Stop container first if running
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          await this.stopContainer(containerId);
        }
      } catch (e) {
        // Container already stopped
      }
      
      await container.remove({ force: true });
      return { success: true, message: 'Container removed' };
    } catch (error) {
      throw new Error(`Failed to remove container: ${error.message}`);
    }
  }

  /**
   * Get container stats (CPU, Memory, Network)
   */
  async getContainerStats(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      
      return new Promise((resolve, reject) => {
        container.stats({ stream: false }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            try {
              const stats = {
                memory: {
                  usage: Math.round(data.memory_stats.usage / (1024 * 1024)),
                  limit: Math.round(data.memory_stats.limit / (1024 * 1024))
                },
                cpu: this.calculateCpuPercent(data),
                network: {
                  rx_bytes: data.networks?.eth0?.rx_bytes || 0,
                  tx_bytes: data.networks?.eth0?.tx_bytes || 0
                },
                timestamp: new Date()
              };
              resolve(stats);
            } catch (parseErr) {
              reject(parseErr);
            }
          }
        });
      });

    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Calculate CPU percentage
   */
  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        (stats.precpu_stats?.system_cpu_usage || 0);
    
    if (systemDelta === 0) return 0;
    
    return parseFloat(((cpuDelta / systemDelta) * 100).toFixed(2));
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId, tail = 50) {
    try {
      const container = this.docker.getContainer(containerId);
      
      return new Promise((resolve, reject) => {
        container.logs({
          stdout: true,
          stderr: true,
          tail: tail,
          timestamps: true
        }, (err, stream) => {
          if (err) {
            reject(err);
          } else {
            let output = '';
            
            stream.on('data', (chunk) => {
              output += chunk.toString();
            });
            
            stream.on('end', () => {
              resolve(output);
            });
            
            stream.on('error', reject);
          }
        });
      });

    } catch (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * Inspect container
   */
  async inspectContainer(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const data = await container.inspect();
      
      return {
        id: data.Id.substring(0, 12),
        name: data.Name.replace(/^\//, ''),
        status: data.State.Status,
        running: data.State.Running,
        pid: data.State.Pid,
        exitCode: data.State.ExitCode,
        image: data.Config.Image,
        cmd: data.Config.Cmd,
        env: data.Config.Env,
        workingDir: data.Config.WorkingDir,
        ports: data.NetworkSettings.Ports,
        ipAddress: data.NetworkSettings.IPAddress,
        labels: data.Config.Labels,
        createdAt: data.Created
      };

    } catch (error) {
      throw new Error(`Failed to inspect container: ${error.message}`);
    }
  }

  /**
   * Health check - verify Docker connectivity
   */
  async healthCheck() {
    try {
      const info = await this.docker.getEvents({
        filters: { type: ['container'] }
      });
      
      return {
        connected: true,
        message: 'Docker daemon is reachable',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * List all containers
   */
  async listContainers(options = {}) {
    try {
      const containers = await this.docker.listContainers({
        all: options.all || false,
        limit: options.limit || 20,
        size: true,
        filters: {
          label: ['app=mini-replit']
        }
      });

      return containers.map(c => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace(/^\//, ''),
        image: c.Image,
        status: c.Status,
        state: c.State,
        size: c.SizeRw,
        ports: c.Ports
      }));

    } catch (error) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  }

  /**
   * Cleanup old containers (optional maintenance)
   */
  async cleanupOldContainers(maxAgeHours = 24) {
    try {
      const containers = await this.listContainers({ all: true });
      const now = Date.now();
      let cleaned = 0;

      for (const container of containers) {
        const containerInfo = await this.inspectContainer(container.id);
        const createdTime = new Date(containerInfo.createdAt).getTime();
        const ageHours = (now - createdTime) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours && containerInfo.status !== 'running') {
          await this.removeContainer(container.id);
          cleaned++;
        }
      }

      console.log(`[Docker] Cleaned up ${cleaned} old containers`);
      return { cleaned };

    } catch (error) {
      console.error('[Docker] Cleanup error:', error);
    }
  }
}

module.exports = new DockerService();

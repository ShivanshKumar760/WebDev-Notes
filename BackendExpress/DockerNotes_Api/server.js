const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const codeRoutes = require('./routes/code');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import services
const codeExecutionService = require('./services/codeExecutionService');
const dockerService = require('./services/dockerService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws',
  clientTracking: true
});

// ============================================
// MIDDLEWARE SETUP
// ============================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase() {
  try {
    const dbUrl = process.env.DATABASE_TYPE === 'postgresql'
      ? process.env.POSTGRESQL_URL
      : process.env.MONGODB_URL;

    if (!dbUrl) {
      throw new Error('Database URL not configured in .env');
    }

    // MongoDB connection
    if (process.env.DATABASE_TYPE !== 'postgresql') {
      await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 5
      });
      console.log('✓ Connected to MongoDB');
    } else {
      console.log('✓ PostgreSQL configured (connection pooling to be implemented)');
    }
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);
  }
}

connectDatabase();

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

/**
 * Health check endpoint
 * Returns server status and uptime
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mini-replit',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

/**
 * Docker health check endpoint
 * Verifies Docker daemon connectivity
 */
app.get('/docker-health', async (req, res) => {
  try {
    const health = await dockerService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

/**
 * System stats endpoint
 * Returns memory and CPU usage
 */
app.get('/stats', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    uptime: Math.round(process.uptime()) + 's'
  });
});

// ============================================
// API ROUTES
// ============================================

/**
 * Authentication routes
 * POST /api/auth/signup - Create new user
 * POST /api/auth/login - Login user
 * POST /api/auth/logout - Logout user
 */
app.use('/api/auth', authRoutes);

/**
 * Project routes (require authentication)
 * POST /api/projects - Create project
 * GET /api/projects - List user projects
 * GET /api/projects/:projectId - Get project details
 * DELETE /api/projects/:projectId - Delete project
 * GET /api/projects/:projectId/stats - Get container stats
 */
app.use('/api/projects', projectRoutes);

/**
 * Code execution routes (require authentication)
 * POST /api/code/submit - Execute code
 * GET /api/code/:projectId/submissions - Get submission history
 */
app.use('/api/code', codeRoutes);

// ============================================
// WEBSOCKET HANDLER
// ============================================

/**
 * WebSocket connection handler
 * Manages real-time code execution and output streaming
 */
wss.on('connection', (ws) => {
  console.log(`[${new Date().toISOString()}] WebSocket client connected. Total clients: ${wss.clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully',
    timestamp: new Date().toISOString()
  }));

  /**
   * Handle incoming WebSocket messages
   * Expected message format:
   * {
   *   type: 'execute_code' | 'get_logs',
   *   projectId: 'project_id',
   *   code?: 'code_to_execute',
   *   token: 'jwt_token'
   * }
   */
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { type, projectId, code, token } = data;

      // Validate projectId
      if (!projectId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project ID is required',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Validate authentication token
      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication token is required',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // Route to appropriate handler
      switch (type) {
        case 'execute_code':
          if (!code) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Code content is required for execution',
              timestamp: new Date().toISOString()
            }));
          } else {
            await codeExecutionService.executeCodeWithWebSocket(
              projectId,
              code,
              ws,
              token
            );
          }
          break;

        case 'get_logs':
          await codeExecutionService.streamContainerLogs(projectId, ws, token);
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown action type: ${type}. Supported: execute_code, get_logs, ping`,
            timestamp: new Date().toISOString()
          }));
      }

    } catch (error) {
      console.error('[WebSocket] Message handling error:', error);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      } catch (sendError) {
        console.error('[WebSocket] Failed to send error message:', sendError);
      }
    }
  });

  /**
   * Handle WebSocket close
   */
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket client disconnected. Remaining: ${wss.clients.size}`);
  });

  /**
   * Handle WebSocket errors
   */
  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error.message);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Custom error handling middleware
 * Catches and formats all application errors
 */
app.use(errorHandler);

/**
 * 404 handler
 * Handles requests to non-existent routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WEBSOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Mini Replit Server Started         ║
╚════════════════════════════════════════╝

✓ HTTP Server:    http://localhost:${PORT}
✓ WebSocket:      ws://localhost:${PORT}/ws
✓ Environment:    ${process.env.NODE_ENV || 'development'}
✓ Database:       ${process.env.DATABASE_TYPE || 'mongodb'}
✓ Node Version:   ${process.version}

📍 API ENDPOINTS:
  Auth:
    POST   /api/auth/signup
    POST   /api/auth/login
    POST   /api/auth/logout

  Projects:
    POST   /api/projects                    - Create project
    GET    /api/projects                    - List projects
    GET    /api/projects/:projectId         - Get project
    DELETE /api/projects/:projectId         - Delete project
    GET    /api/projects/:projectId/stats   - Get stats

  Code:
    POST   /api/code/submit                 - Execute code
    GET    /api/code/:projectId/submissions - Get submissions

  System:
    GET    /health                          - Server health
    GET    /docker-health                   - Docker health
    GET    /stats                           - System stats

🔗 WebSocket:
  ws://localhost:${PORT}/ws
  
  Supported messages:
    { type: 'execute_code', projectId: '...', code: '...', token: '...' }
    { type: 'get_logs', projectId: '...', token: '...' }
    { type: 'ping' }

💾 Storage Path: ${process.env.STORAGE_PATH || './storage/projects'}
⏱️  Code Timeout: ${process.env.CODE_TIMEOUT || 30000}ms
💾 Max Memory: ${process.env.MAX_MEMORY || '512m'}

Ready to accept connections! 🎉
`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

/**
 * Handle graceful shutdown
 * Closes server and database connections cleanly
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  // Close WebSocket server
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  wss.close(() => {
    console.log('✓ WebSocket server closed');
  });

  // Close HTTP server
  server.close(() => {
    console.log('✓ HTTP server closed');
  });

  // Close database connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  }

  console.log('✓ Server shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================
// UNHANDLED ERRORS
// ============================================

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;

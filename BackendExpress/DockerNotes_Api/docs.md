# Mini Replit - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Detailed Code Explanation](#detailed-code-explanation)
   - [Server Entry Point](#server-entry-point)
   - [Controllers](#controllers)
   - [Routes](#routes)
   - [Middleware](#middleware)
   - [Services](#services)
   - [Models](#models)
   - [Utilities](#utilities)
4. [API Reference](#api-reference)
5. [Setup & Deployment](#setup--deployment)
6. [Docker Integration](#docker-integration)
7. [Authentication Flow](#authentication-flow)
8. [Code Execution Flow](#code-execution-flow)

---

## Project Overview

Mini Replit is a web-based code execution platform that allows users to:
- Sign up and log in to their accounts
- Create isolated Docker containers for each project
- Write and execute JavaScript/Node.js code
- View real-time output via WebSocket
- Access submission history and search past code

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| Containerization | Docker + Dockerode |
| Real-time | WebSocket (ws) |
| Authentication | JWT |
| Validation | express-validator |

---

## Project Structure

```
DockerNotes_Api/
├── controllers/                    # Route handlers (business logic)
│   ├── authController.js          # User authentication logic
│   ├── projectController.js       # Project CRUD operations
│   └── codeController.js         # Code submission handling
│
├── routes/                        # API route definitions
│   ├── auth.js                   # /api/auth endpoints
│   ├── projects.js              # /api/projects endpoints
│   └── code.js                 # /api/code endpoints
│
├── middleware/                    # Express middleware functions
│   ├── auth.js                  # JWT authentication middleware
│   └── errorHandler.js          # Global error handling
│
├── services/                     # Business logic & external integrations
│   ├── dockerService.js         # Docker container management
│   └── codeExecutionService.js # Code execution & streaming
│
├── models/                       # Database schemas
│   ├── User.js                  # User schema with auth methods
│   └── Project.js               # Project schema with submissions
│
├── utils/                       # Utility functions
│   ├── jwt.js                  # JWT token operations
│   └── validators.js            # Input validation rules
│
├── server.js                    # Application entry point
├── package.json                 # Dependencies
├── Dockerfile                   # Container image
└── docker-compose.yml          # Multi-container setup
```

---

## Detailed Code Explanation

### Server Entry Point

#### File: `server.js` (422 lines)

This is the main application entry point that sets up the Express server, WebSocket server, database connection, and all routes.

**Key Components:**

```javascript
// Line 1-6: Core Dependencies
const express = require('express');      // Web framework
const cors = require('cors');           // Cross-origin resource sharing
const WebSocket = require('ws');        // WebSocket library
const http = require('http');           // HTTP server
const mongoose = require('mongoose');   // MongoDB ODM
require('dotenv').config();             // Environment variables
```

**Why these imports?**
- `express` - Main web framework for handling HTTP requests
- `cors` - Allows frontend applications to access the API
- `ws` - Provides WebSocket support for real-time communication
- `http` - Creates HTTP server to attach Express and WebSocket
- `mongoose` - MongoDB object modeling for database operations
- `dotenv` - Loads environment variables from .env file

```javascript
// Line 9-11: Route Imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const codeRoutes = require('./routes/code');
```

**Route Organization:**
- `authRoutes` - Handles authentication (signup, login, logout)
- `projectRoutes` - Handles project CRUD operations
- `codeRoutes` - Handles code submission and history

```javascript
// Line 14: Error Handler Import
const errorHandler = require('./middleware/errorHandler');
```

**Error Handler:**
- Catches all unhandled errors
- Returns consistent JSON error responses
- Logs errors with request details

```javascript
// Line 21-29: Server Setup
const app = express();                              // Create Express app
const server = http.createServer(app);             // Create HTTP server
const wss = new WebSocket.Server({                 // Create WebSocket server
  server,                                          // Attach to HTTP server
  path: '/ws',                                     // WebSocket endpoint
  clientTracking: true                             // Track connected clients
});
```

**Server Architecture:**
- Express handles HTTP requests/responses
- WebSocket server shares the same HTTP server
- Both listen on the same port (3000)

```javascript
// Line 35-41: Middleware Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',          // Allow all origins by default
  credentials: true                                 // Allow cookies/credentials
}));

app.use(express.json({ limit: '50mb' }));          // Parse JSON bodies (50MB limit)
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded bodies
```

**Middleware Purpose:**
- `cors` - Enable cross-origin requests from frontend
- `express.json()` - Parse JSON request bodies
- `express.urlencoded()` - Parse form data
- 50MB limit allows large code submissions

```javascript
// Line 44-51: Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();                         // Record request start time
  res.on('finish', () => {                         // When response is finished
    const duration = Date.now() - start;           // Calculate duration
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();                                          // Continue to next middleware
});
```

**Request Logging:**
- Logs timestamp, HTTP method, path, status code, and response time
- Helps with debugging and performance monitoring

```javascript
// Line 57-83: Database Connection
async function connectDatabase() {
  try {
    const dbUrl = process.env.DATABASE_TYPE === 'postgresql'
      ? process.env.POSTGRESQL_URL
      : process.env.MONGODB_URL;
    
    if (process.env.DATABASE_TYPE !== 'postgresql') {
      await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 5
      });
    }
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);                              // Exit if database fails
  }
}
```

**Database Connection:**
- Supports both MongoDB and PostgreSQL (currently uses MongoDB)
- Connection pooling with max/min pool sizes
- Auto-exits on connection failure (fail-fast)

```javascript
// Line 95-103: Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mini-replit',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

**Health Check:**
- Returns server status, uptime, and environment
- Used by load balancers and monitoring tools

```javascript
// Line 174-284: WebSocket Handler
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'execute_code':
        await codeExecutionService.executeCodeWithWebSocket(...);
        break;
      case 'get_logs':
        await codeExecutionService.streamContainerLogs(...);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  });
});
```

**WebSocket Message Types:**
- `execute_code` - Execute code and stream output
- `get_logs` - Stream container logs
- `ping` - Keep-alive/heartbeat

```javascript
// Line 316-364: Server Startup
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Mini Replit Server Started         ║
╚════════════════════════════════════════╝
  `);
});
```

**Startup Banner:**
- Displays all available endpoints
- Shows configuration values
- ASCII art for visual appeal

```javascript
// Line 374-398: Graceful Shutdown
const gracefulShutdown = async (signal) => {
  wss.clients.forEach((client) => client.close(1000));
  server.close();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
};
```

**Graceful Shutdown:**
- Closes all WebSocket connections
- Stops HTTP server
- Closes database connection
- Ensures clean exit

```javascript
// Line 400-420: Error Handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {...});
process.on('uncaughtException', (error) => {...});
```

**Process Event Handlers:**
- `SIGINT/SIGTERM` - Graceful shutdown on Ctrl+C or kill
- `unhandledRejection` - Catch unhandled promise rejections
- `uncaughtException` - Catch unhandled exceptions

---

### Controllers

Controllers handle the business logic for each route. They process requests, interact with models and services, and return responses.

#### File: `controllers/authController.js` (302 lines)

Handles user authentication: signup, login, logout, password management.

**Dependencies:**
```javascript
const User = require('../models/User');           // User database model
const jwt = require('../utils/jwt');              // JWT utilities
const { ValidationError, AuthenticationError } = require('../middleware/errorHandler');
```

**signup() Method (Lines 14-65):**
```javascript
async signup(req, res, next) {
  // 1. Extract user data from request body
  const { username, email, password, confirmPassword } = req.body;
  
  // 2. Validate required fields
  if (!username || !email || !password || !confirmPassword) {
    throw new ValidationError('All fields are required');
  }
  
  // 3. Check password confirmation
  if (password !== confirmPassword) {
    throw new ValidationError('Passwords do not match');
  }
  
  // 4. Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  });
  
  // 5. Create new user (password auto-hashed by User model)
  const user = new User({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password
  });
  await user.save();
  
  // 6. Generate JWT tokens
  const token = jwt.generateToken({ userId: user._id });
  const refreshToken = jwt.generateRefreshToken({ userId: user._id });
  
  // 7. Return success response
  res.status(201).json({ success: true, token, refreshToken, user: user.toJSON() });
}
```

**login() Method (Lines 71-118):**
```javascript
async login(req, res, next) {
  // 1. Find user with password field (normally excluded)
  const user = await User.findOne({ email }).select('+password');
  
  // 2. Compare password with hashed value
  const isPasswordValid = await user.comparePassword(password);
  
  // 3. Update last login timestamp
  await user.updateLastLogin();
  
  // 4. Generate tokens with user role
  const token = jwt.generateToken({ userId: user._id, role: user.role });
  
  // 5. Return success with tokens and user data
}
```

**Key Security Features:**
- Password hashing with bcrypt (auto-handled by User model)
- Token includes user role for authorization
- Email/username case-insensitive storage
- Account deactivation check

---

#### File: `controllers/projectController.js` (345 lines)

Handles project CRUD operations and container management.

**createProject() Method (Lines 14-56):**
```javascript
async createProject(req, res, next) {
  // 1. Extract project data
  const { name, description, dependencies } = req.body;
  const userId = req.user.userId;
  
  // 2. Generate unique project name with timestamp
  const projectName = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  
  // 3. Initialize Docker container
  const dockerResult = await dockerService.initializeProject(
    userId,
    projectName,
    dependencies
  );
  
  // 4. Save project to database
  const project = new Project({
    userId,
    name,
    description,
    containerId: dockerResult.containerId,
    containerName: dockerResult.containerName,
    projectPath: dockerResult.projectPath,
    status: 'running'
  });
  await project.save();
  
  // 5. Return created project summary
}
```

**Project Lifecycle:**
1. Generate unique container name
2. Create Docker container with volume mount
3. Install npm dependencies
4. Save project metadata to MongoDB
5. Return project details

**deleteProject() Method (Lines 159-194):**
```javascript
async deleteProject(req, res, next) {
  // 1. Verify project exists and belongs to user
  // 2. Remove Docker container
  await dockerService.removeContainer(project.containerId);
  // 3. Delete project from database
  await Project.deleteOne({ _id: projectId });
}
```

**Authorization Check Pattern:**
```javascript
if (project.userId.toString() !== userId) {
  throw new AuthorizationError('You do not have permission...');
}
```

---

#### File: `controllers/codeController.js` (237 lines)

Handles code submission, execution, and history retrieval.

**submitCode() Method (Lines 14-54):**
```javascript
async submitCode(req, res, next) {
  // 1. Get project ID and code from request
  const { projectId, code } = req.body;
  const userId = req.user.userId;
  
  // 2. Verify project ownership
  const project = await Project.findById(projectId);
  if (project.userId.toString() !== userId) {
    throw new AuthorizationError('...');
  }
  
  // 3. Validate code size (max 10MB)
  if (code.length > process.env.MAX_CODE_SIZE) {
    throw new ValidationError('Code size exceeds limit');
  }
  
  // 4. Execute code via service
  const result = await codeExecutionService.executeCodeHttp(projectId, code, userId);
  
  // 5. Return execution result
}
```

---

### Routes

Routes define API endpoints and connect them to controllers.

#### File: `routes/auth.js` (68 lines)

```javascript
const express = require('express');
const router = express.Router();

// POST /api/auth/signup - Create new user
router.post('/signup', validators.signup, handleValidationErrors, authController.signup);

// POST /api/auth/login - Authenticate user
router.post('/login', validators.login, handleValidationErrors, authController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);

// POST /api/auth/logout - Logout user (requires auth)
router.post('/logout', authMiddleware, authController.logout);

// GET /api/auth/me - Get current user (requires auth)
router.get('/me', authMiddleware, authController.getCurrentUser);

// POST /api/auth/change-password - Change password (requires auth)
router.post('/change-password', authMiddleware, authController.changePassword);

// DELETE /api/auth/account - Delete account (requires auth)
router.delete('/account', authMiddleware, authController.deleteAccount);
```

**Route Middleware Chain:**
1. `validators.signup` - Validate input
2. `handleValidationErrors` - Check validation results
3. `authController.signup` - Execute business logic

---

#### File: `routes/projects.js` (110 lines)

```javascript
// All routes require authentication
router.use(authMiddleware);

// POST /api/projects - Create project
router.post('/', validators.createProject, handleValidationErrors, projectController.createProject);

// GET /api/projects - List user's projects (with pagination)
router.get('/', validators.pagination, handleValidationErrors, projectController.getProjects);

// GET /api/projects/:projectId - Get project details
router.get('/:projectId', validators.projectId, handleValidationErrors, projectController.getProject);

// PUT /api/projects/:projectId - Update project
router.put('/:projectId', validators.projectId, handleValidationErrors, projectController.updateProject);

// DELETE /api/projects/:projectId - Delete project
router.delete('/:projectId', validators.projectId, handleValidationErrors, projectController.deleteProject);

// GET /api/projects/:projectId/stats - Get container stats
router.get('/:projectId/stats', validators.projectId, handleValidationErrors, projectController.getProjectStats);

// GET /api/projects/:projectId/metrics - Get execution metrics
router.get('/:projectId/metrics', validators.projectId, handleValidationErrors, projectController.getProjectMetrics);

// POST /api/projects/:projectId/restart - Restart container
router.post('/:projectId/restart', validators.projectId, handleValidationErrors, projectController.restartProject);

// GET /api/projects/:projectId/logs - Get container logs
router.get('/:projectId/logs', validators.projectId, handleValidationErrors, projectController.getProjectLogs);
```

---

#### File: `routes/code.js` (78 lines)

```javascript
// All routes require authentication
router.use(authMiddleware);

// POST /api/code/submit - Execute code
router.post('/submit', validators.submitCode, handleValidationErrors, codeController.submitCode);

// GET /api/code/:projectId/submissions - Get submission history
router.get('/:projectId/submissions', validators.projectId, validators.pagination, ...);

// GET /api/code/:projectId/submissions/:submissionId - Get specific submission
router.get('/:projectId/submissions/:submissionId', validators.projectId, ...);

// DELETE /api/code/:projectId/submissions - Clear submissions
router.delete('/:projectId/submissions', validators.projectId, ...);

// GET /api/code/:projectId/stats - Get submission statistics
router.get('/:projectId/stats', validators.projectId, ...);

// GET /api/code/:projectId/search?q=query - Search submissions
router.get('/:projectId/search', validators.projectId, ...);
```

---

### Middleware

#### File: `middleware/auth.js` (208 lines)

**authMiddleware() Function (Lines 7-64):**
```javascript
const authMiddleware = (req, res, next) => {
  // 1. Extract Authorization header
  const authHeader = req.headers.authorization;
  
  // 2. Check for Bearer token format
  if (!authHeader || parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ message: 'Invalid authorization header format' });
  }
  
  // 3. Extract and verify token
  const token = parts[1];
  const decoded = jwt.verifyToken(token);
  
  // 4. Attach user info to request object
  req.user = { userId: decoded.userId, iat: decoded.iat, exp: decoded.exp };
  req.token = decoded;
  
  next();  // Continue to next middleware/handler
};
```

**Token Verification Flow:**
1. Check Authorization header exists
2. Parse "Bearer <token>" format
3. Verify JWT signature and expiration
4. Attach decoded payload to `req.user`
5. Continue to route handler

**optionalAuthMiddleware() Function (Lines 70-104):**
- Similar to authMiddleware but doesn't fail if no token
- Sets `req.isAuthenticated = true/false`
- Used for routes that work with or without auth

**adminAuthMiddleware() Function (Lines 110-139):**
```javascript
const adminAuthMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.token.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
};
```

**createRateLimitMiddleware() Function (Lines 170-200):**
```javascript
const createRateLimitMiddleware = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const store = new Map();  // In-memory store (use Redis in production)
  
  return (req, res, next) => {
    const key = req.user?.userId || req.ip;
    const now = Date.now();
    
    // Filter out old requests outside window
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ message: 'Too many requests' });
    }
    
    // Add current request and continue
    recentRequests.push(now);
    next();
  };
};
```

---

#### File: `middleware/errorHandler.js` (231 lines)

**errorHandler() Function (Lines 10-119):**
```javascript
const errorHandler = (err, req, res, next) => {
  // 1. Log error details
  console.error('[Error]', { message: err.message, stack: err.stack, ... });
  
  // 2. Set default values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  
  // 3. Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {  // MongoDB duplicate key
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  // 4. Send error response
  res.status(statusCode).json({ success: false, message, code, ... });
};
```

**Custom Error Classes (Lines 159-216):**
```javascript
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends ApiError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

---

### Services

#### File: `services/dockerService.js` (593 lines)

Manages Docker container lifecycle, code execution, and monitoring.

**Constructor (Lines 14-30):**
```javascript
class DockerService {
  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    });
    this.baseImage = process.env.BASE_IMAGE || 'node:18-alpine';
    this.maxMemory = this.parseMemoryLimit(process.env.MAX_MEMORY || '512m');
    this.cpuShares = parseInt(process.env.MAX_CPU_SHARES) || 1024;
  }
}
```

**initializeProject() Method (Lines 54-223):**
```javascript
async initializeProject(userId, projectName, dependencies) {
  // 1. Create project directory on host
  const projectPath = path.join(STORAGE_PATH, userId, projectName);
  await fs.mkdir(projectPath, { recursive: true });
  
  // 2. Create package.json with dependencies
  const packageJson = { name, version, dependencies: { express, ...dependencies } };
  await fs.writeFile(path.join(projectPath, 'package.json'), ...);
  
  // 3. Create initial app.js
  await fs.writeFile(path.join(projectPath, 'app.js'), initialCode);
  
  // 4. Create Docker container
  const container = await this.docker.createContainer({
    Image: this.baseImage,
    name: projectName,
    ExposedPorts: { '3000/tcp': {} },
    PortBindings: { '3000/tcp': [{ HostPort: String(8000 + random) }] },
    Env: ['NODE_ENV=development'],
    Volumes: { '/app': {} },
    WorkingDir: '/app',
    Memory: this.maxMemory,
    CpuShares: this.cpuShares,
    HostConfig: {
      Binds: [`${projectPath}:/app`],  // Mount host dir to container /app
      RestartPolicy: { Name: 'unless-stopped' },
      LogConfig: { Type: 'json-file' }
    },
    Labels: { app: 'mini-replit', userId, projectName }
  });
  
  // 5. Install dependencies
  await this.runCommand(container.id, 'npm install', 60000);
  
  return { containerId: container.id, containerName: projectName, projectPath };
}
```

**submitAndExecuteCode() Method (Lines 234-272):**
```javascript
async submitAndExecuteCode(containerId, code, filename, timeout) {
  // 1. Write code to file in container
  const writeCmd = `cat > ${filename} << 'ENDOFFILE'\n${code}\nENDOFFILE`;
  await this.runCommand(containerId, writeCmd, 5000);
  
  // 2. Execute code with timeout
  const timeoutCmd = `timeout ${Math.ceil(timeout / 1000)} node ${filename}`;
  const output = await this.runCommand(containerId, timeoutCmd, timeout + 5000);
  
  return { success: true, output, executionTime };
}
```

**runCommand() Method (Lines 282-337):**
```javascript
async runCommand(containerId, command, timeout) {
  const container = this.docker.getContainer(containerId);
  
  // 1. Create exec instance
  const exec = await container.exec({
    AttachStdout: true,
    AttachStderr: true,
    Cmd: ['/bin/sh', '-c', command],
    Tty: false
  });
  
  // 2. Start exec
  const stream = await exec.start({ Tty: false });
  
  // 3. Collect output with timeout
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', chunk => { output += chunk.toString(); });
    stream.on('end', () => { resolve(output); });
    
    // Timeout handling
    setTimeout(() => {
      stream.destroy();
      reject(new Error('Command execution timeout'));
    }, timeout);
  });
}
```

---

#### File: `services/codeExecutionService.js` (396 lines)

Handles code execution and submission history.

**executeCodeWithWebSocket() Method (Lines 18-163):**
```javascript
async executeCodeWithWebSocket(projectId, code, ws, token) {
  // 1. Verify JWT token
  const decoded = jwt.verifyToken(token);
  
  // 2. Find project and verify ownership
  const project = await Project.findById(projectId);
  if (project.userId.toString() !== decoded.userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
    return;
  }
  
  // 3. Check code size
  if (code.length > MAX_CODE_SIZE) {
    ws.send(JSON.stringify({ type: 'error', message: 'Code size exceeds limit' }));
    return;
  }
  
  // 4. Ensure container is running
  const containerInfo = await dockerService.inspectContainer(project.containerId);
  if (!containerInfo.running) {
    await dockerService.startContainer(project.containerId);
  }
  
  // 5. Execute code
  const result = await dockerService.submitAndExecuteCode(...);
  
  // 6. Save submission to database
  await project.addSubmission({
    code, language: 'nodejs', output: result.output,
    error: result.error, executionTime, status: result.success ? 'success' : 'error'
  });
  
  // 7. Send output via WebSocket
  ws.send(JSON.stringify({ type: 'output', data: result.output, executionTime }));
  ws.send(JSON.stringify({ type: 'complete', message: 'Execution completed' }));
}
```

**executeCodeHttp() Method (Lines 168-227):**
- Same logic as WebSocket version but returns JSON response
- Used when client prefers REST over WebSocket

**streamContainerLogs() Method (Lines 232-285):**
```javascript
async streamContainerLogs(projectId, ws, token) {
  // 1. Verify token and ownership
  // 2. Get logs from Docker
  const logs = await dockerService.getContainerLogs(project.containerId, 100);
  // 3. Send logs via WebSocket
  ws.send(JSON.stringify({ type: 'logs', data: logs }));
}
```

---

### Models

#### File: `models/User.js` (210 lines)

MongoDB schema for user accounts.

**Schema Definition (Lines 4-65):**
```javascript
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain...']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+...\+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false  // Don't include in queries by default
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

**Password Hashing Middleware (Lines 75-90):**
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Instance Methods:**
```javascript
// Compare password with hashed value
userSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Update last login timestamp
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save();
};
```

**Static Methods:**
```javascript
// Find user by email (case-insensitive)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Check if email exists
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

// Check if username exists
userSchema.statics.usernameExists = async function(username) {
  const user = await this.findOne({ username: username.toLowerCase() });
  return !!user;
};
```

**Indexes (Lines 200-208):**
```javascript
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
```

---

#### File: `models/Project.js` (342 lines)

MongoDB schema for projects with nested submissions.

**Submission Schema (Lines 3-25):**
```javascript
const submissionSchema = new mongoose.Schema({
  code: { type: String, required: true },
  language: { type: String, enum: ['javascript', 'nodejs'], default: 'nodejs' },
  output: String,
  error: String,
  executedAt: { type: Date, default: Date.now },
  executionTime: Number,
  status: { type: String, enum: ['success', 'error', 'timeout'], default: 'success' }
});
```

**Project Schema (Lines 27-138):**
```javascript
const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500, default: '' },
  containerId: { type: String, required: true, unique: true },
  containerName: { type: String, required: true, unique: true },
  projectPath: { type: String, required: true },
  storagePath: { type: String, required: true },
  status: { type: String, enum: ['created', 'running', 'stopped', 'error'], default: 'created' },
  dependencies: { type: Map, of: String },
  environment: { type: Map, of: String },
  submissions: [submissionSchema],
  lastRun: Date,
  totalRuns: { type: Number, default: 0 },
  containerStats: { cpuUsage: Number, memoryUsage: Number, lastUpdated: Date },
  tags: [String],
  isPublic: { type: Boolean, default: false },
  autoDelete: { type: Boolean, default: false }
}, { timestamps: true });
```

**Instance Methods:**
```javascript
// Get project summary for list view
projectSchema.methods.getSummary = function() {
  return { id, name, description, status, containerName, totalRuns, lastRun, createdAt, tags };
};

// Get detailed project info
projectSchema.methods.getDetails = function() {
  return { id, name, description, status, containerId, projectPath, dependencies: Object.fromEntries(this.dependencies), ... };
};

// Add submission and maintain limit
projectSchema.methods.addSubmission = async function(submission) {
  this.submissions.push(submission);
  this.totalRuns += 1;
  this.lastRun = new Date();
  
  // Keep only last 100 submissions
  if (this.submissions.length > 100) {
    this.submissions = this.submissions.slice(-100);
  }
  return this.save();
};

// Get submission statistics
projectSchema.methods.getStats = function() {
  let successful = 0, failed = 0, totalTime = 0;
  this.submissions.forEach(sub => {
    sub.status === 'success' ? successful++ : failed++;
    totalTime += sub.executionTime || 0;
  });
  return { totalSubmissions, successful, failed, avgExecutionTime: totalTime / totalSubmissions };
};
```

**Static Methods:**
```javascript
projectSchema.statics.findByUserId = function(userId, limit, skip) {
  return this.find({ userId }).limit(limit).skip(skip).sort({ createdAt: -1 });
};

projectSchema.statics.countByUserId = function(userId) {
  return this.countDocuments({ userId });
};
```

---

### Utilities

#### File: `utils/jwt.js` (125 lines)

JWT token generation and verification utilities.

```javascript
const jwtUtils = {
  // Generate JWT access token (default 7d expiry)
  generateToken(payload, expiresIn = JWT_EXPIRY) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      issuer: 'mini-replit',
      algorithm: 'HS256'
    });
  },

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  },

  // Decode without verification (for inspection only)
  decodeToken(token) {
    return jwt.decode(token);
  },

  // Generate refresh token (30d expiry)
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d',
      issuer: 'mini-replit',
      algorithm: 'HS256'
    });
  },

  // Verify refresh token
  verifyRefreshToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  },

  // Get token expiration date
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  },

  // Check if token is expired
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? Date.now() >= decoded.exp * 1000 : false;
  }
};
```

**JWT Configuration:**
- Algorithm: HS256 (HMAC with SHA-256)
- Issuer: 'mini-replit'
- Access token expiry: 7 days (configurable)
- Refresh token expiry: 30 days

---

#### File: `utils/validators.js` (161 lines)

Express-validator rules for API input validation.

**signup Validator (Lines 12-52):**
```javascript
signup: [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .custom(async (username) => {
      const exists = await User.usernameExists(username);
      if (exists) throw new Error('Username already taken');
    }),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .custom(async (email) => {
      const exists = await User.emailExists(email);
      if (exists) throw new Error('Email already registered');
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and numbers'),

  body('confirmPassword')
    .notEmpty()
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    })
]
```

**handleValidationErrors() Function (Lines 142-156):**
```javascript
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
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Create new user account |
| POST | `/api/auth/login` | No | Authenticate and get tokens |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Logout user |
| GET | `/api/auth/me` | Yes | Get current user info |
| POST | `/api/auth/change-password` | Yes | Change password |
| DELETE | `/api/auth/account` | Yes | Delete account |

### Project Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/projects` | Yes | Create new project |
| GET | `/api/projects` | Yes | List user's projects |
| GET | `/api/projects/:id` | Yes | Get project details |
| PUT | `/api/projects/:id` | Yes | Update project |
| DELETE | `/api/projects/:id` | Yes | Delete project |
| GET | `/api/projects/:id/stats` | Yes | Get container stats |
| GET | `/api/projects/:id/metrics` | Yes | Get execution metrics |
| POST | `/api/projects/:id/restart` | Yes | Restart container |
| GET | `/api/projects/:id/logs` | Yes | Get container logs |

### Code Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/code/submit` | Yes | Execute code |
| GET | `/api/code/:id/submissions` | Yes | Get submission history |
| GET | `/api/code/:id/submissions/:sid` | Yes | Get submission details |
| DELETE | `/api/code/:id/submissions` | Yes | Clear submissions |
| GET | `/api/code/:id/stats` | Yes | Get submission stats |
| GET | `/api/code/:id/search?q=` | Yes | Search submissions |

### System Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server health check |
| GET | `/docker-health` | No | Docker connectivity |
| GET | `/stats` | No | System statistics |

---

## Setup & Deployment

### Prerequisites
- Node.js v14+
- Docker v20.10+
- MongoDB (or use Docker Compose)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Start MongoDB
docker run -d -p 27017:27017 mongo:5

# 4. Create storage directory
mkdir -p storage/projects

# 5. Start server
npm run dev
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/mini-replit
JWT_SECRET=your-secret-key
DOCKER_SOCKET=/var/run/docker.sock
BASE_IMAGE=node:18-alpine
STORAGE_PATH=./storage/projects
MAX_CODE_SIZE=10485760
CODE_TIMEOUT=30000
MAX_MEMORY=512m
```

---

## Docker Integration

### Container Lifecycle

1. **Create** - User creates project → Docker creates container
2. **Mount** - Project directory bound to `/app` in container
3. **Install** - Dependencies installed via `npm install`
4. **Execute** - User code runs in isolated environment
5. **Cleanup** - Container persists (can be restarted/deleted)

### Resource Limits

| Resource | Default | Configurable |
|----------|---------|--------------|
| Memory | 512MB | MAX_MEMORY env |
| CPU | 1024 shares | MAX_CPU_SHARES env |
| Timeout | 30s | CODE_TIMEOUT env |
| Code Size | 10MB | MAX_CODE_SIZE env |

### Port Mapping

- Container port: 3000
- Host port: 8000-8999 (random per container)
- Allows multiple containers per host

---

## Authentication Flow

```
1. User Registration
   POST /api/auth/signup
   → Validate input
   → Check existing user
   → Hash password (bcrypt)
   → Save to MongoDB
   → Generate JWT + refresh token
   → Return tokens and user data

2. User Login
   POST /api/auth/login
   → Find user by email
   → Compare password
   → Update lastLogin
   → Generate JWT with role
   → Return tokens

3. Authenticated Request
   Authorization: Bearer <token>
   → Extract header
   → Parse "Bearer <token>"
   → Verify JWT signature
   → Check expiration
   → Attach user to request
   → Execute handler
```

---

## Code Execution Flow

```
1. HTTP Submission
   POST /api/code/submit
   → Authenticate user
   → Verify project ownership
   → Check code size
   → Ensure container running
   → Execute code via dockerService
   → Save submission to MongoDB
   → Return result

2. WebSocket Execution
   { type: 'execute_code', projectId, code, token }
   → Verify token
   → Verify ownership
   → Execute code
   → Stream output via ws.send()
   → Save submission
   → Send completion message
```

---

## Security Features

1. **JWT Authentication** - Stateless token-based auth
2. **Password Hashing** - bcrypt with salt
3. **Input Validation** - express-validator on all inputs
4. **Authorization** - Users can only access their projects
5. **Code Isolation** - Each project in separate container
6. **Resource Limits** - Memory, CPU, timeout constraints
7. **Rate Limiting** - Built-in rate limiting middleware

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NO_AUTH_HEADER | 401 | No Authorization header |
| INVALID_AUTH_FORMAT | 401 | Invalid Bearer format |
| INVALID_TOKEN | 401 | JWT verification failed |
| TOKEN_EXPIRED | 401 | JWT has expired |
| INSUFFICIENT_PRIVILEGES | 403 | Admin access required |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| DUPLICATE_ENTRY | 409 | Duplicate email/username |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| DOCKER_ERROR | 503 | Docker service error |

---

*Documentation generated for Mini Replit - DockerNotes_Api*

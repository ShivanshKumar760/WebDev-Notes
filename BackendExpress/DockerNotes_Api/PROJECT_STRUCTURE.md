# Mini Replit - Complete Project Structure

```
mini-replit/
├── README.md                           # Main documentation
├── SETUP.md                            # Setup and deployment guide
├── PROJECT_STRUCTURE.md                # This file
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Locked dependencies
├── docker-compose.yml                  # Multi-container orchestration
├── Dockerfile                          # Container image definition
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
│
├── src/                                # Source code
│   ├── server.js                       # Express app & WebSocket setup
│   │
│   ├── config/                         # Configuration files
│   │   ├── database.js                 # DB connection setup
│   │   └── docker.js                   # Docker client config
│   │
│   ├── models/                         # Database models
│   │   ├── User.js                     # User schema & methods
│   │   └── Project.js                  # Project schema & methods
│   │
│   ├── controllers/                    # Route handlers
│   │   ├── authController.js           # Auth logic (signup, login, etc)
│   │   ├── projectController.js        # Project CRUD operations
│   │   └── codeController.js           # Code execution handling
│   │
│   ├── services/                       # Business logic
│   │   ├── dockerService.js            # Docker container management
│   │   └── codeExecutionService.js     # Code execution & streaming
│   │
│   ├── routes/                         # API routes
│   │   ├── auth.js                     # /api/auth routes
│   │   ├── projects.js                 # /api/projects routes
│   │   └── code.js                     # /api/code routes
│   │
│   ├── middleware/                     # Express middleware
│   │   ├── auth.js                     # JWT authentication
│   │   └── errorHandler.js             # Error handling
│   │
│   └── utils/                          # Utility functions
│       ├── jwt.js                      # JWT token operations
│       └── validators.js               # Input validation rules
│
├── templates/                          # Client & template files
│   ├── client.html                     # Web UI (single page)
│   ├── base-package.json               # Default npm packages
│   └── sample-code.js                  # Example code
│
├── storage/                            # File storage
│   ├── projects/                       # User project directories
│   │   └── {userId}/
│   │       └── {projectName}/
│   │           ├── package.json        # Project dependencies
│   │           ├── app.js              # Main application file
│   │           ├── execution.js        # Executed code
│   │           └── node_modules/       # Installed dependencies
│   │
│   └── .gitkeep                        # Keep empty directory in git
│
├── logs/                               # Application logs
│   └── app.log                         # Server logs
│
└── tests/                              # Test files (optional)
    ├── integration.test.js             # Integration tests
    └── unit.test.js                    # Unit tests
```

## File Descriptions

### Core Application Files

#### src/server.js
- Main Express.js server setup
- WebSocket server initialization
- Database connection
- Route registration
- Error handling
- Graceful shutdown handling

#### src/models/User.js
- MongoDB User schema
- Password hashing middleware
- Instance methods: comparePassword(), toJSON()
- Static methods: findByEmail(), emailExists()
- Indexes for performance

#### src/models/Project.js
- MongoDB Project schema with submissions
- Submission schema (nested)
- Instance methods: getSummary(), getDetails(), addSubmission()
- Static methods: findByUserId(), findRunningByUser()
- TTL index for optional auto-deletion

### Controllers (Business Logic)

#### src/controllers/authController.js
Methods:
- signup() - Create new user account
- login() - Authenticate user
- refreshToken() - Get new access token
- logout() - Log out user
- getCurrentUser() - Get authenticated user info
- changePassword() - Update user password
- deleteAccount() - Delete user account

#### src/controllers/projectController.js
Methods:
- createProject() - Initialize Docker container
- getProjects() - List user projects with pagination
- getProject() - Get project details
- updateProject() - Modify project info
- deleteProject() - Remove project & container
- getProjectStats() - Get container resource usage
- getProjectMetrics() - Get execution statistics
- restartProject() - Restart container
- getProjectLogs() - Get container logs

#### src/controllers/codeController.js
Methods:
- submitCode() - Execute code via HTTP
- getSubmissions() - Get submission history
- getSubmissionDetails() - Get specific submission
- clearSubmissions() - Clear history
- getSubmissionStats() - Get statistics
- searchSubmissions() - Search by code content

### Services (Integration Layer)

#### src/services/dockerService.js
Key Methods:
- initializeProject() - Create & setup container
- submitAndExecuteCode() - Execute code with timeout
- runCommand() - Run shell command in container
- startContainer() - Start stopped container
- stopContainer() - Stop running container
- removeContainer() - Delete container
- getContainerStats() - Get CPU, memory, network usage
- getContainerLogs() - Retrieve container logs
- inspectContainer() - Get container details
- healthCheck() - Verify Docker connectivity

#### src/services/codeExecutionService.js
Methods:
- executeCodeWithWebSocket() - Execute with real-time output
- executeCodeHttp() - Execute via HTTP
- streamContainerLogs() - Stream logs via WebSocket
- getSubmissionHistory() - Get user submissions
- getSubmissionDetails() - Get specific submission
- clearSubmissionHistory() - Clear submissions

### Routes & Endpoints

#### Authentication Routes (/api/auth)
```
POST   /signup           - Create account
POST   /login            - Authenticate user
POST   /refresh          - Refresh token
POST   /logout           - Logout user
GET    /me               - Get current user
POST   /change-password  - Change password
DELETE /account          - Delete account
```

#### Project Routes (/api/projects)
```
POST   /                 - Create project
GET    /                 - List projects
GET    /:projectId       - Get project details
PUT    /:projectId       - Update project
DELETE /:projectId       - Delete project
GET    /:projectId/stats - Get container stats
GET    /:projectId/metrics - Get execution metrics
POST   /:projectId/restart - Restart container
GET    /:projectId/logs  - Get container logs
```

#### Code Routes (/api/code)
```
POST   /submit                           - Execute code
GET    /:projectId/submissions           - Get submission history
GET    /:projectId/submissions/:id       - Get submission details
DELETE /:projectId/submissions           - Clear submissions
GET    /:projectId/stats                 - Get submission statistics
GET    /:projectId/search?q=query        - Search submissions
```

#### System Routes
```
GET    /health           - Server health
GET    /docker-health    - Docker connectivity
GET    /stats            - System statistics
```

### Middleware

#### src/middleware/auth.js
- authMiddleware() - Verify JWT token
- optionalAuthMiddleware() - Optional authentication
- adminAuthMiddleware() - Require admin role
- tokenRefreshCheckMiddleware() - Check token expiration
- createRateLimitMiddleware() - Rate limiting

#### src/middleware/errorHandler.js
- errorHandler() - Global error handler
- asyncHandler() - Wrap async route handlers
- notFoundHandler() - 404 handler
- requestIdMiddleware() - Add request tracking ID
- Custom error classes (ApiError, ValidationError, etc.)

### Utilities

#### src/utils/jwt.js
Functions:
- generateToken() - Create JWT
- verifyToken() - Validate JWT
- decodeToken() - Decode without verification
- generateRefreshToken() - Create long-lived token
- isTokenExpired() - Check expiration

#### src/utils/validators.js
Validation Rules:
- signup - Validate registration input
- login - Validate login input
- createProject - Validate project data
- submitCode - Validate code submission
- projectId - Validate project ID
- pagination - Validate pagination params

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001

# Database
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://...
POSTGRESQL_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# Docker
DOCKER_SOCKET=/var/run/docker.sock
BASE_IMAGE=node:18-alpine
STORAGE_PATH=./storage/projects
MAX_CODE_SIZE=10485760
CODE_TIMEOUT=30000
MAX_MEMORY=512m
MAX_CPU_SHARES=1024
```

## Data Flow

### User Registration Flow
```
User Input (signup form)
    ↓
POST /api/auth/signup
    ↓
authController.signup()
    ↓
User.create() → MongoDB
    ↓
jwt.generateToken()
    ↓
Response with token
```

### Code Execution Flow
```
User Code Submission
    ↓
POST /api/code/submit or WebSocket
    ↓
codeController.submitCode()
    ↓
codeExecutionService.executeCodeHttp()
    ↓
dockerService.submitAndExecuteCode()
    ↓
Create exec instance in container
    ↓
Write code to file
    ↓
Execute with timeout
    ↓
Capture output/error
    ↓
Save to Project.submissions
    ↓
Response with result
```

### Project Initialization Flow
```
Create Project Request
    ↓
projectController.createProject()
    ↓
dockerService.initializeProject()
    ↓
Create project directory on host
    ↓
Write package.json & app.js
    ↓
Create Docker container
    ↓
Mount volume (host dir ↔ container /app)
    ↓
Run npm install in container
    ↓
Save project to database
    ↓
Return project details
```

## Storage Structure

```
storage/projects/
└── {userId}/
    └── {projectName}/
        ├── package.json
        ├── app.js
        ├── execution.js (generated per execution)
        ├── node_modules/ (inside container)
        └── ... (other project files)
```

## Docker Integration

### Container Lifecycle
1. **Create** - Initialize with Dockerfile
2. **Mount** - Bind project directory to /app
3. **Install** - npm install dependencies
4. **Run** - Execute user code
5. **Cleanup** - Optional: stop/remove container

### Resource Limits
- Memory: 512MB default (configurable)
- CPU Shares: 1024 (configurable)
- Execution Timeout: 30s default
- Code Size Limit: 10MB default

## Security Features

1. **Authentication** - JWT-based user authentication
2. **Authorization** - User can only access their projects
3. **Input Validation** - Express-validator for all inputs
4. **Code Isolation** - Each execution in separate container
5. **Resource Limits** - Memory and CPU constraints
6. **Timeout Protection** - Prevent infinite loops
7. **Password Hashing** - bcryptjs with salt
8. **Error Handling** - No sensitive info in errors

## Performance Considerations

1. **Database Indexing** - Indexes on frequently queried fields
2. **Pagination** - Limit results to prevent memory issues
3. **Connection Pooling** - MongoDB connection pool
4. **Container Reuse** - Avoid recreating containers
5. **Log Rotation** - Prevent log files from growing too large
6. **Caching** - Can be added for frequently accessed data

## Testing Strategy

### Unit Tests
- Model validation
- Utility functions
- Error handling

### Integration Tests
- API endpoints
- Docker operations
- Database interactions

### Load Testing
- Concurrent submissions
- WebSocket connections
- Container creation


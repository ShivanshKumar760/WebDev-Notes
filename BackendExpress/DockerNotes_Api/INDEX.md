# Complete Learning Material: Node.js, Dockerode & Mini Replit 🚀

## 📚 What You'll Find Here

This is a **comprehensive learning package** containing:

1. ✅ **Detailed Learning Material (85KB+)** - README.md
2. ✅ **Complete Mini Replit Implementation** - Full-stack application
3. ✅ **Setup & Deployment Guide** - Production-ready instructions
4. ✅ **Project Structure Documentation** - Complete file organization

---

## 📖 Main Learning Materials

### 1. **README.md** (Main Documentation)
**~85KB of comprehensive learning material covering:**

#### Part 1: Node.js Fundamentals
- Event loop architecture & async programming
- Callbacks, Promises, Async/Await
- Module system (CommonJS & ES Modules)
- Stream API for handling large data
- How Node.js works behind the scenes

#### Part 2: Docker Basics
- Containerization concepts
- Dockerfile anatomy & instructions
- Image layers & caching
- Docker commands reference
- Container networking basics
- How Docker works internally

#### Part 3: Docker Networking
- Network types (Bridge, Host, Overlay, None)
- DNS & service discovery
- Port mapping
- Container communication
- Network architecture diagrams

#### Part 4: Dockerode API Complete Guide
- Connection setup (Socket, HTTP, TCP with TLS)
- Image operations (Pull, Build, Inspect, Remove)
- Container operations (Create, Run, Start, Stop, Remove)
- Execute commands in containers
- Get logs and stats
- Network and volume management
- Real-world examples for each method

#### Part 5: Mini Replit Project Overview
- Project architecture
- Tech stack explanation
- Feature list
- How everything works together

#### Part 6: Complete Implementation Code
- All source code with detailed comments
- Database models (User, Project)
- Services (Docker, Code Execution)
- Controllers (Auth, Projects, Code)
- Routes (Auth, Projects, Code)
- Middleware (Auth, Error Handling)
- Utilities (JWT, Validators)

---

## 🛠️ Complete Mini Replit Implementation

### Project Structure
```
nodejs-dockerode-learning/
├── README.md                    # Main learning material (85KB+)
├── SETUP.md                     # Setup & deployment guide
├── PROJECT_STRUCTURE.md         # Detailed structure documentation
├── package.json                 # Dependencies
├── docker-compose.yml           # Multi-container setup
├── Dockerfile                   # Container image
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
│
├── src/                         # Application code
│   ├── server.js               # Express + WebSocket setup
│   ├── models/                 # Database schemas
│   │   ├── User.js             # User model
│   │   └── Project.js          # Project model
│   ├── controllers/            # Route handlers
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   └── codeController.js
│   ├── services/               # Business logic
│   │   ├── dockerService.js    # Docker integration
│   │   └── codeExecutionService.js
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   ├── projects.js
│   │   └── code.js
│   ├── middleware/             # Express middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   └── utils/                  # Helper functions
│       ├── jwt.js
│       └── validators.js
│
├── storage/                     # File storage
│   └── projects/               # User projects
├── logs/                        # Application logs
└── templates/                   # Client files
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 14+
- Docker & Docker Compose
- 4GB+ RAM
- 10GB+ disk space

### 2. Installation
```bash
cd nodejs-dockerode-learning
npm install
cp .env.example .env
```

### 3. Run with Docker Compose
```bash
docker-compose up -d
```

### 4. Access
- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **Health**: http://localhost:3000/health

---

## 📚 Documentation Files

### 1. **README.md** (Main Learning Material)
- **Size**: ~85KB
- **Contains**: Node.js, Docker, Dockerode fundamentals + implementation
- **Read Time**: 2-3 hours
- **Best For**: Understanding concepts and implementation details

### 2. **SETUP.md** (Deployment Guide)
- **Size**: ~12KB
- **Contains**: Installation, configuration, testing, troubleshooting
- **Read Time**: 30-45 minutes
- **Best For**: Getting the project running locally or in production

### 3. **PROJECT_STRUCTURE.md** (Architecture Documentation)
- **Size**: ~8KB
- **Contains**: File organization, data flows, architecture
- **Read Time**: 20-30 minutes
- **Best For**: Understanding project organization

### 4. **This File (INDEX.md)** (Quick Reference)
- **Size**: ~5KB
- **Contains**: Overview and file organization
- **Read Time**: 5-10 minutes
- **Best For**: Navigating the learning material

---

## 🎯 API Endpoints

### Authentication
```
POST   /api/auth/signup           Create account
POST   /api/auth/login            Login user
POST   /api/auth/refresh          Refresh token
POST   /api/auth/logout           Logout user
GET    /api/auth/me               Get current user
POST   /api/auth/change-password  Change password
DELETE /api/auth/account          Delete account
```

### Projects
```
POST   /api/projects              Create project
GET    /api/projects              List projects
GET    /api/projects/:id          Get project details
PUT    /api/projects/:id          Update project
DELETE /api/projects/:id          Delete project
GET    /api/projects/:id/stats    Get container stats
GET    /api/projects/:id/metrics  Get metrics
POST   /api/projects/:id/restart  Restart container
GET    /api/projects/:id/logs     Get container logs
```

### Code Execution
```
POST   /api/code/submit                   Execute code
GET    /api/code/:projectId/submissions   Get submission history
GET    /api/code/:projectId/stats         Get statistics
```

### System
```
GET    /health         Server health check
GET    /docker-health  Docker connectivity check
GET    /stats          System statistics
```

---

## 🔧 Key Features Explained

### 1. Docker Integration
- **dockerService.js**: Manages container lifecycle
- **Functions**: Create, execute, monitor, cleanup containers
- **Behind the Scenes**: Docker API communication via Dockerode

### 2. Code Execution
- **Isolated Environments**: Each project in separate container
- **Real-time Output**: WebSocket streaming
- **Timeout Protection**: Prevents infinite loops
- **Resource Limits**: Memory & CPU constraints

### 3. User Authentication
- **JWT-based**: Stateless authentication
- **Password Security**: bcrypt hashing
- **Token Refresh**: Long-lived refresh tokens
- **Role Management**: User & admin roles

### 4. Project Management
- **Database**: MongoDB with Mongoose
- **File Storage**: Host volume mounting
- **Metadata**: Project info, stats, submissions
- **History**: Tracks all code submissions

---

## 📝 Learning Path

### Beginner (Read in order)
1. README.md → Node.js Fundamentals
2. README.md → Docker Basics
3. SETUP.md → Installation & Running
4. Explore the API endpoints using curl

### Intermediate
1. README.md → Dockerode API Complete Guide
2. README.md → Docker Networking
3. PROJECT_STRUCTURE.md → File Organization
4. Review dockerService.js implementation

### Advanced
1. Read all source code files
2. Modify and extend functionality
3. Deploy to production using SETUP.md
4. Implement additional features

---

## 🧪 Testing the API

### 1. Quick Test Script
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Pass123","confirmPassword":"Pass123"}'

# Create Project
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}'

# Execute Code
curl -X POST http://localhost:3000/api/code/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"YOUR_PROJECT_ID","code":"console.log(\"Hello\")"}'
```

### 2. WebSocket Testing
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'execute_code',
    projectId: 'YOUR_PROJECT_ID',
    code: 'console.log("Hello WebSocket");',
    token: 'YOUR_TOKEN'
  }));
};
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 🐛 Troubleshooting

### Docker Issues
- **Connection Failed**: Ensure Docker daemon is running
- **Permission Denied**: Add user to docker group: `sudo usermod -aG docker $USER`
- **Out of Space**: Clean up: `docker system prune -a`

### Database Issues
- **MongoDB Won't Connect**: Check connection string in .env
- **Database Lock**: Restart MongoDB container

### Port Issues
- **Port Already in Use**: Change PORT in .env
- **WebSocket Issues**: Ensure port 3001 is available

For more details, see SETUP.md → Troubleshooting section

---

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML/CSS/JS | Web interface |
| **Backend** | Express.js | REST API |
| **Real-time** | WebSocket (ws) | Live output streaming |
| **Container** | Docker | Code isolation |
| **Database** | MongoDB | User & project data |
| **Auth** | JWT | Token-based authentication |
| **Validation** | Express-validator | Input validation |

---

## 🎓 Learning Outcomes

After studying this material, you'll understand:

✅ **Node.js Concepts**
- Event loop and async programming
- Streams and module system
- How Node.js handles I/O

✅ **Docker**
- Container architecture
- Image layers and caching
- Networking and storage
- How Docker daemon works

✅ **Dockerode API**
- Programmatic Docker control
- Container management
- Real-time monitoring

✅ **Full-Stack Development**
- REST API design
- Real-time communication (WebSocket)
- Database integration
- Authentication & authorization

✅ **Production Deployment**
- Docker Compose setup
- SSL/TLS configuration
- Monitoring and logging
- Scaling considerations

---

## 📖 Document Sizes & Read Times

| Document | Size | Read Time | Content |
|----------|------|-----------|---------|
| README.md | 85KB | 2-3 hours | Complete learning + code |
| SETUP.md | 12KB | 30-45 min | Setup & deployment |
| PROJECT_STRUCTURE.md | 8KB | 20-30 min | Architecture details |
| INDEX.md (this) | 5KB | 5-10 min | Overview & navigation |

**Total Learning Material**: ~110KB

---

## 🔗 File References

### Source Code Organization
- **Models**: Define data structure (User, Project)
- **Controllers**: Handle API requests and responses
- **Services**: Business logic (Docker, code execution)
- **Routes**: URL endpoints and HTTP methods
- **Middleware**: Request/response processing
- **Utils**: Helper functions

### Configuration Files
- **package.json**: Dependencies and npm scripts
- **docker-compose.yml**: Multi-container orchestration
- **Dockerfile**: Container image definition
- **.env.example**: Environment variables template

---

## 💡 Key Insights

### Docker Behind the Scenes
1. Images are read-only templates with layers
2. Containers are running instances with writable layer on top
3. Volumes persist data outside container lifecycle
4. Networks enable inter-container communication

### Dockerode Magic
1. Uses Docker API (not shell commands)
2. Streams for large data (logs, output)
3. Async operations for non-blocking I/O
4. Error handling for reliability

### Code Execution Strategy
1. Create isolated container per project
2. Mount host directory as volume
3. Write code to file in container
4. Execute with timeout protection
5. Capture and stream output
6. Store submission history

---

## 🚀 Next Steps

1. **Run the application**: Follow SETUP.md
2. **Test the API**: Use provided curl examples
3. **Study the code**: Start with README.md fundamentals
4. **Modify & extend**: Add new features
5. **Deploy**: Use SETUP.md production guide

---

## 📞 Support & Help

### Documentation
- **README.md** - Comprehensive learning material
- **SETUP.md** - Setup & troubleshooting
- **PROJECT_STRUCTURE.md** - Architecture details

### Code References
- Check comments in source files
- Review inline examples
- Look at test cases

### Common Issues
- See SETUP.md → Troubleshooting
- Check API responses for error messages
- Review logs for debugging

---

## 📄 License

MIT License - Free to use, modify, and distribute

---

## ✨ Summary

This is a **complete, production-ready** mini Replit implementation with:

- ✅ **85KB+ learning material** on Node.js, Docker & Dockerode
- ✅ **Full-stack application** with authentication
- ✅ **Docker integration** for code isolation
- ✅ **Real-time WebSocket** for output streaming
- ✅ **Comprehensive documentation** for setup & deployment
- ✅ **Professional code structure** following best practices

**Everything you need to learn and build with Node.js and Docker!**

---

**Happy Learning! 🎉**

For detailed explanations, see **README.md**  
For setup instructions, see **SETUP.md**  
For architecture details, see **PROJECT_STRUCTURE.md**

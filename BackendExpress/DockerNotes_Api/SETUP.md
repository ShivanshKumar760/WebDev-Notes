# Mini Replit - Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [API Testing](#api-testing)
5. [Troubleshooting](#troubleshooting)
6. [Production Deployment](#production-deployment)

---

## Prerequisites

### System Requirements
- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher
- **Docker**: 20.10 or higher
- **Docker Compose**: 1.29 or higher
- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **RAM**: Minimum 4GB
- **Disk Space**: Minimum 10GB for images and containers

### Verify Installations
```bash
# Check Node.js
node --version
npm --version

# Check Docker
docker --version
docker-compose --version

# Verify Docker daemon is running
docker ps
```

---

## Local Development Setup

### 1. Clone or Download Project
```bash
git clone <repository-url>
cd mini-replit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Key environment variables to configure:
```env
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
MONGODB_URL=mongodb://root:rootpassword@localhost:27017/mini-replit?authSource=admin
```

### 4. Start MongoDB (if using local installation)
```bash
# Using Docker
docker run -d \
  --name mini-replit-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=rootpassword \
  -p 27017:27017 \
  mongo:5

# Or using MongoDB locally (macOS with Homebrew)
brew services start mongodb-community

# Or using MongoDB locally (Ubuntu)
sudo systemctl start mongod
```

### 5. Create Required Directories
```bash
# Create storage directory for projects
mkdir -p storage/projects
mkdir -p logs

# Set permissions
chmod 755 storage/projects
```

### 6. Start Development Server
```bash
# Option 1: Using nodemon (auto-restart on changes)
npm run dev

# Option 2: Direct Node
npm start
```

### 7. Verify Server is Running
```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","service":"mini-replit","timestamp":"...","uptime":...}

# Check Docker health
curl http://localhost:3000/docker-health

# Expected response:
# {"connected":true,"message":"Docker daemon is reachable","timestamp":"..."}
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

#### 1. Build Images
```bash
docker-compose build
```

#### 2. Start Services
```bash
# Start in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Watch logs
docker-compose logs -f app
```

#### 3. Verify Services
```bash
# Check running containers
docker-compose ps

# Check MongoDB connection
docker-compose exec mongo mongosh -u root -p rootpassword

# Check app logs
docker-compose logs app
```

#### 4. Stop Services
```bash
# Stop containers but keep data
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove everything including volumes (careful!)
docker-compose down -v
```

### Manual Docker Build (Alternative)

#### 1. Build Image
```bash
docker build -t mini-replit:1.0 .
```

#### 2. Run Container
```bash
docker run -d \
  --name mini-replit-app \
  -p 3000:3000 \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_TYPE=mongodb \
  -e MONGODB_URL=mongodb://mongo:27017/mini-replit \
  -e JWT_SECRET=your-secret-key \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ./storage/projects:/app/storage/projects \
  --network app-network \
  mini-replit:1.0
```

---

## API Testing

### 1. User Registration (Signup)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "confirmPassword": "Password123"
  }'

# Response:
# {
#   "success": true,
#   "message": "Account created successfully",
#   "token": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": { "id": "...", "username": "testuser", ... }
# }
```

Save the token for subsequent requests:
```bash
export TOKEN="eyJhbGc..."
```

### 2. User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### 3. Create Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My First Project",
    "description": "Testing Mini Replit",
    "dependencies": {
      "express": "^4.18.2",
      "axios": "^1.0.0"
    }
  }'

# Response includes:
# {
#   "success": true,
#   "project": {
#     "id": "project-id",
#     "name": "My First Project",
#     "status": "running",
#     "containerId": "..."
#   }
# }
```

Save the project ID:
```bash
export PROJECT_ID="project-id"
```

### 4. Submit Code (HTTP)
```bash
curl -X POST http://localhost:3000/api/code/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "code": "console.log(\"Hello World!\");"
  }'

# Response:
# {
#   "success": true,
#   "result": {
#     "output": "Hello World!",
#     "error": null,
#     "executionTime": 150
#   }
# }
```

### 5. Get Projects
```bash
curl -X GET "http://localhost:3000/api/projects?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get Project Details
```bash
curl -X GET http://localhost:3000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Get Submissions
```bash
curl -X GET http://localhost:3000/api/code/$PROJECT_ID/submissions \
  -H "Authorization: Bearer $TOKEN"
```

### 8. WebSocket Code Execution
```javascript
// In browser console or Node.js
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'execute_code',
    projectId: 'your-project-id',
    code: 'console.log("Hello from WebSocket!");',
    token: 'your-jwt-token'
  }));
};

ws.onmessage = (event) => {
  console.log('Message:', JSON.parse(event.data));
};
```

---

## Troubleshooting

### Docker-related Issues

#### Docker daemon not running
```bash
# Start Docker daemon
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Windows (Docker Desktop)
# Start Docker Desktop application
```

#### Cannot connect to Docker socket
```bash
# Check socket permissions
ls -la /var/run/docker.sock

# Fix permissions
sudo chmod 666 /var/run/docker.sock

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
```

#### Out of disk space
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove specific images
docker rmi image-id

# Check disk usage
docker system df
```

### Database Issues

#### MongoDB connection failed
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs <mongo-container-id>

# Test connection
docker exec <mongo-container-id> mongosh -u root -p rootpassword

# Reset MongoDB
docker-compose down -v
docker-compose up -d mongo
```

#### Cannot write to storage directory
```bash
# Check directory permissions
ls -la storage/projects/

# Fix permissions
chmod 755 storage/projects
chmod 644 storage/projects/*
```

### Application Issues

#### Port already in use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### Module not found errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Token expiration errors
```bash
# Get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

---

## Production Deployment

### 1. Environment Configuration
```bash
# Update .env for production
NODE_ENV=production
JWT_SECRET=<use-strong-random-key>
MONGODB_URL=<production-mongodb-url>
CORS_ORIGIN=https://yourdomain.com
```

Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      NODE_ENV: production
    env_file: .env
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./storage/projects:/app/storage/projects
    depends_on:
      - mongo
    networks:
      - app-network

  mongo:
    image: mongo:5
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

volumes:
  mongo-data:

networks:
  app-network:
```

### 3. Reverse Proxy (Nginx)
```nginx
upstream mini_replit {
  server localhost:3000;
}

server {
  listen 80;
  server_name yourdomain.com;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
  limit_req zone=api burst=200 nodelay;

  location / {
    proxy_pass http://mini_replit;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # WebSocket
  location /ws {
    proxy_pass http://mini_replit;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
  }
}
```

### 4. SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 5. Monitoring & Logging

```bash
# View application logs
docker-compose logs -f app

# Setup log rotation
cat > /etc/logrotate.d/mini-replit << EOF
/app/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  missingok
}
EOF
```

### 6. Backup Strategy
```bash
# Backup MongoDB
docker exec mongo-container mongodump --out /backup

# Backup storage
tar -czf storage-backup-$(date +%Y%m%d).tar.gz storage/projects/

# Backup .env
cp .env .env.backup
```

### 7. Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Setup rate limiting
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Implement backups
- [ ] Setup uptime monitoring
- [ ] Configure auto-scaling (if on cloud)

---

## Performance Tuning

### Node.js Optimization
```bash
# Increase file descriptors
ulimit -n 65536

# Enable clustering for multi-core
NODE_CLUSTER_ENABLED=true npm start
```

### MongoDB Optimization
```javascript
// Create indexes
db.users.createIndex({ email: 1 });
db.projects.createIndex({ userId: 1, createdAt: -1 });
```

### Docker Resource Limits
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Support & Resources

- **Documentation**: See README.md in project root
- **API Docs**: Accessible at `/api-docs` (if Swagger configured)
- **Issues**: Report bugs on GitHub
- **Community**: Join our Discord/Slack

---

## License

MIT License - See LICENSE file for details

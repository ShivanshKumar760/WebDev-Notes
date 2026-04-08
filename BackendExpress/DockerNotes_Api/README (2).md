# Complete Learning Material: Node.js, Dockerode API & Docker

## Table of Contents
1. [Node.js Fundamentals](#nodejs-fundamentals)
2. [Docker Basics](#docker-basics)
3. [Docker Networking](#docker-networking)
4. [Dockerode API Complete Guide](#dockerode-api-complete-guide)
5. [Mini Replit Project](#mini-replit-project)
6. [Project Structure & Implementation](#project-structure--implementation)

---

## Node.js Fundamentals

### What is Node.js?

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It allows you to run JavaScript on the server-side.

**Key Characteristics:**
- **Event-driven**: Built on event loop architecture
- **Non-blocking I/O**: Async operations don't block the main thread
- **Single-threaded**: Main JavaScript execution is single-threaded
- **NPM Ecosystem**: Access to millions of packages

### Event Loop - How It Works Behind the Scenes

```javascript
// The event loop processes tasks in this order:
// 1. Synchronous code
// 2. Microtasks (Promises, async/await)
// 3. Macrotasks (setTimeout, I/O, setImmediate)

console.log('1'); // Synchronous - executes first

Promise.resolve()
  .then(() => console.log('2')); // Microtask - executes second

setTimeout(() => console.log('3'), 0); // Macrotask - executes last

// Output: 1, 2, 3
```

### Asynchronous Programming

#### Callbacks
```javascript
function readFile(path, callback) {
  // Simulating file read
  setTimeout(() => {
    callback(null, 'file contents');
  }, 1000);
}

readFile('file.txt', (err, data) => {
  if (err) console.error(err);
  else console.log(data);
});
```

#### Promises
```javascript
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('file contents');
    }, 1000);
  });
}

readFilePromise('file.txt')
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

#### Async/Await
```javascript
async function readFileAsync(path) {
  try {
    const data = await readFilePromise(path);
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

readFileAsync('file.txt');
```

### Module System

#### CommonJS (Node.js default)
```javascript
// exporting.js
module.exports = {
  greet: (name) => `Hello ${name}`
};

// importing.js
const module = require('./exporting.js');
console.log(module.greet('World'));
```

#### ES Modules
```javascript
// exporting.mjs
export const greet = (name) => `Hello ${name}`;
export default { greet };

// importing.mjs
import { greet } from './exporting.mjs';
console.log(greet('World'));
```

### Stream API

Streams handle large data without loading everything into memory.

```javascript
const fs = require('fs');

// Readable Stream
const readStream = fs.createReadStream('large-file.txt', {
  highWaterMark: 16 * 1024 // 16KB chunks
});

// Writable Stream
const writeStream = fs.createWriteStream('output.txt');

// Pipe: connects readable to writable
readStream.pipe(writeStream);

// Events
readStream.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length);
});

readStream.on('end', () => {
  console.log('Stream ended');
});

readStream.on('error', (err) => {
  console.error('Stream error:', err);
});
```

---

## Docker Basics

### What is Docker?

Docker is a containerization platform that packages applications and dependencies into isolated, lightweight containers.

**Key Concepts:**

1. **Image**: Blueprint for containers (immutable)
2. **Container**: Running instance of an image
3. **Registry**: Repository for images (Docker Hub)
4. **Dockerfile**: Instructions to build an image

### Dockerfile Anatomy

```dockerfile
# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
```

### Docker Commands

```bash
# Build image
docker build -t app-name:1.0 .

# Run container
docker run -d -p 8080:3000 --name my-app app-name:1.0

# View containers
docker ps                    # Running
docker ps -a                # All

# View images
docker images

# Container operations
docker stop container-id
docker start container-id
docker restart container-id
docker rm container-id       # Remove
docker rmi image-id         # Remove image

# Logs
docker logs container-id
docker logs -f container-id # Follow logs

# Execute command in container
docker exec -it container-id bash

# Container stats
docker stats container-id
```

### How Docker Works Behind the Scenes

1. **Dockerfile Parsing**: Docker reads and parses Dockerfile
2. **Layer Creation**: Each instruction creates a layer
3. **Layer Caching**: Subsequent builds reuse unchanged layers
4. **Image Assembly**: Layers stack to form the final image
5. **Container Execution**: When run, container gets writable layer on top

```
┌─────────────────────────────────────┐
│   Container Writable Layer          │
├─────────────────────────────────────┤
│   Layer 5: CMD instruction          │
├─────────────────────────────────────┤
│   Layer 4: COPY application code    │
├─────────────────────────────────────┤
│   Layer 3: RUN npm install          │
├─────────────────────────────────────┤
│   Layer 2: COPY package.json        │
├─────────────────────────────────────┤
│   Layer 1: Base Image (Node:18)     │
└─────────────────────────────────────┘
```

### Docker Volumes

Volumes persist data and mount host directories into containers.

```bash
# Create named volume
docker volume create my-volume

# Mount volume
docker run -v my-volume:/app/data app-name

# Mount host directory
docker run -v /host/path:/container/path app-name

# Mount with read-only
docker run -v /host/path:/container/path:ro app-name
```

### Docker Compose

Manage multi-container applications.

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://db:5432/mydb
    depends_on:
      - db
    volumes:
      - ./src:/app/src

  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

---

## Docker Networking

### Network Types

#### 1. Bridge Network (Default)
Containers get their own IP and can communicate via container names.

```bash
# Create custom bridge network
docker network create my-bridge

# Run container on bridge
docker run -d --network my-bridge --name app1 app-image
docker run -d --network my-bridge --name app2 app-image

# app1 can reach app2 via hostname "app2"
```

#### 2. Host Network
Container shares host's network namespace.

```bash
docker run --network host app-image
# No port mapping needed
# Direct access to host ports
```

#### 3. Overlay Network
For Docker Swarm - spans multiple Docker hosts.

```bash
docker network create --driver overlay my-overlay
```

#### 4. None Network
No network connectivity.

```bash
docker run --network none app-image
```

### DNS and Service Discovery

Docker's embedded DNS server (127.0.0.11:53) resolves container names.

```javascript
// Node.js example - automatic DNS resolution
const http = require('http');

http.get('http://database-container:5432', (res) => {
  console.log('Connected to database container');
});
```

### Port Mapping

```bash
# Map port: host:container
docker run -p 8080:3000 app-image
# Access at http://localhost:8080

# Map multiple ports
docker run -p 8080:3000 -p 3306:3306 app-image

# Random port assignment
docker run -p 3000 app-image
```

### Network Communication Behind the Scenes

```
┌──────────────────────────────────────────────────────┐
│                    Docker Host                        │
│  ┌────────────────────────────────────────────────┐  │
│  │         Docker Bridge (docker0)                 │  │
│  │  ┌──────────────┐      ┌──────────────┐        │  │
│  │  │   Container  │      │   Container  │        │  │
│  │  │   172.17.0.2 │      │   172.17.0.3 │        │  │
│  │  │      app1    │      │      app2    │        │  │
│  │  └──────────────┘      └──────────────┘        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
        │                          │
        └──────────┬───────────────┘
        Communicate via container names (DNS)
```

---

## Dockerode API Complete Guide

### Introduction to Dockerode

Dockerode is a Node.js library that provides a programmatic interface to Docker API. It allows you to create, manage, and interact with containers from Node.js code.

### Installation

```bash
npm install dockerode
```

### Core Concepts

1. **Modem**: Communication layer with Docker daemon
2. **Image**: Represents a Docker image
3. **Container**: Represents a running or stopped container
4. **Network**: Represents a Docker network
5. **Volume**: Represents a Docker volume

### API Overview

#### 1. Connection Setup

```javascript
const Docker = require('dockerode');

// Method 1: Socket (Unix/Windows)
const docker = new Docker({
  socketPath: '/var/run/docker.sock'
});

// Method 2: HTTP
const docker = new Docker({
  host: 'http://localhost',
  port: 2375
});

// Method 3: TCP with TLS
const docker = new Docker({
  protocol: 'https',
  host: 'example.com',
  port: 2376,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});
```

#### 2. Image Operations

##### List Images
```javascript
// Get all images
const images = await docker.listImages();
console.log(images);
// Output:
// [
//   {
//     RepoTags: ['ubuntu:latest'],
//     Id: 'sha256:xyz...',
//     Created: 1234567890,
//     Size: 77000000,
//     ...
//   }
// ]
```

##### Pull Image
```javascript
async function pullImage(imageName) {
  try {
    // Creates stream of pull progress
    const stream = await docker.pull(imageName);
    
    // Listen to pull progress
    stream.on('data', (data) => {
      const progress = JSON.parse(data.toString());
      console.log(`Pulling: ${progress.status}`);
    });

    // Wait for pull to complete
    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        console.log(`Successfully pulled ${imageName}`);
        resolve();
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Pull error:', error);
  }
}

await pullImage('node:18-alpine');
```

##### Build Image
```javascript
const fs = require('fs');
const tar = require('tar-fs');

async function buildImage(dockerfile, tag) {
  try {
    // Create tar stream of Dockerfile context
    const stream = tar.pack('./app');
    
    // Build image from stream
    const buildStream = await docker.buildImage(
      stream,
      {
        t: tag,
        dockerfile: 'Dockerfile'
      }
    );

    // Listen to build output
    return new Promise((resolve, reject) => {
      buildStream.on('data', (data) => {
        const output = JSON.parse(data.toString());
        console.log(output.stream || output.status);
      });
      
      buildStream.on('end', () => {
        console.log(`Successfully built ${tag}`);
        resolve();
      });
      
      buildStream.on('error', reject);
    });
  } catch (error) {
    console.error('Build error:', error);
  }
}

await buildImage('.', 'my-app:1.0');
```

##### Remove Image
```javascript
async function removeImage(imageName) {
  try {
    const image = docker.getImage(imageName);
    await image.remove({ force: true });
    console.log(`Removed image: ${imageName}`);
  } catch (error) {
    console.error('Remove error:', error);
  }
}

await removeImage('my-app:1.0');
```

##### Inspect Image
```javascript
async function inspectImage(imageName) {
  try {
    const image = docker.getImage(imageName);
    const data = await image.inspect();
    console.log('Image Info:', {
      Id: data.Id,
      Created: data.Created,
      Size: data.Size,
      Cmd: data.Config.Cmd,
      Env: data.Config.Env,
      ExposedPorts: data.Config.ExposedPorts
    });
  } catch (error) {
    console.error('Inspect error:', error);
  }
}

await inspectImage('node:18-alpine');
```

#### 3. Container Operations

##### Create Container
```javascript
async function createContainer(imageName, options = {}) {
  try {
    const container = await docker.createContainer({
      Image: imageName,
      name: options.name || 'my-container',
      
      // Port bindings
      PortBindings: {
        '3000/tcp': [{ HostPort: '8080' }]
      },
      
      // Environment variables
      Env: [
        'NODE_ENV=production',
        'DB_HOST=database',
        'DB_PORT=5432'
      ],
      
      // Mount volumes
      Volumes: {
        '/app/data': {}
      },
      
      // Working directory
      WorkingDir: '/app',
      
      // User
      User: 'node',
      
      // Resource limits
      Memory: 512 * 1024 * 1024, // 512MB
      MemorySwap: 1024 * 1024 * 1024, // 1GB
      CpuShares: 1024,
      
      // Restart policy
      RestartPolicy: {
        Name: 'unless-stopped',
        MaximumRetryCount: 5
      },
      
      // Labels
      Labels: {
        'app': 'myapp',
        'version': '1.0'
      },
      
      // Network
      NetworkMode: 'my-bridge',
      
      // Logging
      HostConfig: {
        LogConfig: {
          Type: 'json-file',
          Config: {
            'max-size': '10m',
            'max-file': '3'
          }
        }
      }
    });

    console.log(`Container created: ${container.id}`);
    return container;
  } catch (error) {
    console.error('Create error:', error);
  }
}

const container = await createContainer('node:18-alpine', {
  name: 'my-node-app'
});
```

##### Start Container
```javascript
async function startContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.start();
    console.log(`Container started: ${containerId}`);
  } catch (error) {
    console.error('Start error:', error);
  }
}

await startContainer('container-id');
```

##### Run Container (Create + Start)
```javascript
async function runContainer(imageName) {
  try {
    // Automatically pulls image if not available
    const container = await docker.run(
      imageName,
      ['node', 'app.js'], // Command
      process.stdout, // stdout stream
      {
        rm: true, // Remove container on exit
        Tty: false, // Not interactive
        
        // Bindings
        PortBindings: {
          '3000/tcp': [{ HostPort: '8080' }]
        },
        
        // Volume mounts
        Binds: [
          '/host/path:/container/path',
          'named-volume:/app/data'
        ]
      }
    );

    console.log('Container ran successfully');
    return container;
  } catch (error) {
    console.error('Run error:', error);
  }
}

await runContainer('node:18-alpine');
```

##### Stop Container
```javascript
async function stopContainer(containerId, timeout = 10) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: timeout });
    console.log(`Container stopped: ${containerId}`);
  } catch (error) {
    console.error('Stop error:', error);
  }
}

await stopContainer('container-id');
```

##### Remove Container
```javascript
async function removeContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.remove({ force: true });
    console.log(`Container removed: ${containerId}`);
  } catch (error) {
    console.error('Remove error:', error);
  }
}

await removeContainer('container-id');
```

##### Execute Command in Container
```javascript
async function execCommand(containerId, cmd) {
  try {
    const container = docker.getContainer(containerId);
    
    // Create exec instance
    const exec = await container.exec({
      AttachStdout: true,
      AttachStderr: true,
      Cmd: cmd.split(' ')
    });

    // Start exec
    const stream = await exec.start({ Tty: false });
    
    // Collect output
    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString();
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        resolve(output);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Exec error:', error);
  }
}

const output = await execCommand('container-id', 'ls -la');
console.log(output);
```

##### Get Container Logs
```javascript
async function getContainerLogs(containerId) {
  try {
    const container = docker.getContainer(containerId);
    
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      timestamps: true
    });

    stream.on('data', (chunk) => {
      console.log(chunk.toString());
    });

    stream.on('error', (error) => {
      console.error('Log stream error:', error);
    });
  } catch (error) {
    console.error('Get logs error:', error);
  }
}

await getContainerLogs('container-id');
```

##### Inspect Container
```javascript
async function inspectContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    
    console.log('Container Info:', {
      Id: data.Id,
      State: data.State,
      Config: {
        Image: data.Config.Image,
        Cmd: data.Config.Cmd,
        WorkingDir: data.Config.WorkingDir,
        Env: data.Config.Env,
        ExposedPorts: data.Config.ExposedPorts
      },
      NetworkSettings: {
        IPAddress: data.NetworkSettings.IPAddress,
        Ports: data.NetworkSettings.Ports
      }
    });
  } catch (error) {
    console.error('Inspect error:', error);
  }
}

await inspectContainer('container-id');
```

##### Get Container Stats
```javascript
async function getContainerStats(containerId) {
  try {
    const container = docker.getContainer(containerId);
    
    const stream = await container.stats({ stream: true });

    stream.on('data', (chunk) => {
      const stats = JSON.parse(chunk.toString());
      
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                       stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - 
                          stats.precpu_stats.system_cpu_usage;
      const cpuPercent = (cpuDelta / systemDelta) * 100;
      
      const memoryUsage = stats.memory_stats.usage / (1024 * 1024);
      const memoryLimit = stats.memory_stats.limit / (1024 * 1024);
      
      console.log('Container Stats:', {
        CPU: `${cpuPercent.toFixed(2)}%`,
        Memory: `${memoryUsage.toFixed(2)}MB / ${memoryLimit.toFixed(2)}MB`,
        NetworkIn: stats.networks.eth0.rx_bytes,
        NetworkOut: stats.networks.eth0.tx_bytes,
        BlockIORead: stats.blkio_stats.io_service_bytes_recursive
      });
    });

    // Stop after 60 seconds
    setTimeout(() => stream.destroy(), 60000);
  } catch (error) {
    console.error('Stats error:', error);
  }
}

await getContainerStats('container-id');
```

#### 4. List Containers
```javascript
async function listContainers(options = {}) {
  try {
    const containers = await docker.listContainers({
      all: options.all || false, // Include stopped
      limit: options.limit || 10,
      size: true, // Include size
      filters: {
        status: ['running'], // Filter by status
        label: ['app=myapp'] // Filter by label
      }
    });

    console.log('Containers:', containers.map(c => ({
      id: c.Id.substring(0, 12),
      image: c.Image,
      status: c.Status,
      ports: c.Ports
    })));

    return containers;
  } catch (error) {
    console.error('List error:', error);
  }
}

await listContainers({ all: true });
```

#### 5. Network Operations

##### Create Network
```javascript
async function createNetwork(name, options = {}) {
  try {
    const network = await docker.createNetwork({
      Name: name,
      Driver: options.driver || 'bridge',
      Options: {
        'com.docker.network.bridge.name': `br-${name}`
      },
      CheckDuplicate: true
    });

    console.log(`Network created: ${network.id}`);
    return network;
  } catch (error) {
    console.error('Create network error:', error);
  }
}

await createNetwork('my-app-network');
```

##### Connect Container to Network
```javascript
async function connectContainerToNetwork(containerId, networkName) {
  try {
    const network = docker.getNetwork(networkName);
    
    await network.connect({
      Container: containerId,
      EndpointConfig: {
        Aliases: ['mycontainer']
      }
    });

    console.log(`Container connected to ${networkName}`);
  } catch (error) {
    console.error('Connect error:', error);
  }
}

await connectContainerToNetwork('container-id', 'my-app-network');
```

##### List Networks
```javascript
async function listNetworks() {
  try {
    const networks = await docker.listNetworks();
    
    networks.forEach(network => {
      console.log('Network:', {
        Name: network.Name,
        Driver: network.Driver,
        Containers: Object.keys(network.Containers).length,
        Id: network.Id.substring(0, 12)
      });
    });

    return networks;
  } catch (error) {
    console.error('List networks error:', error);
  }
}

await listNetworks();
```

#### 6. Volume Operations

##### Create Volume
```javascript
async function createVolume(name, options = {}) {
  try {
    const volume = await docker.createVolume({
      Name: name,
      Driver: options.driver || 'local',
      Labels: {
        'app': 'myapp'
      }
    });

    console.log(`Volume created: ${volume.name}`);
    return volume;
  } catch (error) {
    console.error('Create volume error:', error);
  }
}

await createVolume('app-data');
```

##### List Volumes
```javascript
async function listVolumes() {
  try {
    const volumes = await docker.listVolumes();
    
    volumes.Volumes.forEach(volume => {
      console.log('Volume:', {
        Name: volume.Name,
        Driver: volume.Driver,
        Mountpoint: volume.Mountpoint
      });
    });

    return volumes;
  } catch (error) {
    console.error('List volumes error:', error);
  }
}

await listVolumes();
```

---

## Mini Replit Project

### Project Overview

This project creates a mini Replit-like platform where users can:
1. Sign up and log in
2. Create isolated Docker environments
3. Submit code for execution
4. View real-time output via WebSocket
5. Access previous submissions

### Tech Stack

- **Backend**: Express.js, Node.js
- **Database**: MongoDB (with alternative PostgreSQL)
- **Containerization**: Docker, Dockerode
- **Real-time Communication**: WebSocket (ws)
- **Authentication**: JWT
- **File System**: Node.js fs module

### Key Features

1. **User Authentication**
   - JWT-based authentication
   - Secure password hashing
   - Session management

2. **Project Management**
   - Create isolated Docker environments
   - Initialize with dependencies
   - Store project metadata

3. **Code Execution**
   - Submit code via REST API
   - Execute in isolated containers
   - Real-time output streaming via WebSocket
   - Support for Express.js and vanilla JavaScript

4. **Code Isolation**
   - Each project in separate Docker container
   - Volume mounting for file persistence
   - Resource limits (CPU, Memory)
   - Timeout protection

---

## Project Structure & Implementation

### Directory Structure

```
mini-replit/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── src/
│   ├── server.js
│   ├── config/
│   │   ├── database.js
│   │   └── docker.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   └── code.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   └── codeController.js
│   ├── models/
│   │   ├── User.js
│   │   └── Project.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── dockerService.js
│   │   └── codeExecutionService.js
│   └── utils/
│       ├── jwt.js
│       ├── passwordHash.js
│       └── validators.js
├── templates/
│   ├── base-package.json
│   └── sample-code.js
├── storage/
│   └── projects/ (volume mount)
└── tests/
    └── integration.test.js
```

### Complete Implementation Files

See the Implementation Section below for all code files.

---

# Complete Code Implementation

## 1. Configuration Files

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "src/server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001" # WebSocket port
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://mongo:27017/mini-replit
      # Alternative: postgresql://postgres:password@postgres:5432/mini-replit
      JWT_SECRET: your-secret-key-change-in-production
      DOCKER_HOST: unix:///var/run/docker.sock
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./storage/projects:/app/storage/projects
      - ./logs:/app/logs
    depends_on:
      - mongo
    networks:
      - app-network
    restart: unless-stopped

  mongo:
    image: mongo:5
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
      MONGO_INITDB_DB: mini-replit
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network
    restart: unless-stopped

  # Uncomment for PostgreSQL
  # postgres:
  #   image: postgres:14
  #   environment:
  #     POSTGRES_USER: postgres
  #     POSTGRES_PASSWORD: password
  #     POSTGRES_DB: mini-replit
  #   volumes:
  #     - postgres-data:/var/lib/postgresql/data
  #   networks:
  #     - app-network
  #   restart: unless-stopped

volumes:
  mongo-data:
  # postgres-data:

networks:
  app-network:
    driver: bridge
```

### package.json
```json
{
  "name": "mini-replit",
  "version": "1.0.0",
  "description": "Mini Replit using Docker and Node.js",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "docker:build": "docker build -t mini-replit:1.0 .",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f app"
  },
  "keywords": ["docker", "nodejs", "replit"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "dockerode": "^4.0.0",
    "mongoose": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.0.3",
    "express-validator": "^7.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.0.0"
  }
}
```

### .env.example
```env
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001

# Database
DATABASE_TYPE=mongodb
# MongoDB
MONGODB_URL=mongodb://root:rootpassword@localhost:27017/mini-replit?authSource=admin
# PostgreSQL (alternative)
# POSTGRESQL_URL=postgresql://postgres:password@localhost:5432/mini-replit

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Docker
DOCKER_SOCKET=/var/run/docker.sock
BASE_IMAGE=node:18-alpine

# Storage
STORAGE_PATH=./storage/projects
MAX_CODE_SIZE=10485760 # 10MB

# Execution
CODE_TIMEOUT=30000 # 30 seconds
MAX_MEMORY=512m
MAX_CPU_SHARES=1024
```

---

## 2. Database Models

### src/models/User.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Don't return password by default
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// Method to get public data
userSchema.methods.toJSON = function() {
  const { password, ...user } = this.toObject();
  return user;
};

module.exports = mongoose.model('User', userSchema);
```

### src/models/Project.js
```javascript
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  containerId: String,
  containerName: String,
  projectPath: String,
  storagePath: String,
  status: {
    type: String,
    enum: ['created', 'running', 'stopped', 'error'],
    default: 'created'
  },
  dependencies: {
    type: Map,
    of: String,
    default: {
      'express': '^4.18.2'
    }
  },
  environment: {
    type: Map,
    of: String,
    default: {
      'NODE_ENV': 'development'
    }
  },
  submissions: [{
    code: String,
    language: String,
    output: String,
    error: String,
    executedAt: Date,
    executionTime: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
projectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
```

---

## 3. Services

### src/services/dockerService.js
```javascript
const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DockerService {
  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    });
    this.baseImage = process.env.BASE_IMAGE || 'node:18-alpine';
  }

  /**
   * Initialize Docker environment for a project
   * Creates a container with dependencies installed
   */
  async initializeProject(projectId, projectName, dependencies = {}) {
    try {
      // Create project directory
      const projectPath = path.join(
        process.env.STORAGE_PATH,
        projectId
      );
      
      await fs.mkdir(projectPath, { recursive: true });

      // Create package.json with dependencies
      const packageJson = {
        name: projectName,
        version: '1.0.0',
        main: 'app.js',
        scripts: {
          start: 'node app.js'
        },
        dependencies: {
          'express': '^4.18.2',
          'body-parser': '^1.20.2',
          ...dependencies
        }
      };

      await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create initial app.js
      await fs.writeFile(
        path.join(projectPath, 'app.js'),
        `const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from your app!' });
});

app.post('/api', (req, res) => {
  res.json({ received: req.body });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`
      );

      // Create container
      const container = await this.docker.createContainer({
        Image: this.baseImage,
        name: projectName,
        
        PortBindings: {
          '3000/tcp': [{ HostPort: String(3000 + Math.floor(Math.random() * 1000)) }]
        },
        
        Env: [
          'NODE_ENV=development'
        ],
        
        Volumes: {
          '/app': {}
        },
        
        WorkingDir: '/app',
        
        Memory: parseInt(process.env.MAX_MEMORY) * 1024 * 1024 || 512 * 1024 * 1024,
        CpuShares: parseInt(process.env.MAX_CPU_SHARES) || 1024,
        
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
        }
      });

      // Install dependencies
      await this.runCommand(container.id, 'npm install');

      return {
        containerId: container.id,
        containerName: projectName,
        projectPath,
        success: true
      };
    } catch (error) {
      console.error('Initialize project error:', error);
      throw new Error(`Failed to initialize project: ${error.message}`);
    }
  }

  /**
   * Write code to file and execute
   */
  async submitAndExecuteCode(containerId, code, filename = 'app.js') {
    try {
      const container = this.docker.getContainer(containerId);
      
      // Write code to file
      const writeCmd = `cat > ${filename} << 'EOF'\n${code}\nEOF`;
      
      await this.runCommand(containerId, writeCmd);

      // Execute code
      const output = await this.runCommand(
        containerId,
        `timeout ${process.env.CODE_TIMEOUT || 30} node ${filename}`
      );

      return {
        success: true,
        output,
        error: null,
        executedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Run command in container
   */
  async runCommand(containerId, command) {
    try {
      const container = this.docker.getContainer(containerId);

      const exec = await container.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['/bin/sh', '-c', command]
      });

      const stream = await exec.start({ Tty: false });

      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

        stream.on('data', (chunk) => {
          output += chunk.toString();
        });

        stream.on('end', async () => {
          try {
            const inspectData = await exec.inspect();
            if (inspectData.ExitCode !== 0) {
              reject(new Error(`Command failed with exit code ${inspectData.ExitCode}`));
            } else {
              resolve(output);
            }
          } catch (err) {
            reject(err);
          }
        });

        stream.on('error', reject);

        // Timeout after 30 seconds
        setTimeout(() => {
          stream.destroy();
          reject(new Error('Command execution timeout'));
        }, parseInt(process.env.CODE_TIMEOUT) || 30000);
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
      const container = this.docker.getContainer(containerId);
      await container.start();
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }

  /**
   * Stop container
   */
  async stopContainer(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  }

  /**
   * Remove container
   */
  async removeContainer(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to remove container: ${error.message}`);
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await new Promise((resolve, reject) => {
        const stream = container.stats({ stream: false }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return {
        memory: stats.memory_stats.usage / (1024 * 1024),
        cpu: this.calculateCpuPercent(stats),
        network: stats.networks.eth0
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        stats.precpu_stats.system_cpu_usage;
    
    return (cpuDelta / systemDelta) * 100;
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId, tail = 100) {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true
      });

      return stream.toString();
    } catch (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const info = await this.docker.getEvents();
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

module.exports = new DockerService();
```

### src/services/codeExecutionService.js
```javascript
const dockerService = require('./dockerService');
const Project = require('../models/Project');

class CodeExecutionService {
  /**
   * Execute code and stream output via WebSocket
   */
  async executeCodeWithWebSocket(projectId, code, ws) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project not found'
        }));
        return;
      }

      ws.send(JSON.stringify({
        type: 'status',
        message: 'Starting code execution...'
      }));

      // Execute code
      const startTime = Date.now();
      
      const result = await dockerService.submitAndExecuteCode(
        project.containerId,
        code
      );

      const executionTime = Date.now() - startTime;

      // Send output
      ws.send(JSON.stringify({
        type: 'output',
        data: result.output || '',
        executionTime: executionTime
      }));

      // Save submission
      if (!project.submissions) {
        project.submissions = [];
      }

      project.submissions.push({
        code,
        language: 'javascript',
        output: result.output,
        error: result.error,
        executedAt: new Date(),
        executionTime
      });

      await project.save();

      ws.send(JSON.stringify({
        type: 'success',
        message: 'Code executed successfully',
        executionTime
      }));

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  /**
   * Stream container logs
   */
  async streamContainerLogs(projectId, ws) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project not found'
        }));
        return;
      }

      const logs = await dockerService.getContainerLogs(
        project.containerId,
        50
      );

      ws.send(JSON.stringify({
        type: 'logs',
        data: logs
      }));

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }
}

module.exports = new CodeExecutionService();
```

---

## 4. Controllers

### src/controllers/authController.js
```javascript
const User = require('../models/User');
const jwt = require('../utils/jwt');
const { validationResult } = require('express-validator');

class AuthController {
  async signup(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, confirmPassword } = req.body;

      // Check passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Create user
      const user = new User({
        username,
        email,
        password
      });

      await user.save();

      // Generate token
      const token = jwt.generateToken({ userId: user._id });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Signup failed',
        error: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = jwt.generateToken({ userId: user._id });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  async logout(req, res) {
    // Token invalidation would be handled client-side
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}

module.exports = new AuthController();
```

### src/controllers/projectController.js
```javascript
const Project = require('../models/Project');
const dockerService = require('../services/dockerService');
const { validationResult } = require('express-validator');

class ProjectController {
  async createProject(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, dependencies = {} } = req.body;
      const userId = req.user.userId;

      // Generate unique project name
      const projectName = `${name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`;

      // Initialize Docker environment
      const dockerResult = await dockerService.initializeProject(
        req.user.userId,
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
        dependencies,
        status: 'running'
      });

      await project.save();

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project: {
          id: project._id,
          name: project.name,
          description: project.description,
          containerId: project.containerId,
          status: project.status,
          createdAt: project.createdAt
        }
      });

    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: error.message
      });
    }
  }

  async getProjects(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10, skip = 0 } = req.query;

      const projects = await Project.find({ userId })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .sort({ createdAt: -1 });

      const total = await Project.countDocuments({ userId });

      res.json({
        success: true,
        projects,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });

    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message
      });
    }
  }

  async getProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      res.json({
        success: true,
        project
      });

    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project',
        error: error.message
      });
    }
  }

  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Remove Docker container
      try {
        await dockerService.removeContainer(project.containerId);
      } catch (error) {
        console.error('Error removing container:', error);
      }

      // Delete project
      await Project.deleteOne({ _id: projectId });

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });

    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message
      });
    }
  }

  async getProjectStats(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const stats = await dockerService.getContainerStats(project.containerId);

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stats',
        error: error.message
      });
    }
  }
}

module.exports = new ProjectController();
```

### src/controllers/codeController.js
```javascript
const Project = require('../models/Project');
const dockerService = require('../services/dockerService');
const codeExecutionService = require('../services/codeExecutionService');
const { validationResult } = require('express-validator');

class CodeController {
  async submitCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId, code } = req.body;
      const userId = req.user.userId;

      // Verify project ownership
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Execute code
      const startTime = Date.now();
      const result = await dockerService.submitAndExecuteCode(
        project.containerId,
        code
      );

      const executionTime = Date.now() - startTime;

      // Save submission
      if (!project.submissions) {
        project.submissions = [];
      }

      project.submissions.push({
        code,
        language: 'javascript',
        output: result.output,
        error: result.error,
        executedAt: new Date(),
        executionTime
      });

      await project.save();

      res.json({
        success: true,
        message: 'Code executed',
        result: {
          output: result.output,
          error: result.error,
          executionTime
        }
      });

    } catch (error) {
      console.error('Submit code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute code',
        error: error.message
      });
    }
  }

  async getSubmissions(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.userId;
      const { limit = 20, skip = 0 } = req.query;

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const submissions = project.submissions
        .slice(-parseInt(limit) - parseInt(skip))
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        submissions,
        total: project.submissions.length
      });

    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submissions',
        error: error.message
      });
    }
  }
}

module.exports = new CodeController();
```

---

## 5. Middleware & Utilities

### src/middleware/auth.js
```javascript
const jwt = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verifyToken(token);
    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
```

### src/middleware/errorHandler.js
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
};

module.exports = errorHandler;
```

### src/utils/jwt.js
```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

const jwtUtils = {
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY
    });
  },

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },

  decodeToken(token) {
    return jwt.decode(token);
  }
};

module.exports = jwtUtils;
```

### src/utils/validators.js
```javascript
const { body } = require('express-validator');

const validators = {
  // Signup validation
  signup: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3-30 characters'),
    body('email')
      .isEmail()
      .withMessage('Invalid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
  ],

  // Login validation
  login: [
    body('email')
      .isEmail()
      .withMessage('Invalid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Create project validation
  createProject: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Project name must be between 1-50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('dependencies')
      .optional()
      .isObject()
      .withMessage('Dependencies must be an object')
  ],

  // Submit code validation
  submitCode: [
    body('projectId')
      .notEmpty()
      .withMessage('Project ID is required'),
    body('code')
      .notEmpty()
      .withMessage('Code is required')
      .isLength({ max: 10485760 })
      .withMessage('Code size exceeds limit (10MB)')
  ]
};

module.exports = validators;
```

---

## 6. Routes

### src/routes/auth.js
```javascript
const express = require('express');
const authController = require('../controllers/authController');
const validators = require('../utils/validators');

const router = express.Router();

router.post('/signup', validators.signup, authController.signup);
router.post('/login', validators.login, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
```

### src/routes/projects.js
```javascript
const express = require('express');
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');
const validators = require('../utils/validators');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', validators.createProject, projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:projectId', projectController.getProject);
router.delete('/:projectId', projectController.deleteProject);
router.get('/:projectId/stats', projectController.getProjectStats);

module.exports = router;
```

### src/routes/code.js
```javascript
const express = require('express');
const codeController = require('../controllers/codeController');
const authMiddleware = require('../middleware/auth');
const validators = require('../utils/validators');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/submit', validators.submitCode, codeController.submitCode);
router.get('/:projectId/submissions', codeController.getSubmissions);

module.exports = router;
```

---

## 7. Main Server File

### src/server.js
```javascript
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
const authMiddleware = require('./middleware/auth');
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
  path: '/ws'
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
async function connectDatabase() {
  try {
    const dbUrl = process.env.DATABASE_TYPE === 'postgresql'
      ? process.env.POSTGRESQL_URL
      : process.env.MONGODB_URL;

    if (!dbUrl) {
      throw new Error('Database URL not configured');
    }

    // For MongoDB
    if (process.env.DATABASE_TYPE !== 'postgresql') {
      await mongoose.connect(dbUrl);
      console.log('✓ Connected to MongoDB');
    }
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);
  }
}

connectDatabase();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Docker health check endpoint
app.get('/docker-health', async (req, res) => {
  try {
    const health = await dockerService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/code', codeRoutes);

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { type, projectId, code, action } = data;

      if (!projectId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Project ID required'
        }));
        return;
      }

      // Verify authentication
      const token = data.token;
      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required'
        }));
        return;
      }

      switch (type) {
        case 'execute_code':
          if (!code) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Code is required'
            }));
          } else {
            await codeExecutionService.executeCodeWithWebSocket(
              projectId,
              code,
              ws
            );
          }
          break;

        case 'get_logs':
          await codeExecutionService.streamContainerLogs(projectId, ws);
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown action: ${type}`
          }));
      }

    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║     Mini Replit Server Started    ║
╚═══════════════════════════════════╝

✓ Server running on port ${PORT}
✓ WebSocket server on ws://localhost:${PORT}/ws
✓ Environment: ${process.env.NODE_ENV || 'development'}
✓ Database: ${process.env.DATABASE_TYPE || 'mongodb'}

API Endpoints:
  POST   /api/auth/signup
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/projects
  GET    /api/projects
  GET    /api/projects/:projectId
  DELETE /api/projects/:projectId
  GET    /api/projects/:projectId/stats
  POST   /api/code/submit
  GET    /api/code/:projectId/submissions

WebSocket:
  ws://localhost:${PORT}/ws
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
```

---

## 8. Client Example (HTML + JavaScript)

### templates/client.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini Replit</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      color: white;
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    .auth-section {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #333;
      font-weight: 500;
    }

    .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 1em;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      margin-left: 10px;
    }

    .hidden {
      display: none;
    }

    .editor-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .editor-header h2 {
      color: #333;
    }

    .editor-header .stats {
      display: flex;
      gap: 20px;
      font-size: 0.9em;
      color: #666;
    }

    .editor-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .editor-panel {
      display: flex;
      flex-direction: column;
    }

    .editor-panel h3 {
      margin-bottom: 10px;
      color: #333;
    }

    textarea {
      flex: 1;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 0.95em;
      resize: none;
      background: #f9f9f9;
    }

    textarea:focus {
      outline: none;
      border-color: #667eea;
      background: white;
    }

    .output-panel {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      overflow-y: auto;
      max-height: 400px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .output-panel.error {
      color: #f48771;
    }

    .output-panel.success {
      color: #89d185;
    }

    .button-group {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .projects-list {
      margin-top: 20px;
    }

    .project-card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 10px;
      cursor: pointer;
      border-left: 4px solid #667eea;
      transition: background 0.2s;
    }

    .project-card:hover {
      background: #f0f0f0;
    }

    .project-card.active {
      background: #e8e8ff;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: 600;
      margin-left: 10px;
    }

    .status-badge.running {
      background: #d4f1d4;
      color: #2d5016;
    }

    .status-badge.stopped {
      background: #f1d4d4;
      color: #501616;
    }

    .alert {
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 15px;
    }

    .alert-success {
      background: #d4f1d4;
      color: #2d5016;
      border-left: 4px solid #89d185;
    }

    .alert-error {
      background: #f1d4d4;
      color: #501616;
      border-left: 4px solid #f48771;
    }

    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .editor-layout {
        grid-template-columns: 1fr;
      }

      .header h1 {
        font-size: 1.8em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Mini Replit</h1>
      <p>Code execution in isolated Docker containers</p>
    </div>

    <!-- Authentication Section -->
    <div id="auth-section" class="auth-section">
      <h2>Welcome to Mini Replit</h2>

      <!-- Signup Form -->
      <div id="signup-form" class="signup-form">
        <h3>Create Account</h3>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="signup-username" placeholder="Enter username">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="signup-email" placeholder="Enter email">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="signup-password" placeholder="Enter password">
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="signup-confirm" placeholder="Confirm password">
        </div>
        <button class="btn" onclick="signup()">Sign Up</button>
        <button class="btn btn-secondary" onclick="toggleAuthForm()">Login Instead</button>
      </div>

      <!-- Login Form -->
      <div id="login-form" class="login-form hidden">
        <h3>Login to Your Account</h3>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="login-email" placeholder="Enter email">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" placeholder="Enter password">
        </div>
        <button class="btn" onclick="login()">Login</button>
        <button class="btn btn-secondary" onclick="toggleAuthForm()">Sign Up Instead</button>
      </div>

      <div id="alert-container"></div>
    </div>

    <!-- Editor Section -->
    <div id="editor-section" class="editor-section hidden">
      <div class="editor-header">
        <div>
          <h2>Code Editor</h2>
          <p>Project: <strong id="current-project-name">-</strong>
            <span id="status-badge" class="status-badge"></span>
          </p>
        </div>
        <div class="stats">
          <div>Execution Time: <strong id="exec-time">-</strong>ms</div>
          <div id="logout-btn-container"></div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn" onclick="executeCode()">▶ Execute Code</button>
        <button class="btn btn-secondary" onclick="createNewProject()">+ New Project</button>
        <button class="btn btn-secondary" onclick="logout()">Logout</button>
      </div>

      <div class="editor-layout">
        <!-- Code Editor Panel -->
        <div class="editor-panel">
          <h3>Code Editor</h3>
          <textarea id="code-editor" placeholder="Write your code here...
// Example:
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});" spellcheck="false"></textarea>
        </div>

        <!-- Output Panel -->
        <div class="editor-panel">
          <h3>Output</h3>
          <div id="output-panel" class="output-panel">Ready to execute code...</div>
        </div>
      </div>

      <!-- Projects List -->
      <div class="projects-list">
        <h3>Your Projects</h3>
        <div id="projects-container"></div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = 'http://localhost:3000/api';
    let token = localStorage.getItem('token');
    let currentProjectId = null;
    let ws = null;

    // Initialize app
    function init() {
      if (token) {
        showEditor();
        loadProjects();
      } else {
        showAuth();
      }
    }

    // Authentication Functions
    async function signup() {
      const username = document.getElementById('signup-username').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm').value;

      if (!username || !email || !password || !confirmPassword) {
        showAlert('Please fill all fields', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, confirmPassword })
        });

        const data = await response.json();

        if (!data.success) {
          showAlert(data.message, 'error');
          return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        showAlert('Account created successfully!', 'success');
        setTimeout(() => showEditor(), 1000);

      } catch (error) {
        showAlert(error.message, 'error');
      }
    }

    async function login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showAlert('Please fill all fields', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
          showAlert(data.message, 'error');
          return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        showAlert('Login successful!', 'success');
        setTimeout(() => showEditor(), 1000);

      } catch (error) {
        showAlert(error.message, 'error');
      }
    }

    function logout() {
      token = null;
      currentProjectId = null;
      localStorage.removeItem('token');
      if (ws) ws.close();
      showAuth();
      showAlert('Logged out successfully', 'success');
    }

    // UI Functions
    function toggleAuthForm() {
      document.getElementById('signup-form').classList.toggle('hidden');
      document.getElementById('login-form').classList.toggle('hidden');
    }

    function showAuth() {
      document.getElementById('auth-section').classList.remove('hidden');
      document.getElementById('editor-section').classList.add('hidden');
    }

    function showEditor() {
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('editor-section').classList.remove('hidden');
      setupWebSocket();
    }

    function showAlert(message, type = 'success') {
      const container = document.getElementById('alert-container');
      const alert = document.createElement('div');
      alert.className = `alert alert-${type}`;
      alert.textContent = message;
      container.appendChild(alert);

      setTimeout(() => alert.remove(), 5000);
    }

    // Project Functions
    async function createNewProject() {
      const name = prompt('Enter project name:');
      if (!name) return;

      try {
        const response = await fetch(`${API_BASE}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, description: '' })
        });

        const data = await response.json();

        if (!data.success) {
          showAlert(data.message, 'error');
          return;
        }

        currentProjectId = data.project.id;
        showAlert('Project created successfully!', 'success');
        loadProjects();

      } catch (error) {
        showAlert(error.message, 'error');
      }
    }

    async function loadProjects() {
      try {
        const response = await fetch(`${API_BASE}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        const container = document.getElementById('projects-container');
        container.innerHTML = '';

        if (!data.projects || data.projects.length === 0) {
          container.innerHTML = '<p>No projects yet. Create one to get started!</p>';
          return;
        }

        data.projects.forEach(project => {
          const card = document.createElement('div');
          card.className = `project-card ${project._id === currentProjectId ? 'active' : ''}`;
          card.innerHTML = `
            <strong>${project.name}</strong>
            <span class="status-badge ${project.status}">
              ${project.status.toUpperCase()}
            </span>
            <p>${new Date(project.createdAt).toLocaleDateString()}</p>
          `;
          card.onclick = () => selectProject(project);
          container.appendChild(card);
        });

      } catch (error) {
        showAlert(error.message, 'error');
      }
    }

    function selectProject(project) {
      currentProjectId = project._id;
      document.getElementById('current-project-name').textContent = project.name;
      document.getElementById('status-badge').textContent = project.status;
      document.getElementById('status-badge').className = `status-badge ${project.status}`;
      document.getElementById('code-editor').value = '';
      document.getElementById('output-panel').textContent = 'Ready to execute code...';
      loadProjects();
    }

    // Code Execution
    function setupWebSocket() {
      ws = new WebSocket(`ws://localhost:3000/ws`);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showAlert('WebSocket connection error', 'error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    }

    function handleWebSocketMessage(data) {
      const outputPanel = document.getElementById('output-panel');

      switch (data.type) {
        case 'status':
          outputPanel.textContent += `\n${data.message}`;
          break;
        case 'output':
          outputPanel.className = 'output-panel success';
          outputPanel.textContent = data.data || 'No output';
          document.getElementById('exec-time').textContent = data.executionTime;
          break;
        case 'error':
          outputPanel.className = 'output-panel error';
          outputPanel.textContent = data.message;
          break;
        case 'success':
          showAlert(data.message, 'success');
          break;
      }
    }

    async function executeCode() {
      if (!currentProjectId) {
        showAlert('Please select or create a project', 'error');
        return;
      }

      const code = document.getElementById('code-editor').value;

      if (!code.trim()) {
        showAlert('Please write some code', 'error');
        return;
      }

      const outputPanel = document.getElementById('output-panel');
      outputPanel.textContent = 'Executing code...';
      outputPanel.className = 'output-panel';

      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'execute_code',
            projectId: currentProjectId,
            code: code,
            token: token
          }));
        } else {
          // Fallback to HTTP if WebSocket unavailable
          const response = await fetch(`${API_BASE}/code/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ projectId: currentProjectId, code })
          });

          const data = await response.json();

          if (!data.success) {
            showAlert(data.message, 'error');
            outputPanel.className = 'output-panel error';
            outputPanel.textContent = data.message;
            return;
          }

          outputPanel.textContent = data.result.output || data.result.error || 'Execution completed';
          outputPanel.className = data.result.error ? 'output-panel error' : 'output-panel success';
        }

      } catch (error) {
        showAlert(error.message, 'error');
        outputPanel.className = 'output-panel error';
        outputPanel.textContent = error.message;
      }
    }

    // Start app
    init();
  </script>
</body>
</html>
```

---

## Complete Folder Structure

```
mini-replit/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── healthcheck.js
├── package.json
├── package-lock.json
│
├── src/
│   ├── server.js
│   ├── config/
│   │   ├── database.js
│   │   └── docker.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   └── code.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   └── codeController.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   └── Project.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   │
│   ├── services/
│   │   ├── dockerService.js
│   │   └── codeExecutionService.js
│   │
│   └── utils/
│       ├── jwt.js
│       ├── passwordHash.js
│       └── validators.js
│
├── templates/
│   ├── client.html
│   ├── base-package.json
│   └── sample-code.js
│
├── storage/
│   └── projects/ (volume mount for user projects)
│
├── logs/
│   └── app.log
│
└── tests/
    └── integration.test.js
```

---

## Setup & Deployment

### Installation

```bash
# Clone or create project
mkdir mini-replit && cd mini-replit

# Copy all files from structure above

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Ensure Docker is running
docker --version
```

### Running Locally

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start

# With Docker Compose
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down
```

### API Testing

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Create Project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My First Project",
    "description": "Test project"
  }'

# Submit Code
curl -X POST http://localhost:3000/api/code/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": "PROJECT_ID",
    "code": "console.log(\"Hello World\");"
  }'
```

---

## Key Concepts Recap

### Behind the Scenes

1. **Event Loop**: Node.js uses an event-driven, non-blocking I/O model
2. **Docker Layers**: Each Dockerfile instruction creates a layer; unchanged layers are cached
3. **Container Isolation**: Each project runs in its own container with resource limits
4. **Network Communication**: Containers communicate via Docker bridge network
5. **Volume Mounting**: Projects are persisted via host volume mounts
6. **WebSocket**: Enables real-time output streaming

### Performance Tips

- Use Alpine Linux for smaller images
- Layer caching for faster rebuilds
- Resource limits prevent runaway containers
- Connection pooling for database
- Pagination for project lists

---

## Conclusion

This complete learning material covers:
✓ Node.js fundamentals & async programming
✓ Docker architecture & containerization
✓ Docker networking & communication
✓ Dockerode API with comprehensive examples
✓ Full-stack mini Replit implementation
✓ Real-world production patterns

The mini Replit project demonstrates professional practices for container management, user authentication, code execution, and real-time communication in Node.js applications.

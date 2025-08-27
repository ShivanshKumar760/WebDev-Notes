const net = require('net');
const fs = require('fs');
const path = require('path');

class HTTPServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = net.createServer();
        this.routes = new Map();
        
        // Set up default routes
        this.setupDefaultRoutes();
        
        // Handle incoming connections
        this.server.on('connection', (socket) => {
            console.log('New connection established');
            this.handleConnection(socket);
        });
        
        this.server.on('error', (err) => {
            console.error('Server error:', err);
        });
    }
    
    setupDefaultRoutes() {
        // Default route
        this.addRoute('GET', '/', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>TCP HTTP Server</title></head>
                <body>
                    <h1>Welcome to TCP HTTP Server!</h1>
                    <p>This server is built from scratch using TCP sockets.</p>
                    <ul>
                        <li><a href="/hello">Hello endpoint</a></li>
                        <li><a href="/json">JSON endpoint</a></li>
                        <li><a href="/time">Current time</a></li>
                    </ul>
                </body>
                </html>
            `);
        });
        
        // Hello route
        this.addRoute('GET', '/hello', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello from TCP HTTP Server!');
        });
        
        // JSON route
        this.addRoute('GET', '/json', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: 'Hello JSON!',
                server: 'TCP HTTP Server',
                timestamp: new Date().toISOString()
            }));
        });
        
        // Time route
        this.addRoute('GET', '/time', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`Current time: ${new Date().toString()}`);
        });
        
        // POST example
        this.addRoute('POST', '/echo', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body
            }));
        });
    }
    
    addRoute(method, path, handler) {
        const key = `${method.toUpperCase()} ${path}`;
        this.routes.set(key, handler);
    }
    
    handleConnection(socket) {
        let buffer = '';
        
        socket.on('data', (data) => {
            buffer += data.toString();
            
            // Check if we have a complete HTTP request
            if (buffer.includes('\r\n\r\n')) {
                this.processRequest(socket, buffer);
                buffer = '';
            }
        });
        
        socket.on('close', () => {
            console.log('Connection closed');
        });
        
        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    }
    
    processRequest(socket, requestData) {
        try {
            const request = this.parseRequest(requestData);
            const response = new HTTPResponse(socket);
            
            // Find matching route
            const routeKey = `${request.method} ${request.url.split('?')[0]}`;
            const handler = this.routes.get(routeKey);
            
            if (handler) {
                handler(request, response);
            } else {
                // 404 Not Found
                response.writeHead(404, { 'Content-Type': 'text/plain' });
                response.end('404 - Not Found');
            }
        } catch (error) {
            console.error('Error processing request:', error);
            const response = new HTTPResponse(socket);
            response.writeHead(500, { 'Content-Type': 'text/plain' });
            response.end('500 - Internal Server Error');
        }
    }
    
    parseRequest(requestData) {
        const lines = requestData.split('\r\n');
        const requestLine = lines[0];
        const [method, url, version] = requestLine.split(' ');
        
        const headers = {};
        let i = 1;
        
        // Parse headers
        while (i < lines.length && lines[i] !== '') {
            const [key, value] = lines[i].split(': ');
            headers[key.toLowerCase()] = value;
            i++;
        }
        
        // Parse body (if present)
        let body = '';
        if (i < lines.length - 1) {
            body = lines.slice(i + 1).join('\r\n');
        }
        
        return {
            method,
            url,
            version,
            headers,
            body
        };
    }
    
    listen() {
        this.server.listen(this.port, () => {
            console.log(`HTTP Server running on http://localhost:${this.port}`);
        });
    }
    
    close() {
        this.server.close();
    }
}

class HTTPResponse {
    constructor(socket) {
        this.socket = socket;
        this.statusCode = 200;
        this.statusMessage = 'OK';
        this.headers = {};
        this.headersSent = false;
    }
    
    writeHead(statusCode, headers = {}) {
        this.statusCode = statusCode;
        this.statusMessage = this.getStatusMessage(statusCode);
        Object.assign(this.headers, headers);
    }
    
    setHeader(name, value) {
        this.headers[name] = value;
    }
    
    write(data) {
        if (!this.headersSent) {
            this.sendHeaders();
        }
        this.socket.write(data);
    }
    
    end(data = '') {
        if (!this.headersSent) {
            this.setHeader('Content-Length', Buffer.byteLength(data));
            this.sendHeaders();
        }
        
        if (data) {
            this.socket.write(data);
        }
        
        this.socket.end();
    }
    
    sendHeaders() {
        let response = `HTTP/1.1 ${this.statusCode} ${this.statusMessage}\r\n`;
        
        // Default headers
        this.headers['Connection'] = this.headers['Connection'] || 'close';
        this.headers['Date'] = new Date().toUTCString();
        this.headers['Server'] = 'TCP-HTTP-Server/1.0';
        
        for (const [key, value] of Object.entries(this.headers)) {
            response += `${key}: ${value}\r\n`;
        }
        
        response += '\r\n';
        this.socket.write(response);
        this.headersSent = true;
    }
    
    getStatusMessage(code) {
        const messages = {
            200: 'OK',
            201: 'Created',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        return messages[code] || 'Unknown';
    }
}

// Usage example
const server = new HTTPServer(8080);

// Add custom route
server.addRoute('GET', '/custom', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Custom Route!</h1><p>This is a custom route added to the server.</p>');
});

server.listen();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close();
    process.exit(0);
});
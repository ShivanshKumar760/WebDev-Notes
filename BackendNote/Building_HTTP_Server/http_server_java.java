import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.text.SimpleDateFormat;

public class HTTPServer {
    private final int port;
    private final ExecutorService threadPool;
    private ServerSocket serverSocket;
    private volatile boolean running = false;
    private final Map<String, RouteHandler> routes;
    
    public HTTPServer(int port) {
        this.port = port;
        this.threadPool = Executors.newFixedThreadPool(10);
        this.routes = new HashMap<>();
        setupDefaultRoutes();
    }
    
    public interface RouteHandler {
        void handle(HTTPRequest request, HTTPResponse response) throws IOException;
    }
    
    private void setupDefaultRoutes() {
        // Default route
        addRoute("GET", "/", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "text/html"));
            res.end("<!DOCTYPE html>\n" +
                   "<html>\n" +
                   "<head><title>TCP HTTP Server - Java</title></head>\n" +
                   "<body>\n" +
                   "<h1>Welcome to TCP HTTP Server (Java)!</h1>\n" +
                   "<p>This server is built from scratch using TCP sockets in Java.</p>\n" +
                   "<ul>\n" +
                   "<li><a href=\"/hello\">Hello endpoint</a></li>\n" +
                   "<li><a href=\"/json\">JSON endpoint</a></li>\n" +
                   "<li><a href=\"/time\">Current time</a></li>\n" +
                   "</ul>\n" +
                   "</body>\n" +
                   "</html>");
        });
        
        // Hello route
        addRoute("GET", "/hello", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "text/plain"));
            res.end("Hello from TCP HTTP Server (Java)!");
        });
        
        // JSON route
        addRoute("GET", "/json", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "application/json"));
            String json = "{\n" +
                         "  \"message\": \"Hello JSON!\",\n" +
                         "  \"server\": \"TCP HTTP Server (Java)\",\n" +
                         "  \"timestamp\": \"" + new Date().toString() + "\"\n" +
                         "}";
            res.end(json);
        });
        
        // Time route
        addRoute("GET", "/time", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "text/plain"));
            res.end("Current time: " + new Date().toString());
        });
        
        // POST echo route
        addRoute("POST", "/echo", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "application/json"));
            String json = "{\n" +
                         "  \"method\": \"" + req.getMethod() + "\",\n" +
                         "  \"url\": \"" + req.getUrl() + "\",\n" +
                         "  \"body\": \"" + req.getBody().replace("\"", "\\\"") + "\"\n" +
                         "}";
            res.end(json);
        });
    }
    
    public void addRoute(String method, String path, RouteHandler handler) {
        String key = method.toUpperCase() + " " + path;
        routes.put(key, handler);
    }
    
    public void start() throws IOException {
        serverSocket = new ServerSocket(port);
        running = true;
        System.out.println("HTTP Server running on http://localhost:" + port);
        
        while (running) {
            try {
                Socket clientSocket = serverSocket.accept();
                threadPool.submit(() -> handleClient(clientSocket));
            } catch (IOException e) {
                if (running) {
                    System.err.println("Error accepting client connection: " + e.getMessage());
                }
            }
        }
    }
    
    private void handleClient(Socket clientSocket) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(clientSocket.getInputStream()));
             OutputStream outputStream = clientSocket.getOutputStream()) {
            
            HTTPRequest request = parseRequest(reader);
            HTTPResponse response = new HTTPResponse(outputStream);
            
            // Find matching route
            String routeKey = request.getMethod() + " " + request.getUrl().split("\\?")[0];
            RouteHandler handler = routes.get(routeKey);
            
            if (handler != null) {
                handler.handle(request, response);
            } else {
                // 404 Not Found
                response.writeHead(404, Map.of("Content-Type", "text/plain"));
                response.end("404 - Not Found");
            }
            
        } catch (IOException e) {
            System.err.println("Error handling client: " + e.getMessage());
        } finally {
            try {
                clientSocket.close();
            } catch (IOException e) {
                System.err.println("Error closing client socket: " + e.getMessage());
            }
        }
    }
    
    private HTTPRequest parseRequest(BufferedReader reader) throws IOException {
        String requestLine = reader.readLine();
        if (requestLine == null) {
            throw new IOException("Empty request");
        }
        
        String[] parts = requestLine.split(" ");
        String method = parts[0];
        String url = parts[1];
        String version = parts[2];
        
        Map<String, String> headers = new HashMap<>();
        String headerLine;
        
        // Parse headers
        while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
            int colonIndex = headerLine.indexOf(':');
            if (colonIndex > 0) {
                String key = headerLine.substring(0, colonIndex).trim().toLowerCase();
                String value = headerLine.substring(colonIndex + 1).trim();
                headers.put(key, value);
            }
        }
        
        // Parse body
        StringBuilder body = new StringBuilder();
        String contentLengthStr = headers.get("content-length");
        if (contentLengthStr != null) {
            int contentLength = Integer.parseInt(contentLengthStr);
            char[] buffer = new char[contentLength];
            reader.read(buffer, 0, contentLength);
            body.append(buffer);
        }
        
        return new HTTPRequest(method, url, version, headers, body.toString());
    }
    
    public void stop() throws IOException {
        running = false;
        if (serverSocket != null) {
            serverSocket.close();
        }
        threadPool.shutdown();
        try {
            if (!threadPool.awaitTermination(5, TimeUnit.SECONDS)) {
                threadPool.shutdownNow();
            }
        } catch (InterruptedException e) {
            threadPool.shutdownNow();
            Thread.currentThread().interrupt();
        }
        System.out.println("Server stopped");
    }
    
    // HTTP Request class
    public static class HTTPRequest {
        private final String method;
        private final String url;
        private final String version;
        private final Map<String, String> headers;
        private final String body;
        
        public HTTPRequest(String method, String url, String version, 
                          Map<String, String> headers, String body) {
            this.method = method;
            this.url = url;
            this.version = version;
            this.headers = headers;
            this.body = body;
        }
        
        public String getMethod() { return method; }
        public String getUrl() { return url; }
        public String getVersion() { return version; }
        public Map<String, String> getHeaders() { return headers; }
        public String getBody() { return body; }
        public String getHeader(String name) { return headers.get(name.toLowerCase()); }
    }
    
    // HTTP Response class
    public static class HTTPResponse {
        private final OutputStream outputStream;
        private int statusCode = 200;
        private String statusMessage = "OK";
        private final Map<String, String> headers = new HashMap<>();
        private boolean headersSent = false;
        
        public HTTPResponse(OutputStream outputStream) {
            this.outputStream = outputStream;
        }
        
        public void writeHead(int statusCode, Map<String, String> headers) {
            this.statusCode = statusCode;
            this.statusMessage = getStatusMessage(statusCode);
            if (headers != null) {
                this.headers.putAll(headers);
            }
        }
        
        public void setHeader(String name, String value) {
            headers.put(name, value);
        }
        
        public void write(String data) throws IOException {
            if (!headersSent) {
                sendHeaders();
            }
            outputStream.write(data.getBytes());
        }
        
        public void end(String data) throws IOException {
            if (!headersSent) {
                if (data != null) {
                    setHeader("Content-Length", String.valueOf(data.getBytes().length));
                }
                sendHeaders();
            }
            
            if (data != null) {
                outputStream.write(data.getBytes());
            }
            outputStream.flush();
        }
        
        public void end() throws IOException {
            end(null);
        }
        
        private void sendHeaders() throws IOException {
            StringBuilder response = new StringBuilder();
            response.append("HTTP/1.1 ").append(statusCode).append(" ")
                   .append(statusMessage).append("\r\n");
            
            // Default headers
            headers.putIfAbsent("Connection", "close");
            headers.putIfAbsent("Date", new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz")
                   .format(new Date()));
            headers.putIfAbsent("Server", "TCP-HTTP-Server-Java/1.0");
            
            for (Map.Entry<String, String> header : headers.entrySet()) {
                response.append(header.getKey()).append(": ")
                       .append(header.getValue()).append("\r\n");
            }
            
            response.append("\r\n");
            outputStream.write(response.toString().getBytes());
            headersSent = true;
        }
        
        private String getStatusMessage(int code) {
            switch (code) {
                case 200: return "OK";
                case 201: return "Created";
                case 400: return "Bad Request";
                case 401: return "Unauthorized";
                case 403: return "Forbidden";
                case 404: return "Not Found";
                case 500: return "Internal Server Error";
                default: return "Unknown";
            }
        }
    }
    
    // Main method for testing
    public static void main(String[] args) {
        HTTPServer server = new HTTPServer(8080);
        
        // Add custom route
        server.addRoute("GET", "/custom", (req, res) -> {
            res.writeHead(200, Map.of("Content-Type", "text/html"));
            res.end("<h1>Custom Route!</h1><p>This is a custom route added to the Java server.</p>");
        });
        
        // Shutdown hook for graceful shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nShutting down server...");
            try {
                server.stop();
            } catch (IOException e) {
                System.err.println("Error stopping server: " + e.getMessage());
            }
        }));
        
        try {
            server.start();
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }
}
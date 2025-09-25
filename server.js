#!/usr/bin/env node
// Triumvirate JSON SSE Server - Modern URL API Edition
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Remove deprecated url.parse and use WHATWG URL API
class TriumvirateServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer(this.handleRequest.bind(this));
        this.setupRoutes();
    }

    setupRoutes() {
        this.routes = {
            '/status': this.handleStatus.bind(this),
            '/prompt': this.handlePrompt.bind(this),
            '/memory': this.handleMemory.bind(this),
            '/config': this.handleConfig.bind(this)
        };
    }

    // Modern URL parsing using WHATWG URL API
    parseUrl(request) {
        const base = `http://${request.headers.host || 'localhost'}`;
        try {
            return new URL(request.url, base);
        } catch (error) {
            // Fallback for malformed URLs
            return new URL('/', base);
        }
    }

    handleRequest(request, response) {
        const url = this.parseUrl(request);
        const pathname = url.pathname;
        
        console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);

        // Set CORS headers for all responses
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (request.method === 'OPTIONS') {
            response.writeHead(200);
            response.end();
            return;
        }

        const routeHandler = this.routes[pathname];
        if (routeHandler) {
            routeHandler(request, response, url);
        } else {
            this.handleNotFound(response);
        }
    }

    handleStatus(request, response, url) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            status: 'running',
            version: 'v8.1',
            timestamp: new Date().toISOString(),
            endpoints: Object.keys(this.routes)
        }));
    }

    handlePrompt(request, response, url) {
        if (request.method !== 'POST') {
            response.writeHead(405, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });

        request.on('end', () => {
            try {
                const data = JSON.parse(body);
                const prompt = data.prompt;
                
                if (!prompt) {
                    response.writeHead(400, { 'Content-Type': 'application/json' });
                    response.end(JSON.stringify({ error: 'Missing prompt parameter' }));
                    return;
                }

                console.log(`Processing prompt: ${prompt.substring(0, 100)}...`);

                // Set SSE headers
                response.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                this.streamAIResponse(prompt, response);

            } catch (error) {
                console.error('Error parsing JSON:', error);
                response.writeHead(400, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    streamAIResponse(prompt, response) {
        // Use the bash AI script we created
        const aiScript = path.join(process.env.HOME, 'bin', 'ai');
        
        if (!fs.existsSync(aiScript)) {
            this.sendSSEError(response, 'AI script not found. Please install it first.');
            return;
        }

        const child = spawn(aiScript, [prompt], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Stream output as SSE
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    response.write(`data: ${JSON.stringify({ type: 'output', content: line })}\n\n`);
                }
            });
        });

        child.stderr.on('data', (data) => {
            response.write(`data: ${JSON.stringify({ type: 'error', content: data.toString() })}\n\n`);
        });

        child.on('close', (code) => {
            response.write(`data: ${JSON.stringify({ type: 'complete', code: code })}\n\n`);
            response.end();
        });

        child.on('error', (error) => {
            this.sendSSEError(response, `Process error: ${error.message}`);
        });

        // Handle client disconnect
        response.on('close', () => {
            if (!child.killed) {
                child.kill();
            }
        });
    }

    sendSSEError(response, message) {
        response.write(`data: ${JSON.stringify({ type: 'error', content: message })}\n\n`);
        response.end();
    }

    handleMemory(request, response, url) {
        const searchParams = url.searchParams;
        const query = searchParams.get('q');
        const limit = searchParams.get('limit') || 5;

        if (!query) {
            response.writeHead(400, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
        }

        // Simulate memory search - in reality, you'd query your SQLite database
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
            query: query,
            limit: limit,
            results: []
        }));
    }

    handleConfig(request, response, url) {
        if (request.method === 'GET') {
            const searchParams = url.searchParams;
            const key = searchParams.get('key');
            
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({
                action: 'get',
                key: key,
                value: null // Would come from your config system
            }));
        } else {
            response.writeHead(405, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    handleNotFound(response) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ 
            error: 'Endpoint not found',
            available_endpoints: Object.keys(this.routes)
        }));
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Triumvirate JSON SSE server at http://localhost:${this.port}/`);
            console.log('Available endpoints:');
            Object.keys(this.routes).forEach(endpoint => {
                console.log(`  http://localhost:${this.port}${endpoint}`);
            });
        });

        this.server.on('error', (error) => {
            console.error('Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${this.port} is already in use. Trying ${this.port + 1}...`);
                this.port += 1;
                this.start();
            }
        });
    }
}

// Start the server
const server = new TriumvirateServer(8080);
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    process.exit(0);
});
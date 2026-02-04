/**
 * Simple API Server for Auth
 * Can be run standalone or integrated with Vite dev server
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { db, initDatabase, checkConnection } from './db';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  validateSession, 
  getUserById,
  getUserAccounts,
  seedInitialUser,
  type RegisterRequest,
  type LoginRequest,
} from './auth';

const PORT = process.env.API_PORT || 3001;
const API_PREFIX = '/api';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to parse request body
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// Helper to send JSON response
function sendJson(res: ServerResponse, status: number, data: any): void {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    ...corsHeaders 
  });
  res.end(JSON.stringify(data));
}

// Helper to get auth token from header
function getToken(req: IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// Route handlers
const routes: Record<string, Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<void>>> = {
  // Health check
  'GET/health': async (req, res) => {
    const dbConnected = await checkConnection();
    sendJson(res, 200, { 
      status: 'ok', 
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  },
  
  // Register
  'POST/auth/register': async (req, res) => {
    try {
      const body = await parseBody(req) as RegisterRequest;
      
      if (!body.email || !body.password || !body.name) {
        sendJson(res, 400, { error: 'Email, password, and name are required' });
        return;
      }
      
      const result = await registerUser(body);
      sendJson(res, 201, { success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      sendJson(res, 400, { error: message });
    }
  },
  
  // Login
  'POST/auth/login': async (req, res) => {
    try {
      const body = await parseBody(req) as LoginRequest;
      
      if (!body.email || !body.password) {
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }
      
      const result = await loginUser(body);
      sendJson(res, 200, { success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      sendJson(res, 401, { error: message });
    }
  },
  
  // Logout
  'POST/auth/logout': async (req, res) => {
    const token = getToken(req);
    if (token) {
      await logoutUser(token);
    }
    sendJson(res, 200, { success: true, message: 'Logged out' });
  },
  
  // Get current user
  'GET/auth/me': async (req, res) => {
    const token = getToken(req);
    
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    
    const user = await validateSession(token);
    
    if (!user) {
      sendJson(res, 401, { error: 'Invalid or expired session' });
      return;
    }
    
    sendJson(res, 200, { success: true, data: { user } });
  },
  
  // Get user accounts
  'GET/accounts': async (req, res) => {
    const token = getToken(req);
    
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    
    const user = await validateSession(token);
    
    if (!user) {
      sendJson(res, 401, { error: 'Invalid or expired session' });
      return;
    }
    
    const accounts = await getUserAccounts(user.id);
    sendJson(res, 200, { success: true, data: { accounts } });
  },
};

// Main request handler
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  const parsedUrl = parseUrl(req.url || '', true);
  const path = parsedUrl.pathname || '';
  
  // Only handle API routes
  if (!path.startsWith(API_PREFIX)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  
  // Remove API prefix for route matching
  const apiPath = path.slice(API_PREFIX.length) || '/';
  const routeKey = `${req.method}${apiPath}`;
  
  const handler = routes[routeKey];
  
  if (handler) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Route handler error:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  } else {
    sendJson(res, 404, { error: 'Route not found' });
  }
}

// Create and start server
export function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      handleRequest(req, res).catch(err => {
        console.error('Unhandled request error:', err);
        sendJson(res, 500, { error: 'Internal server error' });
      });
    });
    
    server.listen(PORT, () => {
      console.log(`🚀 API Server running on http://localhost:${PORT}`);
      console.log(`   API endpoints available at ${API_PREFIX}`);
      resolve();
    });
    
    server.on('error', reject);
  });
}

// Vite plugin for integration
export function apiPlugin() {
  return {
    name: 'api-server',
    async configureServer(server: any) {
      // Initialize database
      try {
        await initDatabase();
        await seedInitialUser();
      } catch (error) {
        console.error('Database setup failed:', error);
      }
      
      // Add middleware to handle API requests
      server.middlewares.use('/api', async (req: any, res: any, next: any) => {
        // Let the standalone server handle it, or handle inline
        // For dev, we'll start the standalone server
        next();
      });
      
      // Start the API server
      try {
        await startServer();
      } catch (error) {
        console.error('Failed to start API server:', error);
      }
    },
  };
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await initDatabase();
      await seedInitialUser();
      await startServer();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
}

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
import {
  getDashboardData,
  getUserMetrics,
  getUserScenarios,
  getSkillVelocity,
  getQaHighlights,
  seedScenarios as seedDashboardScenarios,
  seedUserDashboardData,
} from './dashboard';
import {
  getAllScenarios,
  getScenariosWithProgress,
  getScenarioById,
  startSimulation,
  completeSimulation,
  getUserSimulationStats,
  getRecommendedScenarios,
  seedScenarios,
} from './simulations';
import {
  generateLiveKitToken,
  isLiveKitConfigured,
  generateRoomName,
  type TokenRequest,
} from './livekit';

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

// Helper to get path segments
function getPathSegments(url: string): string[] {
  const parsed = parseUrl(url || '', true);
  const path = parsed.pathname || '';
  return path.replace(API_PREFIX, '').split('/').filter(Boolean);
}

// Main request handler
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  const method = req.method || 'GET';
  const path = parseUrl(req.url || '', true).pathname || '';
  
  // Only handle API routes
  if (!path.startsWith(API_PREFIX)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  
  const segments = getPathSegments(req.url || '');
  const token = getToken(req);
  
  try {
    // ============================================
    // HEALTH CHECK
    // ============================================
    if (method === 'GET' && segments.length === 1 && segments[0] === 'health') {
      const dbConnected = await checkConnection();
      sendJson(res, 200, { 
        status: 'ok', 
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ============================================
    // AUTH ROUTES
    // ============================================
    
    // Register
    if (method === 'POST' && segments.length === 2 && segments[0] === 'auth' && segments[1] === 'register') {
      const body = await parseBody(req) as RegisterRequest;
      
      if (!body.email || !body.password || !body.name) {
        sendJson(res, 400, { error: 'Email, password, and name are required' });
        return;
      }
      
      const result = await registerUser(body);
      sendJson(res, 201, { success: true, data: result });
      return;
    }
    
    // Login
    if (method === 'POST' && segments.length === 2 && segments[0] === 'auth' && segments[1] === 'login') {
      const body = await parseBody(req) as LoginRequest;
      
      if (!body.email || !body.password) {
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }
      
      const result = await loginUser(body);
      sendJson(res, 200, { success: true, data: result });
      return;
    }
    
    // Logout
    if (method === 'POST' && segments.length === 2 && segments[0] === 'auth' && segments[1] === 'logout') {
      if (token) {
        await logoutUser(token);
      }
      sendJson(res, 200, { success: true, message: 'Logged out' });
      return;
    }
    
    // Get current user
    if (method === 'GET' && segments.length === 2 && segments[0] === 'auth' && segments[1] === 'me') {
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
      return;
    }
    
    // Get user accounts
    if (method === 'GET' && segments.length === 1 && segments[0] === 'accounts') {
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
      return;
    }

    // ============================================
    // DASHBOARD ROUTES
    // ============================================
    
    // Get full dashboard data
    if (method === 'GET' && segments.length === 1 && segments[0] === 'dashboard') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const data = await getDashboardData(user.id);
      sendJson(res, 200, { success: true, data });
      return;
    }

    // Get user metrics
    if (method === 'GET' && segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'metrics') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const metrics = await getUserMetrics(user.id);
      sendJson(res, 200, { success: true, data: { metrics } });
      return;
    }

    // Get user scenarios
    if (method === 'GET' && segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'scenarios') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarios = await getUserScenarios(user.id);
      sendJson(res, 200, { success: true, data: { scenarios } });
      return;
    }

    // Get skill velocity
    if (method === 'GET' && segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'skill-velocity') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const skillVelocity = await getSkillVelocity(user.id);
      sendJson(res, 200, { success: true, data: { skillVelocity } });
      return;
    }

    // Get QA highlights
    if (method === 'GET' && segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'qa-highlights') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const qaHighlights = await getQaHighlights(user.id);
      sendJson(res, 200, { success: true, data: { qaHighlights } });
      return;
    }

    // ============================================
    // SIMULATION ROUTES
    // ============================================

    // Get all scenarios
    if (method === 'GET' && segments.length === 1 && segments[0] === 'scenarios') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarios = await getScenariosWithProgress(user.id);
      sendJson(res, 200, { success: true, data: { scenarios } });
      return;
    }

    // Get single scenario - /scenarios/:id
    if (method === 'GET' && segments.length === 2 && segments[0] === 'scenarios') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarioId = segments[1];
      const scenario = await getScenarioById(scenarioId);
      
      if (!scenario) {
        sendJson(res, 404, { error: 'Scenario not found' });
        return;
      }
      
      sendJson(res, 200, { success: true, data: { scenario } });
      return;
    }

    // Start simulation - /scenarios/:id/start
    if (method === 'POST' && segments.length === 3 && segments[0] === 'scenarios' && segments[2] === 'start') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarioId = segments[1];
      const userScenario = await startSimulation(user.id, scenarioId);
      sendJson(res, 200, { success: true, data: { userScenario } });
      return;
    }

    // Complete simulation - /scenarios/:id/complete
    if (method === 'POST' && segments.length === 3 && segments[0] === 'scenarios' && segments[2] === 'complete') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarioId = segments[1];
      const body = await parseBody(req) as { score?: number; feedback?: string };
      
      if (typeof body.score !== 'number') {
        sendJson(res, 400, { error: 'Score is required' });
        return;
      }
      
      await completeSimulation(user.id, scenarioId, body.score, body.feedback);
      sendJson(res, 200, { success: true, message: 'Simulation completed' });
      return;
    }

    // Get user simulation stats
    if (method === 'GET' && segments.length === 2 && segments[0] === 'simulations' && segments[1] === 'stats') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const stats = await getUserSimulationStats(user.id);
      sendJson(res, 200, { success: true, data: { stats } });
      return;
    }

    // Get recommended scenarios
    if (method === 'GET' && segments.length === 2 && segments[0] === 'simulations' && segments[1] === 'recommended') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scenarios = await getRecommendedScenarios(user.id);
      sendJson(res, 200, { success: true, data: { scenarios } });
      return;
    }

    // ============================================
    // LiveKit Token Generation (for real-time calls)
    // ============================================
    
    // Generate LiveKit token for voice call
    if (method === 'POST' && segments.length === 2 && segments[0] === 'livekit' && segments[1] === 'token') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      if (!isLiveKitConfigured()) {
        sendJson(res, 503, { error: 'LiveKit not configured' });
        return;
      }
      
      try {
        const body = await parseBody(req) as { scenarioId?: string };
        
        if (!body.scenarioId) {
          sendJson(res, 400, { error: 'scenarioId is required' });
          return;
        }
        
        const roomName = generateRoomName(body.scenarioId, user.id);
        const tokenData = await generateLiveKitToken({
          roomName,
          participantName: user.name || user.email,
          userId: user.id,
        });
        
        sendJson(res, 200, { 
          success: true, 
          data: {
            token: tokenData.token,
            url: tokenData.url,
            roomName,
          }
        });
      } catch (error) {
        console.error('LiveKit token generation error:', error);
        sendJson(res, 500, { error: 'Failed to generate token' });
      }
      return;
    }

    // ============================================
    // Demo/Seed endpoints (for development/testing)
    // ============================================
    
    // Reset dashboard data for current user
    if (method === 'POST' && segments.length === 2 && segments[0] === 'demo' && segments[1] === 'reset-my-data') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      // Clear existing data
      await db.execute({ sql: 'DELETE FROM user_metrics WHERE user_id = ?', args: [user.id] });
      await db.execute({ sql: 'DELETE FROM skill_velocity WHERE user_id = ?', args: [user.id] });
      await db.execute({ sql: 'DELETE FROM qa_highlights WHERE user_id = ?', args: [user.id] });
      await db.execute({ sql: 'DELETE FROM user_scenarios WHERE user_id = ?', args: [user.id] });
      
      // Reseed data
      await seedUserDashboardData(user.id);
      
      sendJson(res, 200, { success: true, message: 'Dashboard data reset successfully' });
      return;
    }

    // Get demo login credentials
    if (method === 'GET' && segments.length === 2 && segments[0] === 'demo' && segments[1] === 'credentials') {
      sendJson(res, 200, { 
        success: true, 
        data: {
          email: 'admin@axtra.local',
          password: 'admin123',
          note: 'Demo account for testing'
        }
      });
      return;
    }

    // No route matched
    console.log(`Route not found: ${method} ${path} (segments: ${segments.join('/')})`);
    sendJson(res, 404, { error: 'Route not found' });
    
  } catch (error) {
    console.error('Request handler error:', error);
    sendJson(res, 500, { error: 'Internal server error' });
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
        await seedDashboardScenarios();
        await seedScenarios(); // Simulation scenarios
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
      await seedDashboardScenarios();
      await seedScenarios();
      await startServer();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
}

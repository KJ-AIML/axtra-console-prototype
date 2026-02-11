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
import {
  createCallSession,
  completeCallSession,
  getCallDetails,
  getUserCallHistory,
  abandonCallSession,
  startCallRecording,
  stopCallRecording,
  getCallRecordingStatus,
  isRecordingEnabled,
} from './call-sessions';
import {
  getRecordings,
  getRecordingDetail,
  getRecordingStats,
  deleteRecording,
  getRecentRecordings,
} from './recordings';
import {
  saveQAScore,
  getQAScoreForCall,
  getQASummary,
  getPendingQAReviews,
  getQAStats,
  deleteQAScore,
  QA_RUBRIC,
} from './qa-scoring';

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
    // Call Session endpoints (for voice calls)
    // ============================================
    
    // Create call session
    if (method === 'POST' && segments.length === 1 && segments[0] === 'calls') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const body = await parseBody(req) as { scenarioId: string; roomName: string };
        
        if (!body.scenarioId || !body.roomName) {
          sendJson(res, 400, { error: 'scenarioId and roomName are required' });
          return;
        }
        
        const session = await createCallSession({
          user_id: user.id,
          scenario_id: body.scenarioId,
          room_name: body.roomName,
        });
        
        sendJson(res, 201, { success: true, data: { session } });
      } catch (error) {
        console.error('Create call session error:', error);
        sendJson(res, 500, { error: 'Failed to create call session' });
      }
      return;
    }
    
    // Complete call session
    if (method === 'POST' && segments.length === 2 && segments[0] === 'calls' && segments[1] === 'complete') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const body = await parseBody(req) as {
          callId: string;
          durationSeconds: number;
          totalTurns: number;
          customerSentiment: string;
          transcripts: any[];
          coachingHistory: any[];
          finalScore?: number;
        };
        
        if (!body.callId) {
          sendJson(res, 400, { error: 'callId is required' });
          return;
        }
        
        const result = await completeCallSession({
          call_id: body.callId,
          duration_seconds: body.durationSeconds || 0,
          total_turns: body.totalTurns || 0,
          customer_sentiment: body.customerSentiment || 'neutral',
          transcripts: body.transcripts || [],
          coaching_history: body.coachingHistory || [],
          final_score: body.finalScore,
        });
        
        sendJson(res, 200, { success: true, data: result });
      } catch (error) {
        console.error('Complete call session error:', error);
        sendJson(res, 500, { error: 'Failed to complete call session' });
      }
      return;
    }
    
    // Get call details
    if (method === 'GET' && segments.length === 2 && segments[0] === 'calls') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const callId = segments[1];
        const details = await getCallDetails(callId);
        
        // Verify user owns this call
        if (details.session.user_id !== user.id) {
          sendJson(res, 403, { error: 'Access denied' });
          return;
        }
        
        sendJson(res, 200, { success: true, data: details });
      } catch (error) {
        console.error('Get call details error:', error);
        sendJson(res, 404, { error: 'Call not found' });
      }
      return;
    }
    
    // Get user call history
    if (method === 'GET' && segments.length === 2 && segments[0] === 'calls' && segments[1] === 'history') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const history = await getUserCallHistory(user.id);
        sendJson(res, 200, { success: true, data: { history } });
      } catch (error) {
        console.error('Get call history error:', error);
        sendJson(res, 500, { error: 'Failed to get call history' });
      }
      return;
    }

    // ============================================
    // RECORDING ROUTES (LiveKit Egress)
    // ============================================
    
    // Start recording for a call
    if (method === 'POST' && segments.length === 3 && segments[0] === 'calls' && segments[2] === 'recording' && segments[1] !== 'complete' && segments[1] !== 'history') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const callId = segments[1];
        const body = await parseBody(req) as {
          operatorTrackId: string;
          agentTrackId: string;
        };
        
        if (!body.operatorTrackId || !body.agentTrackId) {
          sendJson(res, 400, { error: 'operatorTrackId and agentTrackId are required' });
          return;
        }
        
        // Import dynamically to avoid circular dependencies
        const { startCallRecording, isRecordingEnabled } = await import('./call-sessions');
        
        if (!isRecordingEnabled()) {
          sendJson(res, 503, { error: 'Recording not configured' });
          return;
        }
        
        const result = await startCallRecording(callId, body.operatorTrackId, body.agentTrackId);
        
        if (result.success) {
          sendJson(res, 200, { success: true, data: result });
        } else {
          sendJson(res, 500, { error: result.error || 'Failed to start recording' });
        }
      } catch (error) {
        console.error('Start recording error:', error);
        sendJson(res, 500, { error: 'Failed to start recording' });
      }
      return;
    }
    
    // Stop recording for a call
    if (method === 'DELETE' && segments.length === 3 && segments[0] === 'calls' && segments[2] === 'recording') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const callId = segments[1];
        const { stopCallRecording } = await import('./call-sessions');
        
        const result = await stopCallRecording(callId);
        
        if (result.success) {
          sendJson(res, 200, { success: true, data: result });
        } else {
          sendJson(res, 500, { error: result.error || 'Failed to stop recording' });
        }
      } catch (error) {
        console.error('Stop recording error:', error);
        sendJson(res, 500, { error: 'Failed to stop recording' });
      }
      return;
    }
    
    // Get recording status for a call
    if (method === 'GET' && segments.length === 3 && segments[0] === 'calls' && segments[2] === 'recording') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const callId = segments[1];
        const { getCallRecordingStatus } = await import('./call-sessions');
        
        const status = await getCallRecordingStatus(callId);
        sendJson(res, 200, { success: true, data: status });
      } catch (error) {
        console.error('Get recording status error:', error);
        sendJson(res, 500, { error: 'Failed to get recording status' });
      }
      return;
    }

    // ============================================
    // RECORDINGS ROUTES
    // ============================================
    
    // Get recordings list with filters
    if (method === 'GET' && segments.length === 1 && segments[0] === 'recordings') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const parsedUrl = parseUrl(req.url || '', true);
      const query = parsedUrl.query;
      
      const filters = {
        userId: user.id,
        scenarioId: query.scenario_id as string | undefined,
        difficulty: query.difficulty as string | undefined,
        status: query.status as 'completed' | 'abandoned' | undefined, // Don't filter by default
        dateFrom: query.date_from as string | undefined,
        dateTo: query.date_to as string | undefined,
        minScore: query.min_score ? parseInt(query.min_score as string) : undefined,
        maxScore: query.max_score ? parseInt(query.max_score as string) : undefined,
        searchQuery: query.search as string | undefined,
      };
      
      const page = query.page ? parseInt(query.page as string) : 1;
      const limit = query.limit ? parseInt(query.limit as string) : 20;
      const sortBy = (query.sort_by as string) || 'started_at';
      const sortOrder = (query.sort_order as 'asc' | 'desc') || 'desc';
      
      try {
        console.log('[API] Get recordings - filters:', JSON.stringify(filters));
        const result = await getRecordings(filters, page, limit, sortBy, sortOrder);
        console.log(`[API] Get recordings - found ${result.total} recordings`);
        // Return directly in the format frontend expects
        sendJson(res, 200, { 
          recordings: result.recordings, 
          total: result.total 
        });
      } catch (error) {
        console.error('Get recordings error:', error);
        sendJson(res, 500, { error: 'Failed to get recordings' });
      }
      return;
    }
    
    // Get single recording detail
    if (method === 'GET' && segments.length === 2 && segments[0] === 'recordings') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const recordingId = segments[1];
      
      try {
        const recording = await getRecordingDetail(recordingId);
        
        if (!recording) {
          sendJson(res, 404, { error: 'Recording not found' });
          return;
        }
        
        // Verify user owns this recording
        if (recording.user_id !== user.id) {
          sendJson(res, 403, { error: 'Access denied' });
          return;
        }
        
        // Return directly in the format frontend expects
        sendJson(res, 200, { recording });
      } catch (error) {
        console.error('Get recording detail error:', error);
        sendJson(res, 500, { error: 'Failed to get recording' });
      }
      return;
    }
    
    // Get recording audio (proxy from storage)
    if (method === 'GET' && segments.length === 3 && segments[0] === 'recordings' && segments[2] === 'audio') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const recordingId = segments[1];
      // Parse query string from URL
      const parsedUrl = parseUrl(req.url || '', true);
      const channel = (parsedUrl.query.channel as string) || 'operator';
      
      try {
        const recording = await getRecordingDetail(recordingId);
        
        if (!recording) {
          sendJson(res, 404, { error: 'Recording not found' });
          return;
        }
        
        if (recording.user_id !== user.id) {
          sendJson(res, 403, { error: 'Access denied' });
          return;
        }
        
        // Get the appropriate track URL
        const trackUrl = channel === 'agent' 
          ? recording.agent_track_url 
          : recording.operator_track_url;
        
        if (!trackUrl) {
          sendJson(res, 404, { error: 'Audio track not found' });
          return;
        }
        
        // Stream the file from R2 public URL (includes bucket name)
        const r2PublicUrl = `https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev/axtraconsole001/${trackUrl}`;
        
        console.log('Fetching audio from R2:', r2PublicUrl);
        
        try {
          const r2Response = await fetch(r2PublicUrl);
          
          if (!r2Response.ok) {
            console.error('R2 fetch failed:', r2Response.status, r2Response.statusText);
            sendJson(res, 404, { error: 'Audio file not found in storage' });
            return;
          }
          
          // Get content length if available
          const contentLength = r2Response.headers.get('content-length');
          
          // Set response headers
          const headers: Record<string, string> = {
            'Content-Type': 'audio/ogg',
          };
          if (contentLength) {
            headers['Content-Length'] = contentLength;
          }
          
          res.writeHead(200, headers);
          
          // Read and send the response
          const buffer = await r2Response.arrayBuffer();
          res.end(Buffer.from(buffer));
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          sendJson(res, 500, { error: 'Failed to fetch audio from storage' });
        }
      } catch (error) {
        console.error('Get audio error:', error);
        sendJson(res, 500, { error: 'Failed to get audio' });
      }
      return;
    }
    
    // Delete recording
    if (method === 'DELETE' && segments.length === 2 && segments[0] === 'recordings') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const recordingId = segments[1];
      
      try {
        const deleted = await deleteRecording(recordingId, user.id);
        
        if (!deleted) {
          sendJson(res, 404, { error: 'Recording not found or access denied' });
          return;
        }
        
        sendJson(res, 200, { success: true, message: 'Recording deleted' });
      } catch (error) {
        console.error('Delete recording error:', error);
        sendJson(res, 500, { error: 'Failed to delete recording' });
      }
      return;
    }
    
    // Get recording stats
    if (method === 'GET' && segments.length === 2 && segments[0] === 'recordings' && segments[1] === 'stats') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const stats = await getRecordingStats(user.id);
        sendJson(res, 200, { success: true, data: stats });
      } catch (error) {
        console.error('Get recording stats error:', error);
        sendJson(res, 500, { error: 'Failed to get stats' });
      }
      return;
    }

    // ============================================
    // QA SCORING ROUTES
    // ============================================
    
    // Get QA rubric
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'rubric') {
      sendJson(res, 200, { success: true, data: { rubric: QA_RUBRIC } });
      return;
    }
    
    // Get QA score for a call
    if (method === 'GET' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'scores') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const callId = segments[2];
      
      try {
        const score = await getQAScoreForCall(callId, user.id);
        sendJson(res, 200, { success: true, data: { score } });
      } catch (error) {
        console.error('Get QA score error:', error);
        sendJson(res, 500, { error: 'Failed to get QA score' });
      }
      return;
    }
    
    // Save QA score
    if (method === 'POST' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'scores') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const body = await parseBody(req);
        
        // Validate required fields
        if (!body.call_id || !body.professionalism || !body.empathy || !body.problem_solving ||
            !body.script_adherence || !body.tone_manner || !body.overall_score) {
          sendJson(res, 400, { error: 'Missing required score fields' });
          return;
        }
        
        const score = await saveQAScore({
          ...body,
          scorer_id: user.id,
        });
        
        sendJson(res, 200, { success: true, data: { score } });
      } catch (error) {
        console.error('Save QA score error:', error);
        sendJson(res, 500, { error: 'Failed to save QA score' });
      }
      return;
    }
    
    // Get QA summary (with AI comparison)
    if (method === 'GET' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'summary') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const callId = segments[2];
      
      try {
        const summary = await getQASummary(callId);
        sendJson(res, 200, { success: true, data: summary });
      } catch (error) {
        console.error('Get QA summary error:', error);
        sendJson(res, 500, { error: 'Failed to get QA summary' });
      }
      return;
    }
    
    // Get pending QA reviews
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'pending') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const pending = await getPendingQAReviews(user.id);
        sendJson(res, 200, { success: true, data: { pending } });
      } catch (error) {
        console.error('Get pending QA error:', error);
        sendJson(res, 500, { error: 'Failed to get pending reviews' });
      }
      return;
    }
    
    // Get QA stats
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'stats') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      try {
        const stats = await getQAStats(user.id);
        sendJson(res, 200, { success: true, data: stats });
      } catch (error) {
        console.error('Get QA stats error:', error);
        sendJson(res, 500, { error: 'Failed to get QA stats' });
      }
      return;
    }
    
    // Delete QA score
    if (method === 'DELETE' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'scores') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const scoreId = segments[2];
      
      try {
        const deleted = await deleteQAScore(scoreId, user.id);
        
        if (!deleted) {
          sendJson(res, 404, { error: 'Score not found or access denied' });
          return;
        }
        
        sendJson(res, 200, { success: true, message: 'Score deleted' });
      } catch (error) {
        console.error('Delete QA score error:', error);
        sendJson(res, 500, { error: 'Failed to delete score' });
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

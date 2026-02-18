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
  createScenario,
  updateScenario,
  deleteScenario,
  type Scenario,
} from './simulations';
import {
  generateLiveKitToken,
  isLiveKitConfigured,
  generateRoomName,
  dispatchAgent,
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
import {
  runAIQAAnalysis,
  getAIQAResult,
  getQACriteria,
  saveHumanQAReview,
  getHumanQAReviewForCall,
  getQAReviewQueue,
  getCompleteQAData,
  getReviewedCalls,
} from './qa-review';
import {
  initializePersonaTables,
  getAllPersonas,
  getPersonaById,
  getPersonaWithScenarios,
  getPersonasForScenario,
  getPrimaryPersonaForScenario,
  createPersona,
  updatePersona,
  deletePersona,
  assignPersonaToScenario,
  removePersonaFromScenario,
} from './personas';
import {
  listGeneralPromotions,
  getGeneralPromotionById,
  createGeneralPromotion,
  updateGeneralPromotion,
  deleteGeneralPromotion,
  listPersonalPromotions,
  getPersonalPromotionById,
  createPersonalPromotion,
  updatePersonalPromotion,
  deletePersonalPromotion,
  getOfferStats,
} from './offers';

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
    // Scenario CRUD Operations
    // ============================================

    // Create scenario
    if (method === 'POST' && segments.length === 1 && segments[0] === 'scenarios') {
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
        const body = await parseBody(req) as Partial<Scenario>;
        const scenario = await createScenario(body);
        sendJson(res, 201, { success: true, data: { scenario } });
      } catch (error) {
        console.error('Create scenario error:', error);
        sendJson(res, 500, { error: 'Failed to create scenario' });
      }
      return;
    }

    // Update scenario
    if (method === 'PUT' && segments.length === 2 && segments[0] === 'scenarios') {
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
      
      try {
        const body = await parseBody(req) as Partial<Scenario>;
        await updateScenario(scenarioId, body);
        sendJson(res, 200, { success: true, message: 'Scenario updated' });
      } catch (error) {
        console.error('Update scenario error:', error);
        sendJson(res, 500, { error: 'Failed to update scenario' });
      }
      return;
    }

    // Delete scenario
    if (method === 'DELETE' && segments.length === 2 && segments[0] === 'scenarios') {
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
      
      try {
        await deleteScenario(scenarioId);
        sendJson(res, 200, { success: true, message: 'Scenario deleted' });
      } catch (error) {
        console.error('Delete scenario error:', error);
        sendJson(res, 500, { error: 'Failed to delete scenario' });
      }
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

    // Start simulation with AI agent dispatch
    if (method === 'POST' && segments.length === 2 && segments[0] === 'simulations' && segments[1] === 'start') {
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
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('  AXTRA BACKEND: SIMULATION START REQUEST');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`👤 Operator: ${user.name || user.email} (ID: ${user.id})`);
      
      try {
        const body = await parseBody(req) as { 
          scenarioId: string;
          personaId?: string;
        };
        
        console.log(`🎯 Scenario ID: ${body.scenarioId}`);
        console.log(`🎭 Persona ID: ${body.personaId || '(auto-select)'}`);
        
        if (!body.scenarioId) {
          console.log('❌ Validation failed: scenarioId is required');
          sendJson(res, 400, { error: 'scenarioId is required' });
          return;
        }
        
        // Get scenario details
        const scenario = await getScenarioById(body.scenarioId);
        if (!scenario) {
          console.log(`❌ Scenario not found: ${body.scenarioId}`);
          sendJson(res, 404, { error: 'Scenario not found' });
          return;
        }
        
        console.log('\n📋 SCENARIO DETAILS:');
        console.log(`   ID: ${scenario.id}`);
        console.log(`   Title: ${scenario.title}`);
        console.log(`   Difficulty: ${scenario.difficulty}`);
        console.log(`   Description: ${scenario.description?.substring(0, 100) || 'N/A'}...`);
        
        // Get persona details (use specified or get primary for scenario)
        let persona;
        if (body.personaId) {
          const { getPersonaById } = await import('./personas');
          persona = await getPersonaById(body.personaId);
          console.log(`\n🎭 Using specified persona: ${body.personaId}`);
        } else {
          const { getPrimaryPersonaForScenario } = await import('./personas');
          const primaryPersona = await getPrimaryPersonaForScenario(body.scenarioId);
          persona = primaryPersona;
          console.log(`\n🎭 Using primary persona for scenario`);
        }
        
        if (!persona) {
          console.log('❌ No persona available for this scenario');
          sendJson(res, 404, { error: 'No persona available for this scenario' });
          return;
        }
        
        console.log('\n🎭 PERSONA DETAILS:');
        console.log(`   ID: ${persona.id}`);
        console.log(`   Name: ${persona.name}`);
        console.log(`   Voice ID: ${persona.voiceId || 'default'}`);
        console.log(`   Tier: ${persona.tier || 'N/A'}`);
        console.log(`   System Prompt Preview: ${persona.systemPrompt?.substring(0, 200) || 'N/A'}...`);
        console.log(`   Behavior Profile:`);
        console.log(JSON.stringify(persona.behaviorProfile, null, 6).split('\n').map((l: string) => '      ' + l).join('\n'));
        
        // Generate unique room name
        const roomName = generateRoomName(body.scenarioId, user.id);
        console.log(`\n🏠 Generated Room Name: ${roomName}`);
        
        // Generate token for the user
        console.log(`\n🔑 Generating LiveKit token...`);
        const tokenData = await generateLiveKitToken({
          roomName,
          participantName: user.name || user.email,
          userId: user.id,
        });
        console.log(`   ✅ Token generated (length: ${tokenData.token.length})`);
        console.log(`   🔗 LiveKit URL: ${tokenData.url}`);
        
        // Calculate tenure from accountSince
        const tenureMonths = persona.accountSince 
          ? Math.floor((Date.now() - new Date(persona.accountSince).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 0;
        const accountAgeYears = persona.accountSince
          ? Math.floor((Date.now() - new Date(persona.accountSince).getTime()) / (1000 * 60 * 60 * 24 * 365))
          : 0;
        const ltv = persona.accountValue || (persona.contractInfo?.monthlyValue ? persona.contractInfo.monthlyValue * 12 : 0);
        
        // Prepare dispatch config with full customer info for promotion matching
        const personaConfig = {
          id: persona.id,
          name: persona.name,
          tier: persona.tier || 'Standard',
          tenureMonths,           // For promotion tenure criteria
          accountAgeYears,        // For promotion account age criteria
          ltv,                    // For promotion LTV criteria
          behaviorProfile: persona.behaviorProfile,
          systemPrompt: persona.systemPrompt || undefined,
          voiceId: persona.voiceId || undefined,
        };
        
        const scenarioConfig = {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description || undefined,
          difficulty: scenario.difficulty,
        };
        
        const userInfo = {
          userId: user.id,
          userName: user.name || user.email,
        };
        
        console.log('\n📤 PREPARING AGENT DISPATCH:');
        console.log('   ┌─ Persona Config ─────────────────────────────────────┐');
        console.log(JSON.stringify(personaConfig, null, 2).split('\n').map((l: string) => '   │ ' + l).join('\n'));
        console.log('   └──────────────────────────────────────────────────────┘');
        console.log('   ┌─ Scenario Config ────────────────────────────────────┐');
        console.log(JSON.stringify(scenarioConfig, null, 2).split('\n').map((l: string) => '   │ ' + l).join('\n'));
        console.log('   └──────────────────────────────────────────────────────┘');
        console.log('   ┌─ User Info ──────────────────────────────────────────┐');
        console.log(JSON.stringify(userInfo, null, 2).split('\n').map((l: string) => '   │ ' + l).join('\n'));
        console.log('   └──────────────────────────────────────────────────────┘');
        
        // Dispatch AI agent to the room with persona/scenario config
        console.log('\n🚀 Dispatching AI agent to LiveKit...');
        const dispatch = await dispatchAgent(roomName, personaConfig, scenarioConfig, userInfo);
        
        console.log('\n✅ AGENT DISPATCHED SUCCESSFULLY:');
        console.log(`   Dispatch ID: ${dispatch.dispatchId}`);
        console.log(`   Agent Name: ${dispatch.agentName}`);
        
        // Create call session record
        console.log(`\n💾 Creating call session record...`);
        const { createCallSession } = await import('./call-sessions');
        const callSession = await createCallSession({
          user_id: user.id,
          scenario_id: body.scenarioId,
          room_name: roomName,
        });
        console.log(`   ✅ Call Session ID: ${callSession.id}`);
        
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  SIMULATION START COMPLETE - SENDING SUCCESS RESPONSE');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        sendJson(res, 200, { 
          success: true, 
          data: {
            callSessionId: callSession.id,
            roomName,
            token: tokenData.token,
            url: tokenData.url,
            dispatchId: dispatch.dispatchId,
            agentName: dispatch.agentName,
            persona: {
              id: persona.id,
              name: persona.name,
            },
            scenario: {
              id: scenario.id,
              title: scenario.title,
            },
          }
        });
      } catch (error) {
        console.log('\n❌ SIMULATION START ERROR:');
        console.error(error);
        console.log('═══════════════════════════════════════════════════════════════\n');
        sendJson(res, 500, { error: 'Failed to start simulation' });
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
        
        console.log('[Audio] Fetching audio for recording:', recordingId, 'channel:', channel);
        console.log('[Audio] Recording found:', !!recording);
        
        if (!recording) {
          sendJson(res, 404, { error: 'Recording not found' });
          return;
        }
        
        console.log('[Audio] User check:', recording.user_id, '===', user.id);
        if (recording.user_id !== user.id) {
          sendJson(res, 403, { error: 'Access denied' });
          return;
        }
        
        // Get the appropriate track URL
        let trackUrl = channel === 'agent' 
          ? recording.agent_track_url 
          : recording.operator_track_url;
        
        // Fallback to other channel if requested channel is not available
        if (!trackUrl) {
          const fallbackUrl = channel === 'agent'
            ? recording.operator_track_url
            : recording.agent_track_url;
          if (fallbackUrl) {
            console.log(`[Audio] ${channel} track not found, falling back to ${channel === 'agent' ? 'operator' : 'agent'}`);
            trackUrl = fallbackUrl;
          }
        }
        
        console.log('[Audio] Track URL:', trackUrl);
        console.log('[Audio] operator_track_url:', recording.operator_track_url);
        console.log('[Audio] agent_track_url:', recording.agent_track_url);
        
        if (!trackUrl) {
          sendJson(res, 404, { error: 'Audio track not found' });
          return;
        }
        
        // Stream the file from R2 public URL
        // Try multiple URL variations to handle different filename formats
        const urlVariations = [
          `https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev/${trackUrl}`,
          // Try with .ogg extension if not present
          !trackUrl.endsWith('.ogg') ? `https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev/${trackUrl}.ogg` : null,
          // Try without .ogg extension if present
          trackUrl.endsWith('.ogg') ? `https://pub-92a788d074a940e5bd312e66668b86ea.r2.dev/${trackUrl.slice(0, -4)}` : null,
        ].filter(Boolean) as string[];
        
        let r2Response: Response | null = null;
        let usedUrl = '';
        
        for (const url of urlVariations) {
          console.log('[Audio] Trying URL:', url);
          usedUrl = url;
          r2Response = await fetch(url);
          if (r2Response.ok) {
            console.log('[Audio] Successfully found audio at:', url);
            break;
          }
        }
        
        if (!r2Response || !r2Response.ok) {
          console.error('[Audio] All R2 URLs failed. Last attempt:', usedUrl, 'Status:', r2Response?.status);
          sendJson(res, 404, { error: 'Audio file not found in storage' });
          return;
        }
        
        // Get content length if available
        const contentLength = r2Response.headers.get('content-length');
        
        // Set response headers with CORS
        const headers: Record<string, string> = {
          'Content-Type': 'audio/ogg',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        if (contentLength) {
          headers['Content-Length'] = contentLength;
        }
        
        res.writeHead(200, headers);
        
        // Read and send the response
        const buffer = await r2Response.arrayBuffer();
        res.end(Buffer.from(buffer));
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
    // QA REVIEW ROUTES
    // ============================================
    
    // Get QA review queue (calls pending human review)
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'queue') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const query = parseUrl(req.url || '', true).query;
      const limit = query.limit ? parseInt(query.limit as string) : 20;
      const offset = query.offset ? parseInt(query.offset as string) : 0;
      
      try {
        const queue = await getQAReviewQueue(limit, offset);
        sendJson(res, 200, { success: true, data: queue });
      } catch (error) {
        console.error('Get QA queue error:', error);
        sendJson(res, 500, { error: 'Failed to get QA queue' });
      }
      return;
    }
    
    // Get reviewed calls (calls with human QA reviews)
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'reviewed') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const query = parseUrl(req.url || '', true).query;
      const limit = query.limit ? parseInt(query.limit as string) : 20;
      const offset = query.offset ? parseInt(query.offset as string) : 0;
      const myReviewsOnly = query.my === 'true';
      
      try {
        const reviewed = await getReviewedCalls(
          myReviewsOnly ? user.id : undefined,
          limit,
          offset
        );
        sendJson(res, 200, { success: true, data: reviewed });
      } catch (error) {
        console.error('Get reviewed calls error:', error);
        sendJson(res, 500, { error: 'Failed to get reviewed calls' });
      }
      return;
    }
    
    // Get AI QA result for a call
    if (method === 'GET' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'ai' && segments[2]) {
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
        const aiResult = await getAIQAResult(callId);
        
        if (!aiResult) {
          sendJson(res, 404, { error: 'AI QA result not found' });
          return;
        }
        
        sendJson(res, 200, { success: true, data: aiResult });
      } catch (error) {
        console.error('Get AI QA error:', error);
        sendJson(res, 500, { error: 'Failed to get AI QA result' });
      }
      return;
    }
    
    // Get QA criteria
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'criteria') {
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
        const criteria = await getQACriteria();
        sendJson(res, 200, { success: true, data: criteria });
      } catch (error) {
        console.error('Get QA criteria error:', error);
        sendJson(res, 500, { error: 'Failed to get QA criteria' });
      }
      return;
    }
    
    // Save/update QA criteria (admin/config endpoint)
    if (method === 'POST' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'criteria') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const body = await parseBody(req);
      
      try {
        const { saveQACriteria } = await import('./qa-review');
        await saveQACriteria(body);
        sendJson(res, 200, { success: true, message: 'Criteria saved' });
      } catch (error: any) {
        console.error('Save QA criteria error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to save criteria' });
      }
      return;
    }
    
    // Delete QA criteria
    if (method === 'DELETE' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'criteria' && segments[2]) {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const criteriaId = segments[2];
      
      try {
        const { deleteQACriteria } = await import('./qa-review');
        await deleteQACriteria(criteriaId);
        sendJson(res, 200, { success: true, message: 'Criteria deleted' });
      } catch (error: any) {
        console.error('Delete QA criteria error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to delete criteria' });
      }
      return;
    }
    
    // Save human QA review
    if (method === 'POST' && segments.length === 2 && segments[0] === 'qa' && segments[1] === 'reviews') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const body = await parseBody(req);
      
      try {
        const review = await saveHumanQAReview({
          call_id: body.call_id,
          reviewer_id: user.id,
          overall_score: body.overall_score,
          general_feedback: body.general_feedback,
          status: body.status,
          criteria_scores: body.criteria_scores,
          comments: body.comments,
        });
        
        sendJson(res, 200, { success: true, data: review });
      } catch (error) {
        console.error('Save QA review error:', error);
        sendJson(res, 500, { error: 'Failed to save QA review' });
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

    // Get complete QA data (AI + Human) for a call
    // Keep this route after all specific /qa/* routes to avoid path collisions.
    if (method === 'GET' && segments.length === 2 && segments[0] === 'qa' && segments[1]) {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const callId = segments[1];
      
      try {
        const qaData = await getCompleteQAData(callId, user.id);
        sendJson(res, 200, { success: true, data: qaData });
      } catch (error) {
        console.error('Get QA data error:', error);
        sendJson(res, 500, { error: 'Failed to get QA data' });
      }
      return;
    }

    // ============================================
    // PERSONA ROUTES
    // ============================================
    
    // Get all personas
    if (method === 'GET' && segments.length === 1 && segments[0] === 'personas') {
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
        const personas = await getAllPersonas();
        sendJson(res, 200, { success: true, data: { personas } });
      } catch (error) {
        console.error('Get personas error:', error);
        sendJson(res, 500, { error: 'Failed to get personas' });
      }
      return;
    }
    
    // Get persona by ID
    if (method === 'GET' && segments.length === 2 && segments[0] === 'personas') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const personaId = segments[1];
      
      try {
        const persona = await getPersonaWithScenarios(personaId);
        
        if (!persona) {
          sendJson(res, 404, { error: 'Persona not found' });
          return;
        }
        
        sendJson(res, 200, { success: true, data: { persona } });
      } catch (error) {
        console.error('Get persona error:', error);
        sendJson(res, 500, { error: 'Failed to get persona' });
      }
      return;
    }
    
    // Get personas for a scenario
    if (method === 'GET' && segments.length === 3 && segments[0] === 'scenarios' && segments[2] === 'personas') {
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
      
      try {
        const personas = await getPersonasForScenario(scenarioId);
        sendJson(res, 200, { success: true, data: { personas } });
      } catch (error) {
        console.error('Get scenario personas error:', error);
        sendJson(res, 500, { error: 'Failed to get personas' });
      }
      return;
    }
    
    // Get primary persona for a scenario
    if (method === 'GET' && segments.length === 3 && segments[0] === 'scenarios' && segments[2] === 'primary-persona') {
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
      
      try {
        const persona = await getPrimaryPersonaForScenario(scenarioId);
        
        if (!persona) {
          sendJson(res, 404, { error: 'No persona assigned to this scenario' });
          return;
        }
        
        sendJson(res, 200, { success: true, data: { persona } });
      } catch (error) {
        console.error('Get primary persona error:', error);
        sendJson(res, 500, { error: 'Failed to get primary persona' });
      }
      return;
    }
    
    // Create persona
    if (method === 'POST' && segments.length === 1 && segments[0] === 'personas') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const body = await parseBody(req);
      
      try {
        const persona = await createPersona({ ...body, createdBy: user.id });
        sendJson(res, 201, { success: true, data: { persona } });
      } catch (error) {
        console.error('Create persona error:', error);
        sendJson(res, 500, { error: 'Failed to create persona' });
      }
      return;
    }
    
    // Update persona
    if (method === 'PUT' && segments.length === 2 && segments[0] === 'personas') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const personaId = segments[1];
      const body = await parseBody(req);
      
      try {
        await updatePersona(personaId, body);
        sendJson(res, 200, { success: true, message: 'Persona updated' });
      } catch (error) {
        console.error('Update persona error:', error);
        sendJson(res, 500, { error: 'Failed to update persona' });
      }
      return;
    }
    
    // Delete persona
    if (method === 'DELETE' && segments.length === 2 && segments[0] === 'personas') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const personaId = segments[1];
      
      try {
        await deletePersona(personaId);
        sendJson(res, 200, { success: true, message: 'Persona deleted' });
      } catch (error) {
        console.error('Delete persona error:', error);
        sendJson(res, 500, { error: 'Failed to delete persona' });
      }
      return;
    }
    
    // Assign persona to scenario
    if (method === 'POST' && segments.length === 4 && segments[0] === 'personas' && segments[2] === 'scenarios') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const personaId = segments[1];
      const scenarioId = segments[3];
      const body = await parseBody(req);
      
      try {
        await assignPersonaToScenario(
          personaId, 
          scenarioId, 
          body.contextOverride, 
          body.displayOrder || 0
        );
        sendJson(res, 200, { success: true, message: 'Persona assigned to scenario' });
      } catch (error) {
        console.error('Assign persona error:', error);
        sendJson(res, 500, { error: 'Failed to assign persona' });
      }
      return;
    }
    
    // Remove persona from scenario
    if (method === 'DELETE' && segments.length === 4 && segments[0] === 'personas' && segments[2] === 'scenarios') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const personaId = segments[1];
      const scenarioId = segments[3];
      
      try {
        await removePersonaFromScenario(personaId, scenarioId);
        sendJson(res, 200, { success: true, message: 'Persona removed from scenario' });
      } catch (error) {
        console.error('Remove persona error:', error);
        sendJson(res, 500, { error: 'Failed to remove persona' });
      }
      return;
    }

    // ============================================
    // OFFERS & RULES ROUTES
    // ============================================
    
    // Get all general promotions
    if (method === 'GET' && segments.length === 2 && segments[0] === 'offers' && segments[1] === 'general') {
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
        const promotions = await listGeneralPromotions(user.id);
        sendJson(res, 200, { success: true, data: promotions });
      } catch (error) {
        console.error('List general promotions error:', error);
        sendJson(res, 500, { error: 'Failed to fetch promotions' });
      }
      return;
    }
    
    // Get single general promotion
    if (method === 'GET' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'general') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      
      try {
        const promotion = await getGeneralPromotionById(user.id, promoId);
        if (!promotion) {
          sendJson(res, 404, { error: 'Promotion not found' });
          return;
        }
        sendJson(res, 200, { success: true, data: promotion });
      } catch (error) {
        console.error('Get general promotion error:', error);
        sendJson(res, 500, { error: 'Failed to fetch promotion' });
      }
      return;
    }
    
    // Create general promotion
    if (method === 'POST' && segments.length === 2 && segments[0] === 'offers' && segments[1] === 'general') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const body = await parseBody(req);
      
      try {
        const promotion = await createGeneralPromotion(user.id, body);
        sendJson(res, 201, { success: true, data: promotion });
      } catch (error) {
        console.error('Create general promotion error:', error);
        sendJson(res, 500, { error: 'Failed to create promotion' });
      }
      return;
    }
    
    // Update general promotion
    if (method === 'PUT' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'general') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      const body = await parseBody(req);
      
      try {
        const promotion = await updateGeneralPromotion(user.id, promoId, body);
        sendJson(res, 200, { success: true, data: promotion });
      } catch (error) {
        console.error('Update general promotion error:', error);
        sendJson(res, 500, { error: 'Failed to update promotion' });
      }
      return;
    }
    
    // Delete general promotion
    if (method === 'DELETE' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'general') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      
      try {
        await deleteGeneralPromotion(user.id, promoId);
        sendJson(res, 200, { success: true, message: 'Promotion deleted' });
      } catch (error) {
        console.error('Delete general promotion error:', error);
        sendJson(res, 500, { error: 'Failed to delete promotion' });
      }
      return;
    }
    
    // Get all personal promotions
    if (method === 'GET' && segments.length === 2 && segments[0] === 'offers' && segments[1] === 'personal') {
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
        const promotions = await listPersonalPromotions(user.id);
        sendJson(res, 200, { success: true, data: promotions });
      } catch (error) {
        console.error('List personal promotions error:', error);
        sendJson(res, 500, { error: 'Failed to fetch promotions' });
      }
      return;
    }
    
    // Get single personal promotion
    if (method === 'GET' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'personal') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      
      try {
        const promotion = await getPersonalPromotionById(user.id, promoId);
        if (!promotion) {
          sendJson(res, 404, { error: 'Promotion not found' });
          return;
        }
        sendJson(res, 200, { success: true, data: promotion });
      } catch (error) {
        console.error('Get personal promotion error:', error);
        sendJson(res, 500, { error: 'Failed to fetch promotion' });
      }
      return;
    }
    
    // Create personal promotion
    if (method === 'POST' && segments.length === 2 && segments[0] === 'offers' && segments[1] === 'personal') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const body = await parseBody(req);
      
      try {
        const promotion = await createPersonalPromotion(user.id, body);
        sendJson(res, 201, { success: true, data: promotion });
      } catch (error) {
        console.error('Create personal promotion error:', error);
        sendJson(res, 500, { error: 'Failed to create promotion' });
      }
      return;
    }
    
    // Update personal promotion
    if (method === 'PUT' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'personal') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      const body = await parseBody(req);
      
      try {
        const promotion = await updatePersonalPromotion(user.id, promoId, body);
        sendJson(res, 200, { success: true, data: promotion });
      } catch (error) {
        console.error('Update personal promotion error:', error);
        sendJson(res, 500, { error: 'Failed to update promotion' });
      }
      return;
    }
    
    // Delete personal promotion
    if (method === 'DELETE' && segments.length === 3 && segments[0] === 'offers' && segments[1] === 'personal') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const promoId = segments[2];
      
      try {
        await deletePersonalPromotion(user.id, promoId);
        sendJson(res, 200, { success: true, message: 'Promotion deleted' });
      } catch (error) {
        console.error('Delete personal promotion error:', error);
        sendJson(res, 500, { error: 'Failed to delete promotion' });
      }
      return;
    }
    
    // Get offer stats
    if (method === 'GET' && segments.length === 2 && segments[0] === 'offers' && segments[1] === 'stats') {
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
        const stats = await getOfferStats(user.id);
        sendJson(res, 200, { success: true, data: stats });
      } catch (error) {
        console.error('Get offer stats error:', error);
        sendJson(res, 500, { error: 'Failed to fetch stats' });
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
        await initializePersonaTables(); // Persona tables
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
      await initializePersonaTables();
      await startServer();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
}

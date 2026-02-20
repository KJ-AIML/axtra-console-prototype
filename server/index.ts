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
  getQACriteriaHierarchy,
  getQAConfigWeights,
  saveQAConfigWeight,
  autoDistributeWeights,
  saveHumanQAReview,
  getHumanQAReviewForCall,
  getQAReviewQueue,
  getCompleteQAData,
  getReviewedCalls,
} from './qa-review';
import {
  initializeQAV2,
  getQAConfigVersion,
  listQAConfigVersions,
  createQADraftVersion,
  publishQAVersion,
  upsertQACriteriaNode,
  softDeleteQACriteriaNode,
  saveHumanQAReviewV2,
  getQAReviewQueueV2,
  getReviewedCallsV2,
  getCompleteQADataV2,
  runAIQAAnalysisV2,
  getQAWeightsV2,
  saveQAWeightV2,
  autoDistributeWeightsV2,
} from './qa-review-v2';
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

    // Get config version tree
    // GET /api/qa/configs/:configId/versions
    if (
      method === 'GET' &&
      segments.length === 4 &&
      segments[0] === 'qa' &&
      segments[1] === 'configs' &&
      segments[3] === 'versions'
    ) {
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
        const data = await listQAConfigVersions(segments[2]);
        sendJson(res, 200, { success: true, data });
      } catch (error: any) {
        console.error('List QA config versions error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to list QA config versions' });
      }
      return;
    }

    // Get config version tree
    // GET /api/qa/configs/:configId/versions/:versionId
    if (
      method === 'GET' &&
      segments.length === 5 &&
      segments[0] === 'qa' &&
      segments[1] === 'configs' &&
      segments[3] === 'versions'
    ) {
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
        const data = await getQAConfigVersion(segments[2], segments[4]);
        sendJson(res, 200, { success: true, data });
      } catch (error: any) {
        console.error('Get QA config version error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to get QA config version' });
      }
      return;
    }

    // Create draft config version (clone latest)
    // POST /api/qa/configs/:configId/versions
    if (
      method === 'POST' &&
      segments.length === 4 &&
      segments[0] === 'qa' &&
      segments[1] === 'configs' &&
      segments[3] === 'versions'
    ) {
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
        const data = await createQADraftVersion(segments[2], user.id);
        sendJson(res, 200, { success: true, data });
      } catch (error: any) {
        console.error('Create QA draft version error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to create draft version' });
      }
      return;
    }

    // Publish config version
    // POST /api/qa/configs/:configId/versions/:versionId/publish
    if (
      method === 'POST' &&
      segments.length === 6 &&
      segments[0] === 'qa' &&
      segments[1] === 'configs' &&
      segments[3] === 'versions' &&
      segments[5] === 'publish'
    ) {
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
        const data = await publishQAVersion(segments[2], segments[4]);
        sendJson(res, 200, { success: true, data });
      } catch (error: any) {
        console.error('Publish QA version error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to publish version' });
      }
      return;
    }

    // Upsert criteria node in a draft version
    // POST /api/qa/configs/:configId/versions/:versionId/criteria
    if (
      method === 'POST' &&
      segments.length === 6 &&
      segments[0] === 'qa' &&
      segments[1] === 'configs' &&
      segments[3] === 'versions' &&
      segments[5] === 'criteria'
    ) {
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
        const data = await upsertQACriteriaNode(segments[2], segments[4], body);
        sendJson(res, 200, { success: true, data });
      } catch (error: any) {
        console.error('Upsert QA criteria node error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to upsert criteria node' });
      }
      return;
    }
    
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
        const queue = await getQAReviewQueueV2(limit, offset);
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
        const reviewed = await getReviewedCallsV2(
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
        const qaData = await getCompleteQADataV2(callId, user.id);
        const aiResult = qaData.ai_qa;
        
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

    // Trigger AI QA analysis manually
    // POST /api/qa/ai/analyze
    if (method === 'POST' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'ai' && segments[2] === 'analyze') {
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
      if (!body.call_id) {
        sendJson(res, 400, { error: 'call_id is required' });
        return;
      }

      try {
        const callDetails = await getCallDetails(body.call_id);
        const result = await runAIQAAnalysisV2(
          body.call_id,
          callDetails.transcripts,
          callDetails.coaching,
          callDetails.session.duration_seconds || 0,
          callDetails.session.total_turns || callDetails.transcripts.length,
          body.scenario_type || 'customer_service'
        );
        sendJson(res, 200, { success: true, data: result });
      } catch (error: any) {
        console.error('Run AI QA V2 error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to run AI QA analysis' });
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
        const cfg = await getQAConfigVersion('default');
        const criteria = (cfg.tree || []).flatMap((parent: any, parentIndex: number) => {
          const parentExternalId = String(parent.code || parent.id);
          const parentRow = {
            id: parentExternalId,
            name: parent.title,
            description: parent.detail,
            ai_prompt: parent.ai_prompt || '',
            scoring_type: 'scale',
            max_score: 100,
            weight: parent.weight || 0,
            is_required: false,
            sort_order: parent.sort_order ?? parentIndex,
            parent_criteria_id: undefined,
            level: 0,
          };
          const childRows = (parent.children || []).map((leaf: any, childIndex: number) => ({
            id: String(leaf.code || leaf.id),
            name: leaf.title,
            description: leaf.detail,
            ai_prompt: leaf.ai_prompt,
            scoring_type: leaf.scoring_type || 'scale',
            max_score: leaf.max_score || 5,
            weight: leaf.weight || 0,
            is_required: !!leaf.is_required,
            sort_order: leaf.sort_order ?? childIndex,
            parent_criteria_id: parentExternalId,
            level: 1,
          }));
          return [parentRow, ...childRows];
        });
        sendJson(res, 200, { success: true, data: criteria });
      } catch (error) {
        console.error('Get QA criteria error:', error);
        sendJson(res, 500, { error: 'Failed to get QA criteria' });
      }
      return;
    }
    
    // Save/update QA criteria (admin/config endpoint)
    if (method === 'POST' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'criteria' && segments[2] === 'bulk') {
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
      const criteriaList = Array.isArray(body.criteria) ? body.criteria : [];
      const removedIds = Array.isArray(body.removed_ids) ? body.removed_ids.map((id: any) => String(id)) : [];
      
      console.log('[QA Bulk Save] Request body:', JSON.stringify({ 
        criteriaCount: criteriaList.length, 
        removedCount: removedIds.length,
        criteria: criteriaList.map((c: any) => ({ id: c.id, name: c.name, parent: c.parent_criteria_id }))
      }));

      try {
        console.log('[QA Bulk Save] Starting bulk save with', criteriaList.length, 'criteria,', removedIds.length, 'removals');
        const workingVersion = (await createQADraftVersion('default', user.id)).version.id;
        console.log('[QA Bulk Save] Created working version:', workingVersion);

        // Clear all existing nodes from the draft version to start fresh
        // This prevents duplicates from corrupted published versions
        console.log('[QA Bulk Save] Clearing existing draft nodes...');
        await db.execute({
          sql: `DELETE FROM qa_criteria_nodes WHERE config_version_id = ?`,
          args: [workingVersion],
        });
        console.log('[QA Bulk Save] Draft nodes cleared');

        let workingCfg = await getQAConfigVersion('default', workingVersion);
        let allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        
        // Also fetch published version nodes as fallback for looking up parents not in this save batch
        let publishedCfg;
        try {
          publishedCfg = await getQAConfigVersion('default');
        } catch (e) {
          // No published version yet
        }
        const publishedNodes = (publishedCfg?.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        
        console.log(`[QA Bulk Save] Draft nodes: ${allNodes.length}, Published nodes: ${publishedNodes.length}`);
        
        const findByExternalId = (externalId: string | undefined) => {
          if (!externalId) return null;
          // First check draft nodes
          const byCode = allNodes.find((node: any) => String(node.code) === String(externalId));
          const byId = allNodes.find((node: any) => String(node.id) === String(externalId));
          if (byCode || byId) {
            return byCode || byId;
          }
          // Fallback to published nodes
          const pubByCode = publishedNodes.find((node: any) => String(node.code) === String(externalId));
          const pubById = publishedNodes.find((node: any) => String(node.id) === String(externalId));
          return pubByCode || pubById || null;
        };

        // Apply deletions first
        for (const removedId of removedIds) {
          const targetNode = findByExternalId(removedId);
          if (targetNode) {
            await softDeleteQACriteriaNode('default', workingVersion, String(targetNode.id));
          }
        }

        // Refresh map after deletions
        workingCfg = await getQAConfigVersion('default', workingVersion);
        allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);

        const upsertCompat = async (criteria: any, options?: { forceAsLeaf?: boolean; parentId?: string }) => {
          const externalId = String(criteria.id || `qc_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
          const existingNode = findByExternalId(externalId);
          
          // Look up parent - first in parentLeafMap (newly created), then in allNodes (existing)
          let parentNode = criteria.parent_criteria_id ? findByExternalId(String(criteria.parent_criteria_id)) : null;
          let finalParentId = options?.parentId;
          
          if (!finalParentId && criteria.parent_criteria_id) {
            // Check if parent was just created in this batch
            const parentFromMap = parentLeafMap.get(criteria.parent_criteria_id);
            if (parentFromMap) {
              finalParentId = parentFromMap.parentDbId;
              console.log(`[QA Bulk Save] Found parent ${criteria.parent_criteria_id} in parentLeafMap: ${finalParentId}`);
            } else if (parentNode) {
              finalParentId = String(parentNode.id);
              console.log(`[QA Bulk Save] Found parent ${criteria.parent_criteria_id} in allNodes: ${finalParentId}`);
            }
          }

          if (criteria.parent_criteria_id && !finalParentId) {
            throw new Error(`Parent not found for criteria '${externalId}' (parent_id: ${criteria.parent_criteria_id})`);
          }

          const isLeaf = options?.forceAsLeaf || !!criteria.parent_criteria_id;
          
          // Only reuse existing node ID if it's from the current draft version (in allNodes)
          // Don't reuse IDs from published version since we cleared draft nodes
          const existingNodeInDraft = allNodes.find((n: any) => 
            String(n.code) === externalId || String(n.id) === externalId
          );
          
          await upsertQACriteriaNode('default', workingVersion, {
            id: existingNodeInDraft ? String(existingNodeInDraft.id) : undefined,
            parent_id: finalParentId,
            level: isLeaf ? 1 : 0,
            code: externalId,
            head: isLeaf
              ? String(parentNode?.title || criteria.parent_head || 'General').trim()
              : String(criteria.name || criteria.title || 'Criteria').trim(),
            title: String(criteria.name || criteria.title || '').trim(),
            detail: String(criteria.description || '').trim(),
            ai_prompt: String(criteria.ai_prompt || '').trim(),
            scoring_type: criteria.scoring_type || 'scale',
            max_score: Number(criteria.max_score || 5),
            weight: Number(criteria.weight || 0),
            sort_order: Number(criteria.sort_order || 0),
            is_required: !!criteria.is_required,
            is_active: true,
          } as any);
          
          // Refresh to get the actual node ID (especially for newly created nodes)
          const refreshedCfg = await getQAConfigVersion('default', workingVersion);
          const refreshedNodes = (refreshedCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
          const createdNode = refreshedNodes.find((n: any) => String(n.code) === externalId);
          
          return { externalId, nodeId: createdNode ? String(createdNode.id) : undefined };
        };

        const parents = criteriaList.filter((c: any) => !c.parent_criteria_id);
        const children = criteriaList.filter((c: any) => !!c.parent_criteria_id);
        
        // Track parent ID mappings for leaf creation
        const parentLeafMap = new Map<string, { parentDbId: string; criteria: any }>();

        // Upsert parents first so children can map parent ids correctly
        for (const criteria of parents) {
          console.log(`[QA Bulk Save] Processing parent: ${criteria.name} (${criteria.id})`);
          const result = await upsertCompat(criteria);
          console.log(`[QA Bulk Save] Parent upserted: externalId=${result.externalId}, nodeId=${result.nodeId}`);
          
          if (!result.nodeId) {
            throw new Error(`Failed to create parent criteria '${criteria.name}' - no node ID returned`);
          }
          
          // Store the mapping for leaf creation
          parentLeafMap.set(criteria.id, { parentDbId: result.nodeId, criteria });
          workingCfg = await getQAConfigVersion('default', workingVersion);
          allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        }

        // Track which parents have children provided in the request
        // This prevents auto-creating duplicate leaves
        const parentIdsWithChildrenInRequest = new Set(
          children.map((c: any) => c.parent_criteria_id).filter(Boolean)
        );
        console.log('[QA Bulk Save] Parents with children in request:', Array.from(parentIdsWithChildrenInRequest));
        
        // Then upsert children
        for (const criteria of children) {
          await upsertCompat(criteria);
          workingCfg = await getQAConfigVersion('default', workingVersion);
          allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        }
        
        // Create leaf children for parents that don't have any children yet
        // This preserves the user's scoring_type and max_score settings
        // BUT skip parents that already have children provided in the request
        console.log('[QA Bulk Save] Creating leaf children for parents without children...');
        console.log('[QA Bulk Save] ParentLeafMap entries:', Array.from(parentLeafMap.entries()).map(([k, v]) => ({ originalId: k, parentDbId: v.parentDbId, name: v.criteria.name })));
        
        for (const [originalId, { parentDbId, criteria }] of parentLeafMap) {
          if (!parentDbId) {
            console.error(`[QA Bulk Save] Skipping leaf creation for ${originalId} - no parentDbId`);
            continue;
          }
          
          // Skip if parent already has children provided in the request
          if (parentIdsWithChildrenInRequest.has(originalId)) {
            console.log(`[QA Bulk Save] Parent '${criteria.name}' has children in request, skipping auto-leaf creation`);
            continue;
          }
          
          const hasChildren = allNodes.some(
            (n: any) => Number(n.level) === 1 && String(n.parent_id) === String(parentDbId)
          );
          
          console.log(`[QA Bulk Save] Parent '${criteria.name}' (${parentDbId}) hasChildren=${hasChildren}`);
          
          if (!hasChildren) {
            console.log(`[QA Bulk Save] Creating leaf for parent '${criteria.name}' with scoring_type=${criteria.scoring_type}, max_score=${criteria.max_score}`);
            await upsertCompat(
              {
                ...criteria,
                id: `${originalId}__leaf`,
                name: criteria.name, // Same name as parent (user sees this as the criteria)
                weight: 100, // Full weight since it's the only child
              },
              { forceAsLeaf: true, parentId: parentDbId }
            );
            workingCfg = await getQAConfigVersion('default', workingVersion);
            allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
          }
        }

        // Final validation before publish
        workingCfg = await getQAConfigVersion('default', workingVersion);
        console.log('[QA Bulk Save] Final tree state:', JSON.stringify(workingCfg.tree?.map((p: any) => ({
          parent: p.title,
          children: p.children?.map((c: any) => ({ title: c.title, scoring_type: c.scoring_type, weight: c.weight }))
        }))));

        console.log('[QA Bulk Save] Publishing version...');
        await publishQAVersion('default', workingVersion);
        console.log('[QA Bulk Save] Published successfully');
        sendJson(res, 200, { success: true, message: 'Criteria saved' });
      } catch (error: any) {
        console.error('[QA Bulk Save] Error:', error);
        console.error('[QA Bulk Save] Stack:', error.stack);
        // Provide user-friendly error messages for common validation failures
        let message = error.message || 'Failed to bulk save criteria';
        if (message.includes('Cannot publish empty criteria')) {
          message = 'You must have at least one criteria. Please add a criteria before saving.';
        } else if (message.includes('must have sub-criteria')) {
          message = 'Each main criteria must have at least one sub-criteria. The system will auto-create one.';
        } else if (message.includes('must sum to 100')) {
          message = 'Sub-criteria weights must sum to exactly 100% under each main criteria.';
        } else if (message.includes('Config') && message.includes('not found')) {
          message = 'QA configuration not found. Please refresh the page.';
        }
        sendJson(res, 400, { error: message });
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
        // Legacy compatibility endpoint: always work on a fresh draft cloned from latest
        // published version to avoid stale/invalid draft state (e.g. orphan nodes).
        const workingVersion = (await createQADraftVersion('default', user.id)).version.id;
        const workingCfg = await getQAConfigVersion('default', workingVersion);
        const allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        const findByExternalId = (externalId: string | undefined) => {
          if (!externalId) return null;
          return (
            allNodes.find((node: any) => String(node.code) === String(externalId)) ||
            allNodes.find((node: any) => String(node.id) === String(externalId)) ||
            null
          );
        };
        const existingNode = findByExternalId(body.id);
        const parentNode = body.parent_criteria_id ? findByExternalId(body.parent_criteria_id) : null;
        if (body.parent_criteria_id && !parentNode) {
          throw new Error('Parent not found');
        }
        const externalId = String(body.id || `qc_${Date.now()}`);
        await upsertQACriteriaNode('default', workingVersion, {
          id: existingNode ? String(existingNode.id) : undefined,
          parent_id: parentNode ? String(parentNode.id) : null,
          level: body.parent_criteria_id ? 1 : 0,
          code: externalId,
          head: body.parent_criteria_id
            ? String(parentNode?.title || body.parent_head || 'General').trim()
            : String(body.name || body.title || 'Criteria').trim(),
          title: String(body.name || body.title || '').trim(),
          detail: String(body.description || '').trim(),
          ai_prompt: String(body.ai_prompt || '').trim(),
          scoring_type: body.scoring_type || 'scale',
          max_score: Number(body.max_score || 5),
          weight: Number(body.weight || 0),
          sort_order: Number(body.sort_order || 0),
          is_required: !!body.is_required,
          is_active: true,
        } as any);

        // Compatibility bridge for legacy flat UI:
        // Top-level rows in that UI are intended to be directly scorable.
        // V2 requires parent + at least one leaf child, so auto-provision one leaf.
        if (!body.parent_criteria_id) {
          const refreshed = await getQAConfigVersion('default', workingVersion);
          const refreshedNodes = (refreshed.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
          const parentForCompat =
            refreshedNodes.find((node: any) => String(node.code) === externalId && Number(node.level) === 0) ||
            refreshedNodes.find((node: any) => String(node.id) === externalId && Number(node.level) === 0);

          if (parentForCompat) {
            const children = refreshedNodes.filter(
              (node: any) => Number(node.level) === 1 && String(node.parent_id || '') === String(parentForCompat.id)
            );

            if (children.length === 0) {
              await upsertQACriteriaNode('default', workingVersion, {
                parent_id: String(parentForCompat.id),
                level: 1,
                code: `${externalId}__leaf`,
                head: String(parentForCompat.title || body.name || body.title || 'Criteria').trim(),
                title: String(body.name || body.title || 'Criteria').trim(),
                detail: String(body.description || '').trim(),
                ai_prompt: String(body.ai_prompt || '').trim(),
                scoring_type: body.scoring_type || 'scale',
                max_score: Number(body.max_score || 5),
                weight: 100,
                sort_order: 0,
                is_required: !!body.is_required,
                is_active: true,
              } as any);
            }
          }
        }
        await publishQAVersion('default', workingVersion);
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
        // Legacy compatibility endpoint: use a fresh draft to avoid operating on
        // stale drafts that may violate parent/sub invariants.
        const workingVersion = (await createQADraftVersion('default', user.id)).version.id;
        const workingCfg = await getQAConfigVersion('default', workingVersion);
        const allNodes = (workingCfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        const targetNode =
          allNodes.find((node: any) => String(node.code) === String(criteriaId)) ||
          allNodes.find((node: any) => String(node.id) === String(criteriaId));
        if (!targetNode) {
          throw new Error('Criteria node not found');
        }
        const parents = workingCfg.tree || [];
        const leaves = parents.flatMap((p: any) => p.children || []);
        const isParent = Number(targetNode.level || 0) === 0;
        if (isParent && parents.length <= 1) {
          sendJson(res, 400, { error: 'Cannot delete the last parent criteria' });
          return;
        }
        if (!isParent && leaves.length <= 1) {
          sendJson(res, 400, { error: 'Cannot delete the last sub-criteria' });
          return;
        }
        await softDeleteQACriteriaNode('default', workingVersion, String(targetNode.id));
        await publishQAVersion('default', workingVersion);
        sendJson(res, 200, { success: true, message: 'Criteria deleted' });
      } catch (error: any) {
        console.error('Delete QA criteria error:', error);
        if (String(error?.message || '').includes('Cannot publish empty criteria')) {
          sendJson(res, 400, { error: 'Cannot delete all criteria. Keep at least one parent with one sub-criteria.' });
          return;
        }
        sendJson(res, 500, { error: error.message || 'Failed to delete criteria' });
      }
      return;
    }
    
    // Get QA criteria hierarchy (with sub-criteria)
    if (method === 'GET' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'criteria' && segments[2] === 'hierarchy') {
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
        const cfg = await getQAConfigVersion('default');
        const hierarchy = (cfg.tree || []).map((parent: any) => ({
          id: String(parent.code || parent.id),
          name: parent.title,
          description: parent.detail,
          ai_prompt: parent.ai_prompt || '',
          scoring_type: 'scale',
          max_score: 100,
          weight: parent.weight || 0,
          is_required: false,
          sort_order: parent.sort_order || 0,
          parent_criteria_id: undefined,
          level: 0,
          calculated_weight: parent.weight || 0,
          children: (parent.children || []).map((child: any) => ({
            id: String(child.code || child.id),
            name: child.title,
            description: child.detail,
            ai_prompt: child.ai_prompt || '',
            scoring_type: child.scoring_type || 'scale',
            max_score: child.max_score || 5,
            weight: child.weight || 0,
            is_required: !!child.is_required,
            sort_order: child.sort_order || 0,
            parent_criteria_id: String(parent.code || parent.id),
            level: 1,
            calculated_weight: child.weight || 0,
            children: [],
          })),
        }));
        sendJson(res, 200, { success: true, data: hierarchy });
      } catch (error) {
        console.error('Get QA hierarchy error:', error);
        sendJson(res, 500, { error: 'Failed to get criteria hierarchy' });
      }
      return;
    }
    
    // Get QA config weights
    if (method === 'GET' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'weights') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const configId = segments[2];
      
      try {
        const weights = await getQAWeightsV2(configId);
        sendJson(res, 200, { success: true, data: weights });
      } catch (error) {
        console.error('Get QA weights error:', error);
        sendJson(res, 500, { error: 'Failed to get config weights' });
      }
      return;
    }
    
    // Save QA config weight
    if (method === 'POST' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'weights') {
      if (!token) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      
      const user = await validateSession(token);
      
      if (!user) {
        sendJson(res, 401, { error: 'Invalid or expired session' });
        return;
      }
      
      const configId = segments[2];
      const body = await parseBody(req);
      
      try {
        const criteriaId = String(body.criteria_id);
        const weight = Number(body.weight) || 0;
        const cfg = await getQAConfigVersion(configId);
        const allNodes = (cfg.tree || []).flatMap((parent: any) => [parent, ...(parent.children || [])]);
        const targetNode =
          allNodes.find((node: any) => String(node.code) === criteriaId) ||
          allNodes.find((node: any) => String(node.id) === criteriaId);
        if (!targetNode) {
          throw new Error('Criteria not found');
        }
        await saveQAWeightV2(configId, String(targetNode.id), weight);
        sendJson(res, 200, { success: true, message: 'Weight saved' });
      } catch (error: any) {
        console.error('Save QA weight error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to save weight' });
      }
      return;
    }
    
    // Auto-distribute QA weights equally
    if (method === 'POST' && segments.length === 3 && segments[0] === 'qa' && segments[1] === 'weights' && segments[2] === 'auto-distribute') {
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
      const configId = body.config_id || 'default';
      
      try {
        await autoDistributeWeightsV2(configId);
        sendJson(res, 200, { success: true, message: 'Weights auto-distributed' });
      } catch (error: any) {
        console.error('Auto-distribute weights error:', error);
        sendJson(res, 500, { error: error.message || 'Failed to auto-distribute weights' });
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
        const review = await saveHumanQAReviewV2({
          call_id: body.call_id,
          reviewer_id: user.id,
          general_feedback: body.general_feedback,
          status: body.status,
          config_id: body.config_id || 'default',
          config_version_id: body.config_version_id,
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
        const qaData = await getCompleteQADataV2(callId, user.id);
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
        await initializeQAV2();
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
      await initializeQAV2();
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

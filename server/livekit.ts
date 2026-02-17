/**
 * LiveKit integration for real-time voice calls
 * Provides token generation and agent dispatch for training sessions
 */

import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

// LiveKit configuration from environment variables
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';

export interface TokenRequest {
  roomName: string;
  participantName: string;
  userId: string;
}

export interface TokenResponse {
  token: string;
  url: string;
}

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateLiveKitToken(
  request: TokenRequest
): Promise<TokenResponse> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials not configured');
  }

  // Create token with 1 hour expiration
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: request.participantName,
    name: request.participantName,
    ttl: 60 * 60, // 1 hour
  });

  // Grant permissions for the room
  at.addGrant({
    roomJoin: true,
    room: request.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url: LIVEKIT_URL,
  };
}

/**
 * Check if LiveKit is properly configured
 */
export function isLiveKitConfigured(): boolean {
  return !!(
    LIVEKIT_API_KEY &&
    LIVEKIT_API_SECRET &&
    LIVEKIT_URL
  );
}

/**
 * Generate a unique room name for a scenario session
 */
export function generateRoomName(scenarioId: string, userId: string): string {
  const timestamp = Date.now();
  return `axtra-${scenarioId}-${userId}-${timestamp}`;
}

/**
 * Dispatch AI agent to a room with persona/scenario configuration
 */
export async function dispatchAgent(
  roomName: string,
  personaConfig: {
    id: string;
    name: string;
    behaviorProfile?: {
      initialMood?: string;
      patienceLevel?: string;
      cooperationLevel?: string;
    };
    systemPrompt?: string;
    voiceId?: string;
  },
  scenarioConfig: {
    id: string;
    title: string;
    description?: string;
    difficulty?: string;
  },
  userInfo?: {
    userId: string;
    userName?: string;
  }
): Promise<{ dispatchId: string; agentName: string }> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error('LiveKit credentials not configured');
  }

  // Create agent dispatch client
  const dispatchClient = new AgentDispatchClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET
  );

  // Build metadata for the agent
  const metadata = JSON.stringify({
    persona_config: {
      id: personaConfig.id,
      name: personaConfig.name,
      behavior_profile: personaConfig.behaviorProfile || {},
      system_prompt: personaConfig.systemPrompt || '',
      voice_id: personaConfig.voiceId || 'shimmer',
    },
    scenario_config: {
      id: scenarioConfig.id,
      title: scenarioConfig.title,
      description: scenarioConfig.description || '',
      difficulty: scenarioConfig.difficulty || 'Medium',
    },
    user_info: userInfo || {},
    dispatched_at: new Date().toISOString(),
  });

  // Dispatch the agent to the room
  const dispatch = await dispatchClient.createDispatch(
    roomName,
    'axtra-training-agent',  // Must match agent_name in Python worker
    { metadata }
  );

  return {
    dispatchId: dispatch.id,
    agentName: dispatch.agentName,
  };
}

/**
 * LiveKit integration for real-time voice calls
 * Provides token generation and agent dispatch for training sessions
 */

import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import {
  listGeneralPromotions,
  listPersonalPromotions,
  type GeneralPromotion,
  type PersonalPromotion,
} from './offers';

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
 * Customer info for promotion matching
 */
interface CustomerInfo {
  tier?: string;                    // Gold, Silver, Bronze, Platinum
  tenure_months?: number;           // How long as member
  account_age_years?: number;       // Account creation date
  ltv?: number;                     // Lifetime value
  days_since_last_purchase?: number;
  previous_promotions_used?: string[];
}

/**
 * Scan available promotions for a customer based on their profile
 * Uses multiple criteria: tier, tenure, account age, trigger conditions
 */
async function scanAvailablePromotions(
  userId: string,
  customerInfo: CustomerInfo
): Promise<Array<{
  type: 'general' | 'personal';
  id: string;
  name: string;
  name_th?: string;
  description: string;
  discount_type: string;
  discount_value?: number;
  trigger_type?: string;
  trigger_conditions?: object;
  auto_apply?: boolean;
  urgency_score?: number;  // 1-10, higher = more urgent to offer
  match_reason?: string;   // Why this promo matches
}>> {
  try {
    const availablePromotions: Array<{
      type: 'general' | 'personal';
      id: string;
      name: string;
      name_th?: string;
      description: string;
      discount_type: string;
      discount_value?: number;
      trigger_type?: string;
      trigger_conditions?: object;
      auto_apply?: boolean;
      urgency_score?: number;
      match_reason?: string;
    }> = [];
    
    const { tier = 'Standard', tenure_months = 0, account_age_years = 0, ltv = 0 } = customerInfo;
    
    console.log(`\n🔍 PROMOTION SCAN - Customer Profile:`);
    console.log(`   Tier: ${tier}`);
    console.log(`   Tenure: ${tenure_months} months`);
    console.log(`   Account Age: ${account_age_years} years`);
    console.log(`   LTV: ${ltv}`);
    
    // Get active general promotions (public campaigns)
    const generalPromos = await listGeneralPromotions(userId);
    const activeGeneral = generalPromos.filter(p => p.status === 'active');
    
    for (const promo of activeGeneral) {
      availablePromotions.push({
        type: 'general',
        id: promo.id,
        name: promo.name,
        name_th: promo.name_th,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        trigger_type: 'manual',  // General promos are manual by default
        urgency_score: 5,        // Medium urgency
        match_reason: 'Public campaign available to all customers',
      });
    }
    
    // Get active personal promotions with FULL criteria matching
    const personalPromos = await listPersonalPromotions(userId);
    
    for (const promo of personalPromos) {
      if (promo.status !== 'active') continue;
      
      let matches = true;
      const matchReasons: string[] = [];
      let urgencyScore = 5;
      
      // 1. Check Tier Match
      if (promo.target_tiers && promo.target_tiers.length > 0) {
        if (!promo.target_tiers.includes(tier)) {
          matches = false;
        } else {
          matchReasons.push(`Tier match: ${tier}`);
          urgencyScore += 1;
        }
      }
      
      // 2. Check Minimum Tenure
      if (matches && promo.target_min_tenure_months !== undefined) {
        if (tenure_months < promo.target_min_tenure_months) {
          matches = false;
        } else {
          matchReasons.push(`Tenure: ${tenure_months}m >= ${promo.target_min_tenure_months}m`);
          urgencyScore += 1;
        }
      }
      
      // 3. Check Maximum Tenure
      if (matches && promo.target_max_tenure_months !== undefined) {
        if (tenure_months > promo.target_max_tenure_months) {
          matches = false;
        } else {
          matchReasons.push(`Tenure within range`);
        }
      }
      
      // 4. Check Account Age
      if (matches && promo.target_account_age_years !== undefined) {
        if (account_age_years < promo.target_account_age_years) {
          matches = false;
        } else {
          matchReasons.push(`Account age: ${account_age_years}y >= ${promo.target_account_age_years}y`);
          urgencyScore += 1;
        }
      }
      
      // 5. Check Trigger Conditions (LTV, etc.)
      if (matches && promo.trigger_conditions) {
        const conditions = promo.trigger_conditions;
        
        if (conditions.ltv_minimum !== undefined && ltv > 0) {
          if (ltv < conditions.ltv_minimum) {
            matches = false;
          } else {
            matchReasons.push(`LTV: ${ltv} >= ${conditions.ltv_minimum}`);
            urgencyScore += 1;
          }
        }
      }
      
      // 6. Adjust urgency based on trigger type
      if (matches && promo.trigger_type) {
        switch (promo.trigger_type) {
          case 'auto_churn_risk':
            urgencyScore = 10;  // Highest urgency
            matchReasons.push('CHURN RISK - Offer immediately if customer threatens to leave');
            break;
          case 'auto_escalation':
            urgencyScore = 9;
            matchReasons.push('ESCALATION - Offer when customer complains loudly');
            break;
          case 'auto_birthday':
            urgencyScore = 7;
            matchReasons.push('BIRTHDAY - Special occasion');
            break;
          case 'auto_anniversary':
            urgencyScore = 6;
            matchReasons.push('ANNIVERSARY - Milestone reward');
            break;
          case 'manual':
            urgencyScore = 4;
            matchReasons.push('Manual - Suggest when appropriate');
            break;
        }
      }
      
      // Add to available if all criteria match
      if (matches) {
        availablePromotions.push({
          type: 'personal',
          id: promo.id,
          name: promo.name,
          name_th: promo.name_th,
          description: promo.description,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          trigger_type: promo.trigger_type,
          trigger_conditions: promo.trigger_conditions,
          auto_apply: promo.auto_apply,
          urgency_score: urgencyScore,
          match_reason: matchReasons.join(', ') || 'General match',
        });
      }
    }
    
    // Sort by urgency score (highest first)
    availablePromotions.sort((a, b) => (b.urgency_score || 0) - (a.urgency_score || 0));
    
    console.log(`\n🎁 PROMOTION SCAN RESULTS:`);
    console.log(`   General Promotions: ${activeGeneral.length}`);
    console.log(`   Personal Promotions Matched: ${availablePromotions.filter(p => p.type === 'personal').length}`);
    console.log(`   Total Available: ${availablePromotions.length}`);
    
    // Log top matches
    if (availablePromotions.length > 0) {
      console.log(`\n   Top Matches:`);
      availablePromotions.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. [${p.type}] ${p.name} (Urgency: ${p.urgency_score}/10)`);
        if (p.match_reason) console.log(`       Reason: ${p.match_reason}`);
      });
    }
    
    return availablePromotions;
  } catch (error) {
    console.error('[LiveKit] Error scanning promotions:', error);
    return [];
  }
}

/**
 * Dispatch AI agent to a room with persona/scenario configuration
 */
export async function dispatchAgent(
  roomName: string,
  personaConfig: {
    id: string;
    name: string;
    tier?: string;                    // Customer tier (Gold, Silver, etc.)
    tenureMonths?: number;            // Membership duration
    accountAgeYears?: number;         // Account age
    ltv?: number;                     // Lifetime value
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
  console.log('\n📡 LIVEKIT DISPATCH: Preparing to dispatch agent...');
  
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error('LiveKit credentials not configured');
  }

  // Scan available promotions before dispatching
  const customerInfo: CustomerInfo = {
    tier: personaConfig.tier || 'Standard',
    tenure_months: personaConfig.tenureMonths || 0,
    account_age_years: personaConfig.accountAgeYears || 0,
    ltv: personaConfig.ltv || 0,
  };
  
  const userId = userInfo?.userId || '';
  const availablePromotions = await scanAvailablePromotions(userId, customerInfo);

  // Create agent dispatch client
  const dispatchClient = new AgentDispatchClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET
  );

  // Build metadata for the agent
  const metadataPayload = {
    persona_config: {
      id: personaConfig.id,
      name: personaConfig.name,
      tier: personaConfig.tier || 'Standard',
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
    available_promotions: availablePromotions,  // NEW: Pass promotions to agent
    dispatched_at: new Date().toISOString(),
  };
  
  const metadata = JSON.stringify(metadataPayload);
  
  console.log('\n📦 METADATA PAYLOAD (sent to Python Agent):');
  console.log('   ┌─ persona_config ─────────────────────────────────────┐');
  console.log(`   │ id: ${metadataPayload.persona_config.id}`);
  console.log(`   │ name: ${metadataPayload.persona_config.name}`);
  console.log(`   │ tier: ${metadataPayload.persona_config.tier}`);
  console.log(`   │ voice_id: ${metadataPayload.persona_config.voice_id}`);
  console.log(`   │ system_prompt: ${metadataPayload.persona_config.system_prompt?.substring(0, 100)}...`);
  console.log(`   │ behavior_profile: ${JSON.stringify(metadataPayload.persona_config.behavior_profile)}`);
  console.log('   └──────────────────────────────────────────────────────┘');
  console.log('   ┌─ scenario_config ────────────────────────────────────┐');
  console.log(`   │ id: ${metadataPayload.scenario_config.id}`);
  console.log(`   │ title: ${metadataPayload.scenario_config.title}`);
  console.log(`   │ difficulty: ${metadataPayload.scenario_config.difficulty}`);
  console.log('   └──────────────────────────────────────────────────────┘');
  console.log('   ┌─ user_info ──────────────────────────────────────────┐');
  console.log(`   │ userId: ${metadataPayload.user_info.userId}`);
  console.log(`   │ userName: ${metadataPayload.user_info.userName}`);
  console.log('   └──────────────────────────────────────────────────────┘');
  console.log('   ┌─ available_promotions ───────────────────────────────┐');
  console.log(`   │ Count: ${availablePromotions.length}`);
  availablePromotions.slice(0, 3).forEach((p, i) => {
    console.log(`   │ ${i + 1}. [${p.type}] ${p.name.substring(0, 40)}...`);
  });
  if (availablePromotions.length > 3) {
    console.log(`   │ ... and ${availablePromotions.length - 3} more`);
  }
  console.log('   └──────────────────────────────────────────────────────┘');
  console.log(`   📅 dispatched_at: ${metadataPayload.dispatched_at}`);
  console.log(`\n   📏 Metadata size: ${metadata.length} characters`);
  
  // Dispatch the agent to the room
  console.log(`\n🚀 Calling LiveKit API to create dispatch...`);
  console.log(`   Room: ${roomName}`);
  console.log(`   Agent: axtra-training-agent`);
  
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

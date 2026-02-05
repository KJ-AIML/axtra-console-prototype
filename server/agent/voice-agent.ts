/**
 * LiveKit AI Voice Agent for Call Center Training
 * Uses OpenAI GPT-4o Realtime API with voice.Agent for automatic audio handling
 */

import { JobContext, defineAgent } from '@livekit/agents';
import { Agent, AgentSession } from '@livekit/agents/voice';
import * as openai from '@livekit/agents-plugin-openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger
const logger = {
  info: (msg: string, meta?: unknown) => console.log(`[VoiceAgent] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, err?: unknown) => console.error(`[VoiceAgent] ERROR: ${msg}`, err || ''),
};

// Valid OpenAI Realtime voices
type OpenAIVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';

interface ScenarioPersona {
  id: string;
  name: string;
  systemPrompt: string;
  initialGreeting: string;
  voice: OpenAIVoice;
}

const SCENARIO_PERSONAS: Record<string, ScenarioPersona> = {
  'billing-dispute': {
    id: 'billing-dispute',
    name: 'Angry Billing Customer',
    systemPrompt: `You are an angry customer calling about a billing dispute. Your bill is $350 when it should be $85. You're frustrated and want immediate resolution. Be aggressive but can soften if the agent shows empathy.`,
    initialGreeting: "Hello? I'm calling about my bill. It's absolutely outrageous this month! Three hundred and fifty dollars?! My bill is supposed to be eighty-five dollars. I've been a customer for three years and this is how you treat me? I need this fixed RIGHT NOW!",
    voice: 'ash',
  },
  'technical-support': {
    id: 'technical-support',
    name: 'Frustrated Tech User',
    systemPrompt: `You are a frustrated customer with technical issues. Your internet has been down for 3 hours. You're stressed but willing to follow troubleshooting.`,
    initialGreeting: "Hi, my internet has been completely down for three hours now. I have an important video call in 30 minutes. Can you help me troubleshoot?",
    voice: 'echo',
  },
  'sales-upsell': {
    id: 'sales-upsell',
    name: 'Interested Customer',
    systemPrompt: `You are a customer interested in upgrading your plan. You're cautious about pricing but interested in new features.`,
    initialGreeting: "Hi! I saw your ad about new premium plans. I'm on the basic plan and curious about upgrade options. What features would I get?",
    voice: 'coral',
  },
  'retention': {
    id: 'retention',
    name: 'Canceling Customer',
    systemPrompt: `You are disappointed and want to cancel service due to recent outages. You're firm about leaving unless given a compelling reason.`,
    initialGreeting: "I'd like to cancel my service. I've had multiple outages and customer service hasn't been helpful. I found a better deal elsewhere.",
    voice: 'sage',
  },
  'compliance-privacy': {
    id: 'compliance-privacy',
    name: 'Suspicious Caller',
    systemPrompt: `You are cautious about data privacy. You received a suspicious call asking for personal info. Ask verification questions.`,
    initialGreeting: "I received a call earlier claiming to be from your company asking for my social security number. Was this legitimate?",
    voice: 'alloy',
  },
  'returns': {
    id: 'returns',
    name: 'Upset Return Customer',
    systemPrompt: `You are upset about receiving a damaged product. You want a full refund including shipping.`,
    initialGreeting: "I need to return a damaged product. I paid for expedited shipping. I want a full refund including shipping.",
    voice: 'ballad',
  },
  'vip-support': {
    id: 'vip-support',
    name: 'VIP Customer',
    systemPrompt: `You are a premium customer with high expectations. You're interested in upgrades and expect white-glove service.`,
    initialGreeting: "Good afternoon. I'm a long-time premium member interested in your latest upgrade options. I value my time.",
    voice: 'shimmer',
  },
  'fraud-alert': {
    id: 'fraud-alert',
    name: 'Panicked Fraud Victim',
    systemPrompt: `You are anxious about suspicious charges. You want immediate protection.`,
    initialGreeting: "I received a text about a suspicious $450 charge I didn't make! Block my card immediately!",
    voice: 'verse',
  },
};

function getScenarioFromRoom(roomName: string): ScenarioPersona | null {
  const parts = roomName.split('-');
  if (parts.length < 3 || parts[0] !== 'axtra') {
    return null;
  }

  const scenarioId = parts[1].toLowerCase();
  
  const mapping: Record<string, string> = {
    'billing': 'billing-dispute',
    'technical': 'technical-support',
    'sales': 'sales-upsell',
    'retention': 'retention',
    'compliance': 'compliance-privacy',
    'returns': 'returns',
    'vip': 'vip-support',
    'fraud': 'fraud-alert',
  };

  const key = mapping[scenarioId] || scenarioId;
  return SCENARIO_PERSONAS[key] || SCENARIO_PERSONAS['billing-dispute'];
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const roomName = ctx.room.name;
    logger.info('Agent connected to room', { room: roomName });

    const persona = getScenarioFromRoom(roomName);
    if (!persona) {
      logger.error('Could not determine scenario from room name', { roomName });
      return;
    }

    logger.info('Using persona', { persona: persona.name, voice: persona.voice });

    try {
      // Create OpenAI Realtime model
      const model = new openai.realtime.RealtimeModel({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: persona.voice,
        modalities: ['audio', 'text'],
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
      });

      // Create Agent using the high-level API
      // This handles all audio automatically
      const agent = new Agent({
        instructions: persona.systemPrompt,
        llm: model,
        turnDetection: 'realtime_llm',
      });

      // Create AgentSession
      const session = new AgentSession({
        agent,
        turnDetection: 'realtime_llm',
      });

      logger.info('Agent and session created');

      // Listen for events
      session.on('agent_state_changed', (ev) => {
        logger.info('Agent state changed', { state: ev.state });
      });

      session.on('user_input_transcribed', (ev) => {
        logger.info('User said', { text: ev.text });
      });

      // Connect session to the room
      await session.start(ctx.room);

      logger.info('Session started in room');

      // Send initial greeting
      setTimeout(async () => {
        try {
          logger.info('Sending initial greeting...');
          const speech = await agent.say(persona.initialGreeting);
          await speech.waitForCompletion();
          logger.info('Initial greeting completed');
        } catch (error) {
          logger.error('Failed to send greeting', error);
        }
      }, 1500);

      // Keep agent running until room disconnects
      await new Promise<void>((resolve) => {
        ctx.room.once('disconnected', () => {
          logger.info('Room disconnected');
          resolve();
        });
      });

      // Cleanup
      await session.close();

    } catch (error) {
      logger.error('Error in agent entry', error);
    }

    logger.info('Agent session ended', { room: roomName });
  },
});

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  logger.info('Starting LiveKit Voice Agent...');
  
  import('@livekit/agents').then(({ cli }) => {
    cli.runApp({
      agent: fileURLToPath(import.meta.url),
      apiKey: process.env.LIVEKIT_API_KEY || '',
      apiSecret: process.env.LIVEKIT_API_SECRET || '',
      wsUrl: process.env.LIVEKIT_URL || '',
      production: process.env.NODE_ENV === 'production',
    });
  });
}

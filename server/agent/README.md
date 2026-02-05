# LiveKit AI Voice Agent

This directory contains the LiveKit AI Voice Agent for call center training simulations.

## Files

- `voice-agent.ts` - Main agent implementation with scenario personas
- `run-agent.ts` - Entry point to start the agent worker

## Quick Start

```bash
# Install dependencies (already included in root package.json)
npm install

# Set required environment variables in .env.local:
# - LIVEKIT_API_KEY
# - LIVEKIT_API_SECRET
# - LIVEKIT_URL
# - OPENAI_API_KEY

# Start the agent
npm run agent

# Or with hot reload
npm run agent:dev
```

## How It Works

1. The agent runs as a worker that connects to LiveKit Cloud
2. When a user starts a training scenario, the client creates a LiveKit room
3. The room name format is: `axtra-{scenarioId}-{userId}-{timestamp}`
4. The agent detects the room creation and joins automatically
5. Based on the scenario ID in the room name, the agent selects a persona
6. The agent greets the user and engages in realistic conversation using OpenAI GPT-4o Realtime API

## Available Personas

### Billing Dispute (billing-dispute)
- **Voice**: Nova
- **Personality**: Angry, loud, feels betrayed
- **Goal**: Get charges explained and removed
- **Difficulty**: Hard

### Technical Support (technical-support)
- **Voice**: Echo
- **Personality**: Frustrated but professional, work-from-home impact
- **Goal**: Get internet fixed, avoid technician fees
- **Difficulty**: Medium

### Sales Upsell (sales-upsell)
- **Voice**: Coral
- **Personality**: Interested, budget-conscious
- **Goal**: Learn about promotions without pressure
- **Difficulty**: Easy

### Retention (retention)
- **Voice**: Ash
- **Personality**: Disappointed, already decided to leave
- **Goal**: Cancel without hassle
- **Difficulty**: Medium

### Compliance/Privacy (compliance-privacy)
- **Voice**: Fable
- **Personality**: Suspicious, protective of information
- **Goal**: Verify legitimacy, report fraud
- **Difficulty**: Hard

### Returns (returns)
- **Voice**: Onyx
- **Personality**: Upset about damaged goods
- **Goal**: Full refund with shipping
- **Difficulty**: Easy

### VIP Support (vip-support)
- **Voice**: Alloy
- **Personality**: Expects premium service, efficient
- **Goal**: Upgrade with best offer
- **Difficulty**: Medium

### Fraud Alert (fraud-alert)
- **Voice**: Shimmer
- **Personality**: Anxious, panicked, needs immediate action
- **Goal**: Block card, verify charges
- **Difficulty**: Hard

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Client    │────────►│ LiveKit Cloud│◄────────│  AI Agent    │
│   Browser    │  WS     │     SFU      │  WS     │  (Node.js)   │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                  ┌──────▼───────┐
                                                  │ OpenAI GPT-4o│
                                                  │   Realtime   │
                                                  └──────────────┘
```

## Voice Technology

- **LiveKit Agents**: Handles room connections and media streaming
- **OpenAI GPT-4o Realtime**: Natural voice conversations with low latency
- **Server VAD**: Voice Activity Detection for natural turn-taking
- **Multiple Voices**: Each persona uses a distinct OpenAI voice

## Extending the Agent

### Adding a New Scenario

1. Add persona definition to `SCENARIO_PERSONAS` in `voice-agent.ts`:

```typescript
'my-scenario': {
  id: 'my-scenario',
  name: 'My Scenario Name',
  scenarioType: 'Category',
  systemPrompt: `Detailed personality and context prompt...`,
  initialGreeting: "Hello, I'm calling about...",
  personality: {
    aggression: 5,
    patience: 5,
    techSavvy: 5,
    formality: 5,
  },
  voiceConfig: {
    voice: 'nova', // alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer
    speed: 1.0,
  },
}
```

2. Add room name mapping in `getScenarioFromRoom()` function

3. Restart the agent

### Customizing Voice Settings

Available OpenAI voices:
- `alloy` - Neutral, balanced
- `ash` - Warm, gentle
- `coral` - Friendly, approachable
- `echo` - Professional, clear
- `fable` - Storyteller style
- `onyx` - Authoritative, deep
- `nova` - Energetic, upbeat
- `sage` - Calm, thoughtful
- `shimmer` - Bright, expressive

## Troubleshooting

### Agent won't start
- Check all environment variables are set
- Verify LiveKit credentials are correct
- Ensure OpenAI API key has access to GPT-4o Realtime

### No voice response
- Check browser microphone permissions
- Verify room name format is correct: `axtra-{scenarioId}-{userId}-{timestamp}`
- Check LiveKit Cloud dashboard for connection status

### Delayed responses
- Check network latency to LiveKit servers
- Verify OpenAI API key is valid and not rate-limited
- Check LiveKit Cloud plan limits

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LIVEKIT_API_KEY` | LiveKit project API key | Yes |
| `LIVEKIT_API_SECRET` | LiveKit project API secret | Yes |
| `LIVEKIT_URL` | LiveKit WebSocket URL (wss://...) | Yes |
| `OPENAI_API_KEY` | OpenAI API key with GPT-4o access | Yes |
| `NODE_ENV` | Set to `production` for production | No |
| `DEBUG` | Set to `true` for debug logging | No |

## Links

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io/)

# LiveKit AI Voice Agent Setup

## ✅ Agent is Working!

Your AI voice agent is now connected to LiveKit and ready to greet users!

## 🚀 How to Run Both Services

You need to run **TWO** terminal windows:

### Terminal 1: Start the AI Voice Agent
```bash
npm run agent
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║         Axtra AI Voice Agent - Call Center Training            ║
╚════════════════════════════════════════════════════════════════╝

Scenarios: 💰 Billing | 🔧 Technical | 💼 Sales | 🚪 Retention
           🔒 Compliance | 📦 Returns | ⭐ VIP | 🚨 Fraud

[Agent] Starting agent...
[Agent] Waiting for room connections...

─────────────────────────────────────────────────────────────────
Agent is running. Press Ctrl+C to stop.
─────────────────────────────────────────────────────────────────

[INFO] registered worker
    id: "AW_..."
    server_info: { "edition": "Cloud", ... }
```

### Terminal 2: Start the Web App
```bash
npm run dev
```

## 🎯 Testing the Voice Agent

1. Open http://localhost:3000 in your browser
2. Login with demo account (admin@axtra.local / admin123)
3. Go to **Simulations**
4. Click **"Start Practice"** on any scenario
5. Click **"Start Voice Call"**
6. The AI agent will **automatically join and greet you!**

## 🎭 Available Personas

| Scenario | AI Persona | Voice | Greeting Style |
|----------|-----------|-------|----------------|
| Billing Dispute | Angry Customer | Nova | Aggressive, frustrated |
| Technical Support | Frustrated User | Echo | Stressed but cooperative |
| Sales Upsell | Interested Customer | Coral | Curious, asks questions |
| Retention | Canceling Customer | Ash | Disappointed, firm |
| Compliance | Suspicious Caller | Fable | Cautious, many questions |
| Returns | Upset Customer | Onyx | Frustrated about damage |
| VIP Support | Premium Customer | Alloy | Professional, direct |
| Fraud Alert | Panicked Victim | Shimmer | Anxious, urgent |

## 🔧 Troubleshooting

### "Port already in use" error
Kill existing processes:
```bash
# Windows
Get-Process node | Stop-Process -Force

# Mac/Linux
pkill -f node
```

### Agent not greeting
1. Check that `npm run agent` is running in Terminal 1
2. Check that LiveKit credentials are in `.env`
3. Check that OpenAI API key is valid

### No audio
1. Make sure you clicked "Start Voice Call" (browser requires user gesture)
2. Allow microphone permission when prompted
3. Check your speakers/headphones

## 📝 Environment Variables

Make sure `.env` has:
```bash
# LiveKit (from https://livekit.io/cloud)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret

# OpenAI (from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your_key
```

## 🎉 Success!

When everything works:
1. You click "Start Voice Call"
2. Agent joins room automatically
3. Agent speaks greeting using GPT-4o Realtime
4. You can have a natural voice conversation!

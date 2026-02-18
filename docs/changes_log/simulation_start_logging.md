# Simulation Start Logging - Complete Data Flow

**Date:** 2026-02-17  
**Purpose:** Track complete data flow from "Start Simulation" button click to AI Agent initialization

---

## Overview

This document describes the comprehensive logging added to track the complete data flow when an operator clicks the "Start Simulation" button, through the backend dispatch, to the Python AI Agent receiving and processing the configuration.

---

## Log Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. FRONTEND: Operator clicks "Start Simulation"                            │
│     File: src/pages/ActiveSimulation.tsx                                     │
│     Function: handleStartCall()                                              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ Console Logs
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. BACKEND: API receives POST /api/simulations/start                       │
│     File: server/index.ts                                                    │
│     Endpoint: simulations/start                                              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ Server Logs
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. LIVEKIT: Dispatch agent with metadata                                   │
│     File: server/livekit.ts                                                  │
│     Function: dispatchAgent()                                                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ LiveKit Dispatch
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. PYTHON AGENT: Receives dispatch and parses metadata                     │
│     File: server/agent/python-livekit/livekit_agent_langchain.py             │
│     Function: entrypoint()                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend Logging

**Location:** `src/pages/ActiveSimulation.tsx` - `handleStartCall()`

### When Operator Clicks "Start Simulation":

```javascript
console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #4F46E5; ...');
console.log('%c║         AXTRA SIMULATION START REQUEST                     ║', 'color: #4F46E5; ...');
console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #4F46E5; ...');
console.log('[Simulation] 🚀 Operator clicked "Start Simulation"');
console.log('[Simulation] 📋 Scenario ID:', scenarioId);
console.log('[Simulation] 👤 Operator:', user?.name || user?.email || 'Unknown');
console.log('[Simulation] 🕐 Timestamp:', new Date().toISOString());
console.log('[Simulation] Sending POST /api/simulations/start...');
```

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║         AXTRA SIMULATION START REQUEST                     ║
╚════════════════════════════════════════════════════════════╝
[Simulation] 🚀 Operator clicked "Start Simulation"
[Simulation] 📋 Scenario ID: a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2
[Simulation] 👤 Operator: Admin User
[Simulation] 🕐 Timestamp: 2026-02-17T10:30:00.000Z
[Simulation] Sending POST /api/simulations/start...
```

### After Successful Response:

```javascript
console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #10B981; ...');
console.log('%c║         SIMULATION STARTED SUCCESSFULLY                    ║', 'color: #10B981; ...');
console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #10B981; ...');
console.log('[Simulation] ✅ Dispatch ID:', simData.dispatchId);
console.log('[Simulation] 🤖 AI Agent Name:', simData.agentName);
console.log('[Simulation] 🎭 Persona:', simData.persona.name);
console.log('[Simulation] 🎯 Scenario:', simData.scenario.title);
console.log('[Simulation] 🏠 Room Name:', simData.roomName);
console.log('[Simulation] 📞 Call Session ID:', simData.callSessionId);
console.log('[Simulation] 🔑 Token received:', simData.token ? 'Yes' : 'No');
```

---

## 2. Backend Logging

**Location:** `server/index.ts` - `POST /api/simulations/start`

### Request Received:

```
═══════════════════════════════════════════════════════════════
  AXTRA BACKEND: SIMULATION START REQUEST
═══════════════════════════════════════════════════════════════
⏰ Timestamp: 2026-02-17T10:30:00.123Z
👤 Operator: Admin User (ID: ec4db2ef-91ba-4b12-91e7-7bdf75b557ba)
🎯 Scenario ID: a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2
🎭 Persona ID: (auto-select)
```

### Scenario & Persona Details:

```
📋 SCENARIO DETAILS:
   ID: a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2
   Title: Billing Dispute - Aggressive Persona
   Difficulty: Hard
   Description: Handle an angry customer disputing their bill charges...

🎭 PERSONA DETAILS:
   ID: pers-angry-gold
   Name: Sarah Thompson
   Voice ID: shimmer
   Tier: Gold
   System Prompt Preview: You are Sarah Thompson, a Gold tier customer who is angry about a billing issue. You have been a loyal customer since 2019...
   Behavior Profile:
      {
        "initialMood": "angry",
        "patienceLevel": "low",
        "cooperationLevel": "medium",
        "escalationTriggers": ["long hold times", "repeating information"],
        "deescalationTriggers": ["empathy", "discounts"]
      }
```

### Token & Dispatch:

```
🏠 Generated Room Name: axtra-a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2-ec4db2ef-91ba-...

🔑 Generating LiveKit token...
   ✅ Token generated (length: 452)
   🔗 LiveKit URL: wss://realtimevoiceassistant-4alkb0ec.livekit.cloud

📤 PREPARING AGENT DISPATCH:
   ┌─ Persona Config ─────────────────────────────────────┐
   │ {                                                    │
   │   "id": "pers-angry-gold",                           │
   │   "name": "Sarah Thompson",                          │
   │   "behaviorProfile": { ... },                        │
   │   "systemPrompt": "You are Sarah Thompson...",       │
   │   "voiceId": "shimmer"                               │
   │ }                                                    │
   └──────────────────────────────────────────────────────┘
   ┌─ Scenario Config ────────────────────────────────────┐
   │ {                                                    │
   │   "id": "a7dda3d3-...",                              │
   │   "title": "Billing Dispute...",                     │
   │   "difficulty": "Hard"                               │
   │ }                                                    │
   └──────────────────────────────────────────────────────┘
   ┌─ User Info ──────────────────────────────────────────┐
   │ {                                                    │
   │   "userId": "ec4db2ef-...",                          │
   │   "userName": "Admin User"                           │
   │ }                                                    │
   └──────────────────────────────────────────────────────┘

🚀 Dispatching AI agent to LiveKit...
```

### Completion:

```
✅ AGENT DISPATCHED SUCCESSFULLY:
   Dispatch ID: AD_syP9fJAQ7iVj
   Agent Name: axtra-training-agent

💾 Creating call session record...
   ✅ Call Session ID: CS_abc123xyz

═══════════════════════════════════════════════════════════════
  SIMULATION START COMPLETE - SENDING SUCCESS RESPONSE
═══════════════════════════════════════════════════════════════
```

---

## 3. LiveKit Dispatch Logging

**Location:** `server/livekit.ts` - `dispatchAgent()`

### Metadata Payload:

```
📡 LIVEKIT DISPATCH: Preparing to dispatch agent...

📦 METADATA PAYLOAD (sent to Python Agent):
   ┌─ persona_config ─────────────────────────────────────┐
   │ id: pers-angry-gold                                  │
   │ name: Sarah Thompson                                 │
   │ voice_id: shimmer                                    │
   │ system_prompt: You are Sarah Thompson...             │
   │ behavior_profile: {"initialMood":"angry",...}        │
   └──────────────────────────────────────────────────────┘
   ┌─ scenario_config ────────────────────────────────────┐
   │ id: a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2            │
   │ title: Billing Dispute - Aggressive Persona          │
   │ difficulty: Hard                                     │
   └──────────────────────────────────────────────────────┘
   ┌─ user_info ──────────────────────────────────────────┐
   │ userId: ec4db2ef-91ba-4b12-91e7-7bdf75b557ba         │
   │ userName: Admin User                                 │
   └──────────────────────────────────────────────────────┘
   📅 dispatched_at: 2026-02-17T10:30:01.456Z

   📏 Metadata size: 2847 characters

🚀 Calling LiveKit API to create dispatch...
   Room: axtra-a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2-...
   Agent: axtra-training-agent
```

---

## 4. Python Agent Logging

**Location:** `server/agent/python-livekit/livekit_agent_langchain.py` - `entrypoint()`

### Dispatch Received:

```
══════════════════════════════════════════════════════════════════════════════
 AXTRA COPILOT AGENT - RECEIVED DISPATCH FROM LIVEKIT 
══════════════════════════════════════════════════════════════════════════════
🕐 Timestamp: 2026-02-17T10:30:02.789+07:00
🏠 Room: axtra-a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2-...
💼 Job ID: AJ_Lh2rZ9vbFb6p
```

### Metadata Parsed:

```
══════════════════════════════════════════════════════════════════════════════
 📦 METADATA RECEIVED FROM BACKEND 
══════════════════════════════════════════════════════════════════════════════

🎭 PERSONA CONFIG:
   ID: pers-angry-gold
   Name: Sarah Thompson
   Voice ID: shimmer
   System Prompt: You are Sarah Thompson, a Gold tier customer who is angry about a billing issue. You have been a loyal customer since 2019 and expect premium treatment. You are frustrated because you believe you were overcharged $45 on your latest bill...
   Behavior Profile:
      - Initial Mood: angry
      - Patience Level: low
      - Cooperation Level: medium
      - Escalation Triggers: ['long hold times', 'repeating information', 'no resolution', 'transfers']
      - De-escalation Triggers: ['empathy', 'discounts', 'quick resolution', 'manager attention']

🎯 SCENARIO CONFIG:
   ID: a7dda3d3-92c8-4fa4-9e5e-724767bcf6f2
   Title: Billing Dispute - Aggressive PersonaX
   Difficulty: Hard
   Description: Handle an angry customer disputing their bill charges

👤 OPERATOR INFO (Who we're coaching):
   User ID: ec4db2ef-91ba-4b12-91e7-7bdf75b557ba
   User Name: Admin User

📅 Dispatched At: 2026-02-17T10:30:01.456Z
══════════════════════════════════════════════════════════════════════════════
```

### Agent Initialization:

```
[Setup] Building LangGraph workflow...
[Setup] Workflow built successfully

[Setup] Initializing Gemini Realtime...
[Setup] Using voice: Zephyr (from persona: shimmer)

══════════════════════════════════════════════════════════════════════════════
 🤖 MAIN AGENT INITIALIZED 
══════════════════════════════════════════════════════════════════════════════

🎭 Persona Name: Sarah Thompson
🎤 Voice: Zephyr
🌡️ Temperature: 0.6
🧠 Model: gemini-2.5-flash-native-audio-preview-12-2025

📋 INSTRUCTIONS CONFIGURED:
   Length: 1856 characters
   Lines: 42

✅ Instruction Components:
   ✓ Role Reversal (Customer vs Support Agent)
   ✓ Thai Language Requirement
   ✓ Forbidden Phrases List

📝 Instructions Preview (first 300 chars):
   You are Sarah Thompson, a Gold tier customer who is angry about a billing issue...
   CRITICAL ROLE INSTRUCTION - READ CAREFULLY:
   You are NOT a support agent. You are Sarah Thompson, the CUSTOMER who is CALLING...
   ...
══════════════════════════════════════════════════════════════════════════════
```

---

## Complete Data Flow Summary

| Step | Location | Data Logged |
|------|----------|-------------|
| 1 | Frontend Console | Operator click, scenario ID, timestamp |
| 2 | Backend Console | Operator info, scenario details, persona config, behavior profile, system prompt |
| 3 | LiveKit Dispatch | Metadata payload (persona_config, scenario_config, user_info) |
| 4 | Python Agent | Parsed metadata, instructions built, agent ready |

---

## How to View Logs

### Frontend Logs:
- Open browser DevTools (F12)
- Go to Console tab
- Look for colored boxed messages

### Backend Logs:
- Terminal running `npm run dev` or `node server/index.ts`
- Look for "═══" bordered sections

### Python Agent Logs:
- Terminal running `uv run python livekit_agent_langchain.py dev`
- Look for "═══" bordered sections and emojis

---

## Key Information Tracked

1. **Who started the simulation** (Operator name, ID, email)
2. **What scenario** (ID, title, difficulty, description)
3. **Which persona** (ID, name, voice, tier, behavior profile)
4. **System Prompt** (Full prompt sent to agent)
5. **Behavior Profile** (Mood, patience, triggers)
6. **Dispatch Metadata** (Complete JSON payload)
7. **Instructions Built** (What the agent will use)

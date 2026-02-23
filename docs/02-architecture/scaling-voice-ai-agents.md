# Scaling Voice AI Agents: Architecture Options & Recommendations

## Executive Summary

**Current State**: Running `uv run python livekit_agent_langchain.py dev` starts a persistent agent worker that auto-joins rooms, consuming resources 24/7.

**Problem**: This doesn't scale well because:
- Agents run even when no training sessions are active
- Each persona/scenario combination would need a dedicated agent
- Resource waste during idle periods

**Recommended Solution**: On-demand agent spawning via explicit dispatch with dynamic persona/scenario configuration.

---

## Architecture Options Compared

### Option 1: Current - Persistent Auto-Dispatch (❌ Not Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT APPROACH                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent Worker (24/7)                                         │
│  ├─ Auto-joins any room                                      │
│  ├─ Runs pre-configured persona                              │
│  └─ Consumes resources constantly                            │
│                                                              │
│  Problems:                                                   │
│  • Wastes resources when idle                                │
│  • One agent = one persona (not flexible)                    │
│  • Can't dynamically change persona per session              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Resource Usage**: High (always running)  
**Scalability**: Poor (static configuration)  
**Cost**: High (pay for idle time)

---

### Option 2: Explicit Dispatch with Dynamic Configuration (✅ Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│              RECOMMENDED APPROACH                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Operator clicks "Start Training"                           │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │  Node.js API    │                                        │
│  │  (server/index) │                                        │
│  └────────┬────────┘                                        │
│           │ 1. Create Room                                   │
│           │ 2. Pass persona/scenario as metadata             │
│           ▼                                                  │
│  ┌─────────────────┐     ┌─────────────────────────┐        │
│  │  LiveKit Cloud  │────▶│  Agent Worker Pool      │        │
│  │  (Room Created) │     │  (Waiting for dispatch) │        │
│  └─────────────────┘     └───────────┬─────────────┘        │
│                                      │                       │
│                                      │ 3. Spawn agent         │
│                                      │    with metadata       │
│                                      ▼                       │
│                           ┌──────────────────────┐          │
│                           │  Python Agent        │          │
│                           │  - Load persona      │          │
│                           │    from metadata     │          │
│                           │  - Start voice       │          │
│                           │    conversation      │          │
│                           └──────────────────────┘          │
│                                                              │
│  Benefits:                                                   │
│  • Agent only runs during active sessions                    │
│  • Same worker can spawn different personas                  │
│  • Configurable per session via metadata                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Resource Usage**: Low (only when training)  
**Scalability**: Excellent (worker pool handles dispatch)  
**Cost**: Optimized (pay per usage)

---

### Option 3: Serverless/Container per Session (⚡ Advanced)

```
┌─────────────────────────────────────────────────────────────┐
│              SERVERLESS APPROACH (Future)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Operator clicks "Start Training"                           │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │  Node.js API    │                                        │
│  └────────┬────────┘                                        │
│           │ 1. Trigger container spawn                       │
│           │    (Kubernetes Job / AWS Fargate)                │
│           ▼                                                  │
│  ┌─────────────────────────────┐                            │
│  │  Container Orchestrator     │                            │
│  │  (K8s / Docker Swarm)       │                            │
│  └───────────┬─────────────────┘                            │
│              │ 2. Spawn dedicated container                   │
│              │    per session                                 │
│              ▼                                                │
│     ┌─────────────────────┐                                  │
│     │  Python Agent       │                                  │
│     │  (One container     │                                  │
│     │   per training)     │                                  │
│     └─────────────────────┘                                  │
│                                                              │
│  Benefits:                                                   │
│  • True isolation between sessions                           │
│  • Perfect multi-tenancy                                     │
│  • Auto-scaling to zero when idle                            │
│                                                              │
│  Complexity: Higher (needs K8s/Fargate setup)                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Resource Usage**: Minimal (true per-session isolation)  
**Scalability**: Maximum (cloud-native)  
**Cost**: Most efficient (true pay-per-use)

---

## Recommended Implementation (Option 2)

### Step 1: Modify Agent to Accept Dynamic Configuration

Update `livekit_agent_langchain.py` to read persona/scenario from job metadata:

```python
@server.rtc_session(agent_name="axtra-training-agent")
async def entrypoint(ctx: JobContext):
    # Read metadata passed during dispatch
    metadata = json.loads(ctx.job.metadata or "{}")
    
    persona_id = metadata.get("persona_id")
    scenario_id = metadata.get("scenario_id")
    persona_config = metadata.get("persona_config")  # Full persona data
    scenario_config = metadata.get("scenario_config")  # Full scenario data
    
    # Dynamically configure the agent
    agent = MainAgent(
        persona_config=persona_config,
        scenario_config=scenario_config
    )
    
    # Start session with dynamic configuration
    await agent.start(ctx)
```

### Step 2: Modify Frontend to Trigger Agent Dispatch

When operator clicks "Start Simulation":

```typescript
// src/lib/agent-dispatch.ts
import { api } from 'livekit-server-sdk';

export async function dispatchTrainingAgent(
  roomName: string, 
  persona: Persona, 
  scenario: Scenario
) {
  const lkapi = new api.LiveKitAPI(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
  
  // Create dispatch with persona/scenario as metadata
  const dispatch = await lkapi.agent_dispatch.create_dispatch({
    agent_name: "axtra-training-agent",
    room: roomName,
    metadata: JSON.stringify({
      persona_id: persona.id,
      scenario_id: scenario.id,
      persona_config: {
        name: persona.name,
        behavior_profile: persona.behaviorProfile,
        system_prompt: persona.systemPrompt,
        voice_id: persona.voiceId
      },
      scenario_config: {
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty
      }
    })
  });
  
  return dispatch;
}
```

### Step 3: Update Node.js Backend

Add endpoint to handle simulation start:

```typescript
// server/index.ts
// POST /api/simulations/start
async function startSimulationHandler(req, res) {
  const { scenarioId, personaId } = req.body;
  const user = await validateSession(req);
  
  // 1. Get persona and scenario from database
  const persona = await getPersonaById(personaId);
  const scenario = await getScenarioById(scenarioId);
  
  // 2. Create unique room name
  const roomName = `training-${user.id}-${Date.now()}`;
  
  // 3. Generate LiveKit token for user
  const token = await createLiveKitToken(roomName, user.id);
  
  // 4. Dispatch agent to room with configuration
  await dispatchTrainingAgent(roomName, persona, scenario);
  
  // 5. Return room info to frontend
  res.json({
    success: true,
    data: {
      room_name: roomName,
      token: token,
      ws_url: process.env.LIVEKIT_URL
    }
  });
}
```

### Step 4: Update ActiveSimulation Page

```typescript
// src/pages/ActiveSimulation.tsx
async function handleStartSimulation() {
  // 1. Call backend to start simulation
  const response = await apiClient.post('/simulations/start', {
    scenarioId: params.id,
    personaId: selectedPersonaId  // Or auto-select based on scenario
  });
  
  const { room_name, token, ws_url } = response.data;
  
  // 2. Connect to LiveKit room
  const room = new Room();
  await room.connect(ws_url, token);
  
  // 3. Agent automatically joins via dispatch
  // 4. Start voice conversation
}
```

---

## LiveKit Worker Pool Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              LIVEKIT WORKER POOL MODEL                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent Server (Worker Pool)                                  │
│  ├─ Registers with LiveKit via WebSocket                     │
│  ├─ Waits for dispatch requests                              │
│  ├─ Spawns child process per job                             │
│  └─ Handles multiple concurrent sessions                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Job 1: Scenario A + Persona X (Operator 1)         │    │
│  │  Job 2: Scenario B + Persona Y (Operator 2)         │    │
│  │  Job 3: Scenario A + Persona Z (Operator 3)         │    │
│  │  ...                                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Each job is isolated - if one crashes, others continue      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Benefits of This Model

1. **Resource Efficiency**: Workers wait idle (minimal resources) until dispatched
2. **Fast Startup**: ~150ms dispatch time from request to agent joining
3. **Horizontal Scaling**: Add more worker instances to handle more concurrent sessions
4. **Fault Isolation**: Each session runs in isolated subprocess
5. **Dynamic Configuration**: Each session gets unique persona/scenario via metadata

---

## Deployment Options

### Option A: LiveKit Cloud (Easiest)

**Pros**:
- Fully managed, no infrastructure to maintain
- Auto-scaling built-in
- Global edge network for low latency
- Same network as media transport

**Cons**:
- Per-minute pricing for agents
- Less control over infrastructure

**Best For**: Getting started, smaller scale, no DevOps team

### Option B: Self-Hosted Kubernetes (Recommended for Scale)

**Pros**:
- Full control over resources
- Cost-effective at scale
- Custom autoscaling policies
- Can use spot instances for cost savings

**Cons**:
- Requires Kubernetes expertise
- More setup and maintenance

**Best For**: Large scale, cost optimization, custom requirements

**Example HPA (Horizontal Pod Autoscaler)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: axtra-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: axtra-agent
  minReplicas: 1      # Keep 1 idle worker ready
  maxReplicas: 100    # Scale up to 100 concurrent sessions
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
    scaleDown:
      stabilizationWindowSeconds: 600  # Wait 10 min before scaling down
```

### Option C: Docker Compose / Single Server (Development)

**Pros**:
- Simple setup
- Good for development/testing

**Cons**:
- No auto-scaling
- Single point of failure

**Best For**: Development, small demos

---

## Resource Requirements

Based on LiveKit load testing:

| Configuration | CPU | Memory | Concurrent Sessions |
|--------------|-----|--------|---------------------|
| Minimum | 2 cores | 4GB | 5-10 |
| Recommended | 4 cores | 8GB | 10-25 |
| High Performance | 8 cores | 16GB | 25-50 |

**Per Session Overhead**:
- ~0.1-0.2 CPU cores per voice session
- ~100-200MB RAM per session
- ~50-100kbps bandwidth per direction

---

## Implementation Roadmap

### Phase 1: Explicit Dispatch (Immediate - 1-2 days)
1. Modify agent to accept metadata
2. Add dispatch API call to backend
3. Update frontend to trigger dispatch

### Phase 2: Dynamic Persona Loading (1 week)
1. Move persona configs to database
2. Agent fetches persona config from metadata
3. Support multiple personas per scenario

### Phase 3: Kubernetes Deployment (2-3 weeks)
1. Create Dockerfile for agent
2. Set up Kubernetes manifests
3. Configure HPA for auto-scaling
4. Set up monitoring/observability

### Phase 4: Advanced Features (Future)
1. Pre-warm agents for faster startup
2. Agent pooling for instant response
3. Multi-region deployment
4. Spot instance support for cost savings

---

## Cost Comparison

### Current (Persistent Agents)
- 1 agent running 24/7 = ~$50-100/month (cloud VM)
- 10 agents = ~$500-1000/month
- Mostly idle = wasted money

### Recommended (On-Demand)
- 1 worker idle = ~$20-40/month
- Per active session = ~$0.05-0.10/hour
- 100 sessions/day × 10 min = ~$8-17/month
- **Savings: 80-90% for typical usage**

---

## Summary & Recommendation

**For your use case (training platform with sporadic usage)**:

1. **Immediate**: Implement Option 2 (Explicit Dispatch with Dynamic Config)
   - Same infrastructure, better resource usage
   - Persona/scenario configured per session

2. **Short-term**: Deploy to LiveKit Cloud
   - Easiest scaling
   - Pay only for active sessions

3. **Long-term**: Migrate to self-hosted Kubernetes
   - Most cost-effective at scale
   - Full control over infrastructure

**Key Changes Needed**:
1. Modify `livekit_agent_langchain.py` to read from metadata
2. Add dispatch API to Node.js backend
3. Update frontend to call dispatch on "Start Simulation"
4. (Optional) Move to Kubernetes for production scaling

This approach solves all your concerns:
- ✅ No agents running 24/7
- ✅ Dynamic persona/scenario per session
- ✅ Scales with demand
- ✅ Cost-effective

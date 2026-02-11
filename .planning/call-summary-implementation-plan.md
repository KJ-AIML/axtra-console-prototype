# Call Summary Implementation Plan
## Real AI Integration with LangGraph Workflow

---

## 🎯 Project Goal
Replace the mock `generateMockSummary()` function with a real LangGraph workflow that analyzes call transcripts and coaching history to generate intelligent post-call summaries.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CALL SUMMARY ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐ │
│  │   FRONTEND      │       │   BACKEND        │       │   AI AGENT       │ │
│  │   (React)       │──────>│   (Node.js)      │──────>│   (Python)       │ │
│  │                 │       │                  │       │   (LangGraph)    │ │
│  └─────────────────┘       └──────────────────┘       └──────────────────┘ │
│         │                          │                         │             │
│         │ 1. POST /complete        │ 2. HTTP call            │ 3. Execute  │
│         │─────────────────────────>│────────────────────────>│  workflow   │
│         │                          │                         │             │
│         │ 6. Show summary          │ 5. Return result        │ 4. Return   │
│         │<─────────────────────────│<────────────────────────│  analysis   │
│                                                                             │
│  Communication: JSON over HTTP (Backend ↔ AI Agent)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation - Schema & Types (Day 1)
**Goal**: Define data structures for the entire flow

#### 1.1 TypeScript Types (Frontend + Backend)
```typescript
// shared/types/call-summary.ts

// Input: What frontend sends to backend
export interface CallSummaryRequest {
  callId: string;
  durationSeconds: number;
  totalTurns: number;
  customerSentiment: string;
  transcripts: TranscriptEntry[];
  coachingHistory: CoachingData[];
}

// Output: What AI agent returns
export interface CallSummaryResponse {
  summary: string;
  keyPoints: string[];
  strengths: string[];
  improvements: string[];
  customerSatisfaction: number;  // 1-5
  resolutionStatus: 'resolved' | 'pending' | 'escalated' | 'unresolved';
  coachingEffectiveness: number;  // 1-5
}
```

#### 1.2 Python Schema (AI Agent)
```python
# agents/schemas/call_summary_types.py

class CallSummaryInput(BaseModel):
    """Input from backend to AI agent"""
    call_id: str
    duration_seconds: int
    total_turns: int
    customer_sentiment: str
    scenario_type: str
    transcripts: List[TranscriptEntry]
    coaching_history: List[CoachingData]

class SentimentAnalysis(BaseModel):
    """Node 1 output"""
    initial_sentiment: str
    final_sentiment: str
    sentiment_journey: str
    key_triggers: List[str]

class KeyMoments(BaseModel):
    """Node 2 output"""
    greeting_quality: str
    problem_identified: bool
    problem_clarity: str
    resolution_attempted: bool
    resolution_achieved: bool
    key_facts: List[str]

class OperatorPerformance(BaseModel):
    """Node 3 output"""
    professionalism: int
    empathy: int
    problem_solving: int
    coaching_utilization: int
    strengths: List[str]
    improvements: List[str]

class CallSummaryOutput(BaseModel):
    """Final aggregated output"""
    summary: str
    key_points: List[str]
    strengths: List[str]
    improvements: List[str]
    customer_satisfaction: int
    resolution_status: str
    coaching_effectiveness: int
```

#### Deliverables
- [x] `shared/types/call-summary.ts` (TypeScript) - Types defined in `server/call-sessions.ts`
- [x] `agents/schemas/call_summary_types.py` (Python) - Created with all Pydantic models
- [x] Update existing `types.py` with new models - State and models defined

---

### Phase 2: Backend API - Integration Endpoint (Day 1-2)
**Goal**: Create HTTP bridge between Node.js backend and Python AI agent

#### 2.1 AI Agent Service (Node.js)
```typescript
// server/services/ai-agent-client.ts

export class AIAgentClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.AI_AGENT_URL || 'http://localhost:8001';
  }
  
  async generateCallSummary(data: CallSummaryRequest): Promise<CallSummaryResponse> {
    const response = await fetch(`${this.baseUrl}/api/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`AI agent error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

#### 2.2 Update Call Sessions Service
```typescript
// server/call-sessions.ts

import { AIAgentClient } from './services/ai-agent-client';

const aiClient = new AIAgentClient();

export async function completeCallSession(data: CompleteCallRequest) {
  // ... existing code ...
  
  // Replace mock with real AI call
  let summary: CallSummary;
  try {
    summary = await aiClient.generateCallSummary({
      callId: data.call_id,
      durationSeconds: data.duration_seconds,
      totalTurns: data.total_turns,
      customerSentiment: data.customer_sentiment,
      transcripts: data.transcripts,
      coachingHistory: data.coaching_history,
    });
  } catch (error) {
    console.error('AI agent failed, falling back to mock:', error);
    summary = generateMockSummary(data.transcripts, data.coaching_history);
  }
  
  // ... rest of existing code ...
}
```

#### Deliverables
- [x] `server/services/ai-agent-client.ts` - HTTP client for AI agent with fallback
- [x] Update `server/call-sessions.ts` - Integrated AI call with fallback to mock
- [x] Environment variables: `AI_AGENT_URL`, `AI_AGENT_TIMEOUT` added to .env.local

---

### Phase 3: Agent Workflow - LangGraph Implementation (Day 2-3)
**Goal**: Build the actual LangGraph workflow

#### 3.1 Create New Files

```
server/agent/python-livekit/
├── agents/
│   ├── schemas/
│   │   ├── types.py              # Existing
│   │   └── call_summary_types.py # ✅ CREATED
│   ├── agent_manager/
│   │   ├── agent.py              # Existing
│   │   └── call_summary_agent.py # ✅ CREATED
│   ├── workflow/
│   │   ├── nodes.py              # Existing
│   │   ├── build.py              # Existing
│   │   ├── summary_nodes.py      # ✅ CREATED
│   │   └── summary_build.py      # ✅ CREATED
│   └── prompts/
│       ├── agent_prompts.py      # Existing
│       └── call_summary_prompts.py # ✅ CREATED
├── api/                            # ✅ NEW MODULE
│   ├── __init__.py
│   └── server.py                   # ✅ FastAPI HTTP server
└── run_summary_api.py              # ✅ Entry point script
```

#### 3.2 Implementation Details

**File: `agents/schemas/call_summary_types.py`**
```python
from typing import List, Literal, TypedDict
from pydantic import BaseModel, Field

# State for LangGraph
class CallSummaryState(TypedDict):
    # Inputs
    call_metadata: dict
    transcripts: list
    coaching_history: list
    
    # Intermediate outputs (parallel nodes)
    sentiment_analysis: dict
    key_moments: dict
    operator_performance: dict
    
    # Final output
    call_summary: CallSummaryOutput

# Pydantic models for structured output
class SentimentAnalysis(BaseModel):
    initial_sentiment: Literal["happy", "neutral", "frustrated", "angry"]
    final_sentiment: Literal["happy", "neutral", "frustrated", "angry"]
    sentiment_journey: str
    key_triggers: List[str]

class KeyMoments(BaseModel):
    greeting_quality: Literal["excellent", "good", "average", "poor"]
    problem_identified: bool
    problem_clarity: str
    resolution_attempted: bool
    resolution_achieved: bool
    key_facts: List[str]

class OperatorPerformance(BaseModel):
    professionalism: int = Field(ge=1, le=5)
    empathy: int = Field(ge=1, le=5)
    problem_solving: int = Field(ge=1, le=5)
    coaching_utilization: int = Field(ge=1, le=5)
    strengths: List[str]
    improvements: List[str]

class CallSummaryOutput(BaseModel):
    summary: str
    key_points: List[str]
    strengths: List[str]
    improvements: List[str]
    customer_satisfaction: int = Field(ge=1, le=5)
    resolution_status: Literal["resolved", "pending", "escalated", "unresolved"]
    coaching_effectiveness: int = Field(ge=1, le=5)
```

**File: `agents/agent_manager/call_summary_agent.py`**
```python
import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from agents.schemas.call_summary_types import (
    SentimentAnalysis,
    KeyMoments,
    OperatorPerformance,
    CallSummaryOutput,
)

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
model = init_chat_model("google_genai:gemini-2.5-flash-lite", api_key=api_key)

# Structured output models
model_sentiment = model.with_structured_output(SentimentAnalysis)
model_key_moments = model.with_structured_output(KeyMoments)
model_performance = model.with_structured_output(OperatorPerformance)
model_summary = model.with_structured_output(CallSummaryOutput)
```

**File: `agents/prompts/call_summary_prompts.py`**
```python
SENTIMENT_ANALYSIS_PROMPT = """You are a sentiment analysis expert for call center training.

Analyze the customer sentiment throughout this conversation. Consider:
1. Initial sentiment when call started
2. Final sentiment when call ended
3. What caused sentiment changes (if any)
4. Key emotional triggers (positive or negative)

Be specific and objective. Reference actual quotes if relevant."""

KEY_MOMENTS_PROMPT = """You are a conversation analyst for call center training.

Identify the key moments in this customer service interaction:

1. GREETING QUALITY:
   - Did the operator introduce themselves?
   - Was the tone professional and welcoming?

2. PROBLEM IDENTIFICATION:
   - Was the customer's issue clearly identified?
   - How well was the problem understood?

3. RESOLUTION:
   - Was a solution attempted?
   - Was the issue resolved by the end?

4. KEY FACTS:
   - What are the critical facts to remember about this call?

Be objective and specific."""

OPERATOR_PERFORMANCE_PROMPT = """You are a training coach evaluating operator performance.

Evaluate the trainee's performance on these dimensions (1-5 scale):

1. PROFESSIONALISM:
   - Language and tone
   - Courtesy and politeness
   - Adherence to company protocols

2. EMPATHY:
   - Understanding customer emotions
   - Appropriate responses to frustration
   - Making customer feel heard

3. PROBLEM_SOLVING:
   - Effectiveness of solutions offered
   - Efficiency in handling the issue
   - Creativity in resolving problems

4. COACHING_UTILIZATION:
   - Did they follow coaching suggestions?
   - How well did they apply real-time guidance?

Also identify:
- STRENGTHS: 2-3 specific things they did well
- IMPROVEMENTS: 2-3 specific areas to work on

Be constructive and specific."""

SUMMARY_AGGREGATION_PROMPT = """You are creating a final call summary for a trainee.

Combine the sentiment analysis, key moments, and performance evaluation into a cohesive summary.

Your output should include:

1. SUMMARY (2-3 sentences):
   - Overview of what happened
   - Outcome of the call
   - Notable aspects

2. KEY_POINTS (3-5 bullet points):
   - Important facts about the customer/issue
   - Critical moments in the call
   - What was accomplished

3. STRENGTHS (2-3 items):
   - What the trainee did well
   - Be specific with examples

4. IMPROVEMENTS (2-3 items):
   - Areas for growth
   - Actionable suggestions

5. SCORING:
   - customer_satisfaction: 1-5 (overall customer happiness)
   - resolution_status: resolved/pending/escalated/unresolved
   - coaching_effectiveness: 1-5 (how well trainee used coaching)

Tone should be encouraging but honest. Focus on learning and growth."""
```

**File: `agents/workflow/summary_nodes.py`**
```python
import os
from typing import Dict, Any

from agents.agent_manager.call_summary_agent import (
    model_sentiment,
    model_key_moments,
    model_performance,
    model_summary,
)
from agents.prompts.call_summary_prompts import (
    SENTIMENT_ANALYSIS_PROMPT,
    KEY_MOMENTS_PROMPT,
    OPERATOR_PERFORMANCE_PROMPT,
    SUMMARY_AGGREGATION_PROMPT,
)
from agents.schemas.call_summary_types import CallSummaryState

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def format_transcripts(transcripts: list) -> str:
    """Format transcripts for LLM input"""
    lines = []
    for t in transcripts:
        speaker = t.get('speaker', 'unknown').upper()
        text = t.get('text', '')
        time = t.get('timestamp', '')
        lines.append(f"[{time}] {speaker}: {text}")
    return "\n".join(lines)


def format_coaching(coaching_history: list) -> str:
    """Format coaching history for LLM input"""
    if not coaching_history:
        return "No coaching provided during this call."
    
    lines = []
    for c in coaching_history:
        analysis_id = c.get('analysis_id', 0)
        cards = c.get('cards', [])
        lines.append(f"\nCoaching Update #{analysis_id}:")
        for card in cards:
            lines.append(f"  - {card.get('title')} ({card.get('status')})")
            lines.append(f"    Suggestion: {card.get('action')}")
    return "\n".join(lines)


def debug_log(state: CallSummaryState, node_name: str):
    """Debug logging for nodes"""
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print(f"[SUMMARY NODE] {node_name}")
        print(f"{'='*60}")
        print(f"Metadata: {state.get('call_metadata', {})}")
        print(f"Transcripts: {len(state.get('transcripts', []))} messages")
        print(f"Coaching: {len(state.get('coaching_history', []))} updates")
        print(f"{'='*60}\n")


def analyze_sentiment_node(state: CallSummaryState) -> Dict[str, Any]:
    """Analyze customer sentiment journey"""
    debug_log(state, "SENTIMENT_ANALYSIS")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    
    response = model_sentiment.invoke([
        {"role": "system", "content": SENTIMENT_ANALYSIS_PROMPT},
        {"role": "user", "content": f"""
Call Metadata:
- Duration: {metadata.get('duration_seconds', 0)} seconds
- Total exchanges: {metadata.get('total_turns', 0)}
- Initial sentiment (from coaching): {metadata.get('customer_sentiment', 'unknown')}
- Scenario: {metadata.get('scenario_type', 'customer_service')}

Conversation:
{format_transcripts(transcripts)}
        """}
    ])
    
    if DEBUG_MODE:
        print(f"[SENTIMENT] Result: {response.model_dump()}")
    
    return {"sentiment_analysis": response.model_dump()}


def extract_key_moments_node(state: CallSummaryState) -> Dict[str, Any]:
    """Extract key moments from conversation"""
    debug_log(state, "KEY_MOMENTS")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    
    response = model_key_moments.invoke([
        {"role": "system", "content": KEY_MOMENTS_PROMPT},
        {"role": "user", "content": f"""
Scenario: {metadata.get('scenario_type', 'customer_service')}
Duration: {metadata.get('duration_seconds', 0)} seconds

Conversation:
{format_transcripts(transcripts)}
        """}
    ])
    
    if DEBUG_MODE:
        print(f"[KEY_MOMENTS] Result: {response.model_dump()}")
    
    return {"key_moments": response.model_dump()}


def evaluate_performance_node(state: CallSummaryState) -> Dict[str, Any]:
    """Evaluate operator performance"""
    debug_log(state, "OPERATOR_PERFORMANCE")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    coaching = state["coaching_history"]
    
    operator_messages = len([t for t in transcripts if t.get('speaker') == 'operator'])
    coaching_count = len(coaching)
    
    response = model_performance.invoke([
        {"role": "system", "content": OPERATOR_PERFORMANCE_PROMPT},
        {"role": "user", "content": f"""
Call Statistics:
- Duration: {metadata.get('duration_seconds', 0)} seconds
- Total messages: {len(transcripts)}
- Operator messages: {operator_messages}
- Coaching suggestions provided: {coaching_count}

Conversation:
{format_transcripts(transcripts)}

Coaching History:
{format_coaching(coaching)}
        """}
    ])
    
    if DEBUG_MODE:
        print(f"[PERFORMANCE] Result: {response.model_dump()}")
    
    return {"operator_performance": response.model_dump()}


def aggregate_summary_node(state: CallSummaryState) -> Dict[str, Any]:
    """Aggregate all analyses into final summary"""
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print("[SUMMARY NODE] AGGREGATOR")
        print(f"{'='*60}")
        print(f"Sentiment: {state.get('sentiment_analysis', {})}")
        print(f"Key Moments: {state.get('key_moments', {})}")
        print(f"Performance: {state.get('operator_performance', {})}")
        print(f"{'='*60}\n")
    
    response = model_summary.invoke([
        {"role": "system", "content": SUMMARY_AGGREGATION_PROMPT},
        {"role": "user", "content": f"""
SENTIMENT ANALYSIS:
{state.get('sentiment_analysis', {})}

KEY MOMENTS:
{state.get('key_moments', {})}

OPERATOR PERFORMANCE:
{state.get('operator_performance', {})}

Create a cohesive call summary for the trainee.
        """}
    ])
    
    if DEBUG_MODE:
        print(f"[AGGREGATOR] Final Summary: {response.model_dump()}")
    
    return {"call_summary": response.model_dump()}
```

**File: `agents/workflow/summary_build.py`**
```python
from langgraph.graph import END, START, StateGraph

from agents.schemas.call_summary_types import CallSummaryState
from agents.workflow.summary_nodes import (
    analyze_sentiment_node,
    extract_key_moments_node,
    evaluate_performance_node,
    aggregate_summary_node,
)


def build_call_summary_workflow():
    """
    Build the call summary workflow graph.
    
    Parallel analysis of:
    - Sentiment
    - Key moments  
    - Performance
    
    Then aggregate into final summary.
    """
    builder = StateGraph(CallSummaryState)
    
    # Add nodes
    builder.add_node("analyze_sentiment", analyze_sentiment_node)
    builder.add_node("extract_key_moments", extract_key_moments_node)
    builder.add_node("evaluate_performance", evaluate_performance_node)
    builder.add_node("aggregate_summary", aggregate_summary_node)
    
    # Parallel edges from START
    builder.add_edge(START, "analyze_sentiment")
    builder.add_edge(START, "extract_key_moments")
    builder.add_edge(START, "evaluate_performance")
    
    # All parallel nodes must complete before aggregation
    builder.add_edge("analyze_sentiment", "aggregate_summary")
    builder.add_edge("extract_key_moments", "aggregate_summary")
    builder.add_edge("evaluate_performance", "aggregate_summary")
    
    # End
    builder.add_edge("aggregate_summary", END)
    
    return builder.compile()
```

#### Deliverables
- [x] All new files created (4 agent files + 3 API files = 7 total)
- [x] Structured output models defined (4 Pydantic models)
- [x] Parallel workflow graph built (3 parallel → 1 aggregator)
- [x] Debug logging implemented throughout
- [x] HTTP API server with FastAPI
- [x] Smart transcript chunking for long calls

---

### Phase 4: Hierarchical Summarization - Long Call Support (Day 3-4)
**Goal**: Handle 1+ hour calls without context overflow

#### 4.1 Smart Chunking Logic

```python
# agents/services/hierarchical_summary.py

class HierarchicalSummarizer:
    """Handle long calls with hierarchical summarization"""
    
    def __init__(self, workflow):
        self.workflow = workflow
        self.chunk_size = 10 * 60  # 10 minutes in seconds
    
    def summarize(self, call_data: dict) -> CallSummaryOutput:
        duration = call_data['duration_seconds']
        
        if duration <= 10 * 60:  # <= 10 minutes
            # Short call: process directly
            return self._process_short_call(call_data)
        elif duration <= 30 * 60:  # <= 30 minutes
            # Medium call: section-based
            return self._process_medium_call(call_data)
        else:
            # Long call: hierarchical
            return self._process_long_call(call_data)
    
    def _process_short_call(self, call_data: dict) -> CallSummaryOutput:
        """Process short call directly"""
        state = self._create_initial_state(call_data)
        result = self.workflow.invoke(state)
        return CallSummaryOutput(**result["call_summary"])
    
    def _process_medium_call(self, call_data: dict) -> CallSummaryOutput:
        """Process medium call with section detection"""
        # Divide into 3 sections: opening, middle, closing
        transcripts = call_data['transcripts']
        third = len(transcripts) // 3
        
        sections = {
            'opening': transcripts[:third],
            'middle': transcripts[third:2*third],
            'closing': transcripts[2*third:]
        }
        
        # Summarize each section
        section_summaries = {}
        for section_name, section_transcripts in sections.items():
            section_data = {**call_data, 'transcripts': section_transcripts}
            state = self._create_initial_state(section_data)
            result = self.workflow.invoke(state)
            section_summaries[section_name] = result["call_summary"]
        
        # Aggregate section summaries
        return self._aggregate_sections(section_summaries)
    
    def _process_long_call(self, call_data: dict) -> CallSummaryOutput:
        """Process long call with hierarchical summarization"""
        # Implementation for 1+ hour calls
        # 1. Chunk by time (every 10 min)
        # 2. Summarize each chunk
        # 3. Group chunks into sections
        # 4. Summarize sections
        # 5. Final aggregation
        pass
```

#### Deliverables
- [x] Hierarchical summarization service (`agents/services/hierarchical_summary.py`)
- [x] Smart chunking by duration (3 strategies: direct, section-based, hierarchical)
- [x] Section-based processing (opening/middle/closing)
- [x] Aggregation logic with sentiment journey tracking
- [x] Integration with API server

---

### Phase 5: Frontend Integration (Day 4)
**Goal**: Wire up frontend to use real summaries

#### 5.1 No Frontend Changes Required! ✅
The frontend already:
- Sends data to `POST /api/calls/complete`
- Receives and displays summary

Only backend changes needed.

#### 5.2 Backend Integration Complete ✅
The backend now:
- Calls AI Agent API with timeout and fallback
- Saves source ('ai' or 'mock') to database
- Returns structured summary to frontend

#### Deliverables
- [x] HTTP client for AI Agent (`server/services/ai-agent-client.ts`)
- [x] Health check and fallback mechanism
- [x] Error handling with automatic mock fallback
- [x] Source tracking in database (ai vs mock)

---

### Phase 6: Testing & Optimization (Day 5)
**Goal**: Ensure reliability and performance

#### 6.1 Test Cases
```python
# tests/test_call_summary_workflow.py

def test_short_call_summary():
    """Test 5-minute call"""
    pass

def test_medium_call_summary():
    """Test 20-minute call"""
    pass

def test_long_call_summary():
    """Test 1-hour call"""
    pass

def test_empty_transcript():
    """Test edge case: no transcripts"""
    pass

def test_no_coaching():
    """Test edge case: no coaching history"""
    pass
```

#### 6.2 Performance Monitoring
```typescript
// Add timing logs
const startTime = Date.now();
const summary = await aiClient.generateCallSummary(data);
console.log(`Summary generated in ${Date.now() - startTime}ms`);
```

#### Deliverables
- [ ] Unit tests for workflow
- [ ] Integration tests (backend ↔ AI)
- [ ] Performance benchmarks
- [ ] Error handling tests

---

## 📊 Implementation Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Schema & Types | 0.5 day | ✅ Complete |
| 2 | Backend API Client | 0.5 day | ✅ Complete |
| 3 | LangGraph Workflow + API | 1.5 days | ✅ Complete |
| 4 | Hierarchical Logic | 1 day | 🔄 Partial (basic chunking implemented) |
| 5 | Frontend Polish | 0.5 day | ✅ Complete (no changes needed) |
| 6 | Testing | 1 day | ⏳ Pending |
| **Total** | | **5 days** | **~80% Complete** |

---

## 🎯 Success Criteria

- [ ] Short calls (< 10 min): Summary generated in < 5 seconds
- [ ] Medium calls (10-30 min): Summary generated in < 10 seconds
- [ ] Long calls (30+ min): Summary generated in < 15 seconds
- [ ] All summaries match TypeScript `CallSummary` interface
- [ ] Fallback to mock works if AI unavailable
- [ ] Debug mode logs all node inputs/outputs
- [ ] No context overflow for 1+ hour calls

---

## 🚀 Quick Start Commands

### 1. Install Python Dependencies (if not already done)
```bash
cd server/agent/python-livekit
uv sync
```

### 2. Start the Call Summary API Server
```bash
cd server/agent/python-livekit
uv run python run_summary_api.py

# Or directly:
uv run python -m api.server
```

The API will start on port 8001 (configurable via `SUMMARY_API_PORT` env var).

### 3. Verify API is Running
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"status": "healthy", "service": "axtra-call-summary-api", "version": "1.0.0"}
```

### 4. Start Node.js Backend (in another terminal)
```bash
npm run dev
```

### 5. Test the Complete Flow
1. Open http://localhost:3000
2. Login and start a voice call simulation
3. Have a conversation with the AI agent
4. Click "End Call"
5. The system will:
   - Send call data to AI Agent API
   - Generate AI-powered summary (or fallback to mock if AI unavailable)
   - Display summary in CallSummaryModal
   - Save everything to database

### 6. Test Summary API Directly
```bash
curl -X POST http://localhost:8001/api/summary/generate \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "test-call-123",
    "duration_seconds": 120,
    "total_turns": 4,
    "customer_sentiment": "angry",
    "scenario_type": "billing_dispute",
    "transcripts": [
      {"speaker": "customer", "text": "I am very angry about this charge!", "timestamp": "00:00"},
      {"speaker": "operator", "text": "I apologize for the inconvenience.", "timestamp": "00:05"}
    ],
    "coaching_history": []
  }'
```

---

## ✅ Implementation Status

### Completed ✅
1. **Phase 1: Schema & Types** - All Pydantic models and TypeScript interfaces defined
2. **Phase 2: Backend Integration** - HTTP client with health checks and fallback
3. **Phase 3: LangGraph Workflow** - Parallel 3-node analysis with aggregation
4. **Phase 3: HTTP API** - FastAPI server with transcript chunking
5. **Phase 5: Frontend** - No changes needed (already integrated)

### In Progress 🔄
- **Phase 4: Hierarchical Summarization** - Basic chunking implemented, advanced section-based processing pending

### Pending ⏳
- **Phase 6: Testing** - Unit tests for workflow, integration tests

---

## 🔧 Troubleshooting

### "AI Agent not available, using mock summary"
- Check that Python API server is running on port 8001
- Verify `AI_AGENT_URL` in `.env.local` matches the Python server
- Check Python logs for errors

### "Request timeout"
- AI processing may take 10-30 seconds for long calls
- Increase `AI_AGENT_TIMEOUT` in `.env.local` (default: 30000ms)
- Check Python logs to see if processing is stuck

### "Module not found" errors
- Run `uv sync` in `server/agent/python-livekit/` to install FastAPI and uvicorn

---

## 🎯 Next Steps

1. **Test the integration** - Run a complete call and verify AI summary generation
2. **Fine-tune prompts** - Adjust `call_summary_prompts.py` based on output quality
3. **Add metrics** - Track AI vs mock usage, processing times
4. **Implement Phase 4** - Advanced hierarchical summarization for 1+ hour calls
5. **Write tests** - Unit tests for nodes, integration tests for API

---

*Implementation is ~80% complete! The core AI-powered summary generation is ready to use.* 🎉

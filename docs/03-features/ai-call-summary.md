# AI Call Summary

AI-powered call summary generation using LangGraph workflow with hierarchical summarization.

---

## 🎯 Overview

The AI Call Summary system analyzes call transcripts and coaching history to generate comprehensive post-call summaries. It uses a **FastAPI server** that runs independently from the main Node.js backend.

### Features

- **Hierarchical Summarization** - Handles long calls with smart chunking
- **Parallel Analysis** - Sentiment, key moments, and performance analysis
- **AI vs QA Comparison** - Compare AI-generated scores with manual QA scores
- **Fallback to Mock** - Graceful degradation if AI service is unavailable

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTP API      ┌─────────────────────────────┐
│  Node.js Backend│◄─────────────────►│  AI Summary API (Python)    │
│                 │  POST /api/summary│  Port: 8001                 │
│                 │   /generate       │                             │
└─────────────────┘                   │  ┌─────────────────────┐    │
                                      │  │ LangGraph Workflow  │    │
                                      │  │                     │    │
                                      │  │ ┌─────────────────┐ │    │
                                      │  │ │ Sentiment Node  │ │    │
                                      │  │ └────────┬────────┘ │    │
                                      │  │ ┌────────▼────────┐ │    │
                                      │  │ │ Key Moments Node│ │    │
                                      │  │ └────────┬────────┘ │    │
                                      │  │ ┌────────▼────────┐ │    │
                                      │  │ │ Performance Node│ │    │
                                      │  │ └────────┬────────┘ │    │
                                      │  │          │          │    │
                                      │  │ ┌────────▼────────┐ │    │
                                      │  │ │   Aggregator    │ │    │
                                      │  │ │  (Summary +     │ │    │
                                      │  │ │   Scores)       │ │    │
                                      │  │ └─────────────────┘ │    │
                                      │  └─────────────────────┘    │
                                      └─────────────────────────────┘
```

---

## 🚀 Running the API

### Start the Server

```bash
cd server/agent/python-livekit

# Option 1: Direct Python
python api/server.py

# Option 2: Using uv
uv run python api/server.py

# Option 3: Using the run script
python run_summary_api.py
```

The server starts on **port 8001** by default.

### Environment Variables

Create `server/agent/python-livekit/.env`:

```bash
# Required
GOOGLE_API_KEY=your_google_api_key

# Optional
AI_AGENT_PORT=8001
AI_AGENT_HOST=0.0.0.0
DEBUG_MODE=true
```

---

## 📡 API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "workflow_loaded": true
}
```

### Generate Summary

```http
POST /api/summary/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "call_id": "call-uuid",
  "duration_seconds": 420,
  "total_turns": 24,
  "customer_sentiment": "frustrated",
  "scenario_type": "billing_dispute",
  "transcripts": [
    {
      "id": "turn-1",
      "speaker": "customer",
      "text": "I'm very upset about my bill...",
      "timestamp": "2024-01-15T10:00:00Z",
      "emotion": "angry"
    },
    {
      "id": "turn-2", 
      "speaker": "operator",
      "text": "I understand your frustration...",
      "timestamp": "2024-01-15T10:00:05Z"
    }
  ],
  "coaching_history": [
    {
      "analysis_id": 1,
      "cards": [
        {
          "title": "Customer Emotion",
          "detail": "Customer is frustrated about billing",
          "action": "Acknowledge frustration and apologize",
          "status": "danger"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "The operator handled a billing dispute...",
    "key_points": [
      "Customer was frustrated about unexpected charges",
      "Operator acknowledged issue and offered solution",
      "Resolution achieved within 7 minutes"
    ],
    "strengths": [
      "Active listening",
      "Empathy statements",
      "Clear explanation"
    ],
    "improvements": [
      "Could offer proactive follow-up"
    ],
    "customer_satisfaction": 4,
    "coaching_effectiveness": 4,
    "resolution_status": "resolved"
  },
  "processing_time_ms": 2500,
  "error": null
}
```

---

## 🔄 Long Call Handling

For calls with many transcripts, the system uses **smart chunking**:

1. **Keep first message** (usually greeting)
2. **Keep most recent messages** that fit within token limit
3. **Discard middle messages** if needed

```python
# Default limit: 8000 characters
chunk_transcripts(transcripts, max_chars=8000)
```

This ensures the AI can process long calls without hitting token limits.

---

## 🔗 Node.js Integration

The Node.js backend uses `ai-agent-client.ts` to call the API:

```typescript
import { generateCallSummaryWithFallback } from './services/ai-agent-client';

const { summary, source } = await generateCallSummaryWithFallback(
  {
    call_id: 'uuid',
    transcripts: [...],
    coaching_history: [...],
    // ...other data
  },
  generateMockSummary // Fallback function
);

// source = 'ai' | 'mock'
```

**Fallback behavior:**
1. Check if AI service is healthy (`GET /health`)
2. If healthy, call AI API
3. If unhealthy or fails, use mock generator
4. Log which source was used

---

## 📊 LangGraph Workflow

The summary generation uses a **parallel workflow**:

### Nodes

| Node | Purpose | Output |
|------|---------|--------|
| **Sentiment Analysis** | Analyze customer emotion over time | `sentiment_timeline`, `overall_sentiment` |
| **Key Moments** | Identify critical conversation points | `key_moments` (escalations, resolutions) |
| **Performance Analysis** | Evaluate operator performance | `strengths`, `improvements` |
| **Aggregator** | Combine all analyses into final summary | Complete `CallSummary` object |

### Prompts

Located in `server/agent/python-livekit/agents/prompts/call_summary_prompts.py`:

- `SENTIMENT_ANALYSIS_PROMPT` - Emotion tracking
- `KEY_MOMENTS_PROMPT` - Critical events
- `OPERATOR_PERFORMANCE_PROMPT` - Performance evaluation
- `SUMMARY_AGGREGATION_PROMPT` - Final summary synthesis

---

## 🐛 Troubleshooting

### API Not Responding

```bash
# Check if server is running
curl http://localhost:8001/health

# Check logs
# Server outputs to stdout with [CallSummaryAPI] prefix
```

### Workflow Not Loaded

```bash
# Restart server - workflow loads on startup
python api/server.py
```

### Token Limit Errors

- System automatically chunks transcripts
- Check logs for `[Chunking]` messages
- Adjust `max_chars` in `chunk_transcripts()` if needed

---

## 📚 Related

- [Call Recording](./call-recording.md)
- [QA Scoring](./qa-scoring.md)
- [AXTRA Copilot](./axtra-copilot.md)

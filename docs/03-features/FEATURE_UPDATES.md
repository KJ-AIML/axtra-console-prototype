# Feature Updates

Summary of recent feature development and enhancements.

---

## 📅 Latest Updates (February 2026)

### 4. Persona Call History Synchronization ✅

**Database-Driven Call History**
- Created `persona_call_history` table with migration support
- Seeded 12 realistic call history records for 8 default personas
- Call history now persists across page reloads and sessions

**Cross-Page Data Consistency**
- Personas page (`/personas`) shows call history in detail view
- ActiveSimulation page (`/simulation/:id`) shows same call history in Customer Data Panel
- Both pages use unified API endpoints for consistent data

**API Enhancements**
- `getPersonaWithScenarios()` - includes `callHistory` in response
- `getPrimaryPersonaForScenario()` - includes `callHistory` for simulation view
- `seedCallHistory()` - deterministic seed data for all personas

**UI Improvements**
- Added loading state while fetching persona details
- Added empty state message when no call history available
- Null-safe rendering with `(callHistory || [])`

**Files Modified:**
- `server/personas.ts` - Database schema, seed data, API functions
- `src/stores/usePersonaStore.ts` - Store types and API integration
- `src/pages/Personas.tsx` - Detail view with call history
- `src/pages/ActiveSimulation.tsx` - Customer Data Panel History tab

---

## 📅 Previous Updates (February 2026)

### 1. QA Scoring System Enhancement ✅

**Flexible Scoring Types**
- Added support for **Scale** (1-N) and **Binary** (Yes/No) scoring types
- Configurable `max_score` for scale criteria (default: 5)
- Optional `weight` field for weighted score calculations
- `is_required` flag to mark criteria as required or optional

**New Database Schema**
- `qa_criteria` table for dynamic criteria configuration
- `human_qa` table stores flexible `criteria_scores` as JSON
- Support for criteria ordering and activation status

**Reviewed Calls Page**
- New `/qa-reviewed` page for completed QA reviews
- Statistics overview (total reviewed, avg score, approval rate)
- AI vs Human score comparison
- Filterable and exportable review history

**Files Modified:**
- `server/qa-scoring.ts`
- `src/pages/QAReviewDetail.tsx`
- `src/pages/QAReviewedCalls.tsx`
- `docs/03-features/qa-scoring.md`

---

### 2. Dual Audio Playback Enhancement ✅

**Synchronized Playback**
- Channel selector: 'You' (Operator) | 'Customer' (Agent) | 'Both'
- Both tracks synchronize time during playback in "Both" mode
- Auto-play agent track if user clicks before it loads

**Audio Playback Fixes**
- Fixed R2 URL mismatch (removed duplicate timestamp)
- Added CORS headers for audio streaming
- Implemented URL variations fallback for compatibility

**Files Modified:**
- `server/egress-service.ts` - Fixed `getFilePath()` to not include timestamp
- `server/index.ts` - Added CORS headers to audio endpoint
- `src/pages/QAReviewDetail.tsx` - Dual audio with sync
- `src/pages/RecordingDetail.tsx` - Channel selection
- `docs/03-features/call-recording.md`

---

### 3. Thai Language Support ✅

**Agent Language Configuration**
- Added explicit Thai language instruction to agent prompts
- AI agent now responds and speaks in Thai (ภาษาไทย)
- Coaching cards and summaries automatically detect and use Thai

**Prompt Updates**
- `server/agent/python-livekit/prompts.py` - Main agent Thai instruction
- `server/agent/python-livekit/agents/prompts/call_summary_prompts.py` - Summary language rules
- `server/agent/python-livekit/agents/prompts/qa_analysis_prompts.py` - QA language rules

**Files Modified:**
- `server/agent/python-livekit/prompts.py`
- `server/agent/python-livekit/agents/prompts/*.py`
- `docs/03-features/voice-ai/axtra-copilot.md`

---

## 📋 Summary of Changes

| Feature | Status | Key Changes |
|---------|--------|-------------|
| **Persona Call History** | ✅ Complete | Database-synced call history across all views |
| **QA Flexible Scoring** | ✅ Complete | Scale/Binary types, weights, required/optional |
| **QA Reviewed Page** | ✅ Complete | `/qa-reviewed` with stats and comparison |
| **Dual Audio Sync** | ✅ Complete | Channel selection, synchronized playback |
| **Audio CORS Fix** | ✅ Complete | CORS headers, URL fallback |
| **Thai Language** | ✅ Complete | Agent responds in Thai |

---

## 🚀 How to Use

### QA Scoring with Flexible Criteria

1. **Configure Criteria:**
   ```http
   POST /api/qa/criteria
   {
     "name": "Professionalism",
     "type": "scale",
     "max_score": 5,
     "is_required": true,
     "weight": 20
   }
   ```

2. **Score a Call:**
   ```http
   POST /api/qa/scores
   {
     "call_id": "...",
     "criteria_scores": [...],
     "status": "submitted"
   }
   ```

3. **View Reviewed Calls:**
   - Navigate to `/qa-reviewed`
   - See statistics and AI vs Human comparisons

### Dual Audio Playback

1. **Open Recording Detail** or **QA Review**
2. **Select Channel:**
   - "You" - Operator audio only
   - "Customer" - Agent audio only  
   - "Both" - Both tracks synchronized
3. **Playback controls** work on both tracks simultaneously

### Thai Language Agent

1. **Verify Prompt:**
   - Check `server/agent/python-livekit/prompts.py` has Thai instruction

2. **Restart Agent:**
   ```bash
   cd server/agent/python-livekit
   uv run python livekit_agent_langchain.py dev
   ```

3. **Start Voice Call** - Agent will respond in Thai

---

## 📚 Updated Documentation

| Document | Updates |
|----------|---------|
| [QA Scoring](./qa-scoring.md) | Flexible criteria, weighted scoring, reviewed calls page |
| [Call Recording](./call-recording.md) | Dual audio sync, CORS fix, URL fallback |
| [AXTRA Copilot](./voice-ai/axtra-copilot.md) | Thai language configuration |

---

## 🔧 Technical Notes

### QA Scoring Migration

If upgrading from the old 5-category fixed system:

```sql
-- Old data is preserved in qa_scores table
-- New data uses human_qa table with JSON criteria_scores
-- Both systems can coexist during transition
```

### Audio File Paths

```
# New format (no timestamp in path)
recordings/{call-id}/operator.ogg
recordings/{call-id}/agent.ogg

# LiveKit adds its own timestamp to the actual file
```

### Language Detection

The coaching prompts automatically detect conversation language:
```python
# Detected from last message in conversation logs
# All coaching outputs match the detected language
```

---

## 🐛 Known Issues & Fixes

### Fixed

| Issue | Fix |
|-------|-----|
| R2 URL mismatch | Removed timestamp from file path |
| CORS errors | Added CORS headers to audio endpoint |
| Audio out of sync | Both tracks use same currentTime reference |
| Agent speaking English | Added explicit Thai language instruction |

### Tips

- **Audio not playing?** Check R2 CORS configuration
- **QA scores not saving?** Verify all required criteria have scores
- **Coaching cards empty?** Check trigger calculation in logs

---

## 📞 Support

For issues or questions:
1. Check [Troubleshooting](../../06-reference/troubleshooting.md)
2. Review feature-specific documentation
3. Check server logs with `DEBUG_MODE=true`

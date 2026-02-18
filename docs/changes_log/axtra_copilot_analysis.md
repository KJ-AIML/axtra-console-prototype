# AXTRA Copilot (Realtime Suggestion System) - Analysis Report

**Date:** 2026-02-17  
**System:** AXTRA Copilot - Real-time AI Coaching for Call Center Training

---

## Executive Summary

The AXTRA Copilot is a **parallel LangGraph workflow** that analyzes voice conversations in real-time and provides coaching suggestions to call center operators during training simulations. The system runs alongside the voice agent (Gemini Realtime API) and processes conversation data every 3 turns/300 characters/30 seconds.

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AXTRA Copilot - Parallel Architecture                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────────┐        ┌──────────────────────────────────────┐  │
│   │   VOICE AGENT        │        │   SUPERVISOR PROCESS (LangGraph)     │  │
│   │   (Gemini Realtime)  │        │                                      │  │
│   │                      │        │  ┌────────────┐  ┌────────────┐     │  │
│   │  • Handles STT/TTS   │        │  │ Card 1:    │  │ Card 2:    │     │  │
│   │  • Customer voice    │        │  │ EMOTION    │  │ LEVERAGE   │     │  │
│   │  • Persona acting    │        │  │            │  │            │     │  │
│   │                      │        │  │ • Detect   │  │ • Identify │     │  │
│   │  Events:             │        │  │   emotion  │  │   benefits │     │  │
│   │  - user_input_       │───────▶│  │ • Context  │  │ • Perks    │     │  │
│   │    transcribed       │        │  │ • Action   │  │ • Action   │     │  │
│   │                      │        │  └─────┬──────┘  └─────┬──────┘     │  │
│   │  - conversation_     │        │        │               │            │  │
│   │    item_added        │        │  ┌─────▼───────────────▼──────┐     │  │
│   │                      │        │  │ Card 3: STRATEGY           │     │  │
│   └──────────────────────┘        │  │                            │     │  │
│           │                       │  │ • Churn risk detection     │     │  │
│           │                       │  │ • Escalation prevention    │     │  │
│           │                       │  │ • Next best action         │     │  │
│           │                       │  └─────────────┬──────────────┘     │  │
│           │                       │                │                    │  │
│           │                       │        ┌───────▼────────┐           │  │
│           │                       │        │ AGGREGATOR     │           │  │
│           │                       │        │                │           │  │
│           │                       │        │ • Synthesize   │           │  │
│           │                       │        │   all cards    │           │  │
│           │                       │        │ • Generate     │           │  │
│           │                       │        │   script       │           │  │
│           │                       │        └───────┬────────┘           │  │
│           │                       │                │                    │  │
│           │                       └────────────────┼────────────────────┘  │
│           │                                        │                        │
│           │                       ┌────────────────▼────────────────┐       │
│           │                       │   Data Channel Publish          │       │
│           │                       │   (coaching_update payload)     │       │
│           │                       └────────────────┬────────────────┘       │
│           │                                        │                        │
│           └────────────────────────────────────────┘                        │
│                                                    │                        │
│   ┌────────────────────────────────────────────────▼──────────────────┐    │
│   │                         FRONTEND (React)                           │    │
│   │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐    │    │
│   │  │ Emotion Card   │  │ Leverage Card  │  │ Strategy Card    │    │    │
│   │  │ (Status)       │  │ (Perks/Benefit)│  │ (Risk/Action)    │    │    │
│   │  └────────────────┘  └────────────────┘  └──────────────────┘    │    │
│   │                                                                  │    │
│   │  ┌──────────────────────────────────────────────────────────┐   │    │
│   │  │ Suggested Script (Summary + Actionable Response)         │   │    │
│   │  └──────────────────────────────────────────────────────────┘   │    │
│   └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Trigger Conditions

Analysis runs when **ANY** of these thresholds are met:

| Trigger | Condition | Description |
|---------|-----------|-------------|
| **First Analysis** | 3 turns | Initial analysis after conversation starts |
| **Periodic** | Every 3 turns | Subsequent analyses after first |
| **Character Count** | 300+ chars | Accumulated text since last analysis |
| **Time Elapsed** | 30+ seconds | Time since last analysis |

**Code Implementation:**
```python
# TRIGGER 1: First analysis (after initial turns)
if not self.analysis_done and len(self.turns) >= 3:
    triggers.append("first_analysis")

# TRIGGER 2: Periodic (every N turns after first)
elif self.analysis_done and len(self.buffer_since_analysis) >= 3:
    triggers.append("periodic")

# TRIGGER 3: Character threshold
if self.chars_since_analysis >= 300:
    triggers.append("chars")

# TRIGGER 4: Time threshold
if time_since_last >= 30 and len(self.buffer_since_analysis) > 0:
    triggers.append("time")
```

---

## LangGraph Workflow Detail

### Parallel Card Analysis

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  START  │────▶│  Card 1     │     │  Card 2     │     │  Card 3     │
└─────────┘     │  (EMOTION)  │     │  (LEVERAGE) │     │  (STRATEGY) │
                └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
                       │                     │                     │
                       └─────────────────────┼─────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   AGGREGATOR    │
                                    │                 │
                                    │ • Synthesize    │
                                    │   all cards     │
                                    │ • Generate      │
                                    │   script        │
                                    └────────┬────────┘
                                             │
                                             ▼
                                       ┌──────────┐
                                       │   END    │
                                       └──────────┘
```

### Card Definitions

| Card | LLM Role | Objective | Output |
|------|----------|-----------|--------|
| **Card 1** | Emotional Intelligence Analyst | Detect customer emotion | `{title, detail, action, status}` |
| **Card 2** | Customer Success & Policy Expert | Identify leverage/perks | `{title, detail, action, status}` |
| **Card 3** | Strategic Sales & Support Coach | Determine next action | `{title, detail, action, status}` |

### Aggregator Role

**Input:** All 3 card responses + conversation history  
**Output:** Suggested script with summary

```python
{
  "summary": "Brief situation synthesis",
  "suggested_script": "What the operator should say next"
}
```

---

## Example Data Flow

### Scenario: Angry Customer (Sarah Thompson) Billing Dispute

#### Turn 1-3: Customer speaks Thai
```
Customer (AI): "สวัสดีค่ะ ดิฉันชื่อSarah โทรมาร้องเรียนเรื่องค่าบริการ"
Agent (Operator): "สวัสดีค่ะ ยินดีให้บริการค่ะ"
Customer (AI): "ฉันโดนเรียกเก็บเงินเกิน 45 ดอลล่าสุดเดือนนี้ ไม่ยอมรับได้!"
```

#### Trigger Fires: First Analysis (3 turns complete)

**Input to Workflow:**
```json
{
  "user_info": {
    "userId": "ec4db2ef-91ba-4b12-91e7-7bdf75b557ba",
    "userName": "Admin User"
  },
  "context_summary": [],
  "conversation_data": [
    {
      "turn_id": 1,
      "speaker": "Customer",
      "text": "สวัสดีค่ะ ดิฉันชื่อSarah โทรมาร้องเรียนเรื่องค่าบริการ",
      "timestamp": "2026-02-17T17:00:10.984859"
    },
    {
      "turn_id": 2,
      "speaker": "Agent",
      "text": "สวัสดีค่ะ ยินดีให้บริการค่ะ",
      "timestamp": "2026-02-17T17:00:11.016060"
    },
    {
      "turn_id": 3,
      "speaker": "Customer",
      "text": "ฉันโดนเรียกเก็บเงินเกิน 45 ดอลล่าสุดเดือนนี้ ไม่ยอมรับได้!",
      "timestamp": "2026-02-17T17:00:23.471044"
    }
  ]
}
```

#### Parallel LLM Calls

**Card 1 (Emotion) Output:**
```json
{
  "title": "ลูกค้าโกรธมาก",
  "detail": "ลูกค้าแสดงอารมณ์โกรธและไม่พอใจอย่างชัดเจน เนื่องจากถูกเรียกเก็บเงินเกิน $45",
  "action": "แสดงความเข้าใจและขออภัยอย่างจริงใจ ยอมรับความผิดพลาด",
  "status": "danger"
}
```

**Card 2 (Leverage) Output:**
```json
{
  "title": "ลูกค้าระดับ Gold",
  "detail": "ลูกค้าเป็น Gold tier ตั้งแต่ปี 2019 มีสิทธิ์ได้รับการดูแลพิเศษ",
  "action": "เสนอสิทธิประโยชน์ Gold tier: คืนเงินทันที + ส่วนลดพิเศษ",
  "status": "success"
}
```

**Card 3 (Strategy) Output:**
```json
{
  "title": "เสี่ยงยกเลิกบริการ",
  "detail": "ลูกค้าใช้บริการมานานแต่ไม่พอใจรุนแรง มีความเสี่ยงสูงที่จะยกเลิก",
  "action": "รีบดำเนินการแก้ไขทันที อย่าปล่อยให้รอนาน",
  "status": "danger"
}
```

#### Aggregator Synthesis

**Aggregator Input:** All 3 cards + conversation

**Aggregator Output:**
```json
{
  "summary": "ลูกค้าระดับ Gold (Sarah) โกรธมากเรื่องถูกเรียกเก็บเงินเกิน $45 มีความเสี่ยงยกเลิกบริการสูง",
  "suggested_script": "ขออภัยค่ะคุณ Sarah ที่เกิดความผิดพลาดเรื่องค่าบริการ ดิฉันจะรีบตรวจสอบและดำเนินการคืนเงิน $45 ให้ทันทีค่ะ นอกจากนี้ในฐานะลูกค้า Gold ของเรา ดิฉันขอเสนอส่วนลดพิเศษ 10% สำหรับบิลถัดไปเป็นค่าทดแทนค่ะ"
}
```

#### Frontend Display

**Cards Shown:**

| Card | Title | Detail | Action | Status |
|------|-------|--------|--------|--------|
| 🎭 Emotion | ลูกค้าโกรธมาก | ลูกค้าแสดงอารมณ์โกรธ... | แสดงความเข้าใจ... | 🔴 danger |
| 💎 Leverage | ลูกค้าระดับ Gold | ลูกค้าเป็น Gold tier... | เสนอสิทธิประโยชน์... | 🟢 success |
| 🎯 Strategy | เสี่ยงยกเลิกบริการ | ลูกค้าใช้บริการมานาน... | รีบดำเนินการแก้ไข... | 🔴 danger |

**Suggested Script (Copy Button):**
```
ขออภัยค่ะคุณ Sarah ที่เกิดความผิดพลาดเรื่องค่าบริการ 
ดิฉันจะรีบตรวจสอบและดำเนินการคืนเงิน $45 ให้ทันทีค่ะ 
นอกจากนี้ในฐานะลูกค้า Gold ของเรา ดิฉันขอเสนอส่วนลดพิเศษ 10% 
สำหรับบิลถัดไปเป็นค่าทดแทนค่ะ
```

---

## Data Channel Payload

```json
{
  "type": "coaching_update",
  "analysis_id": 1,
  "timestamp": 1771322426076,
  "cards": [
    {
      "title": "ลูกค้าโกรธมาก",
      "detail": "ลูกค้าแสดงอารมณ์โกรธและไม่พอใจ...",
      "action": "แสดงความเข้าใจและขออภัย...",
      "status": "danger"
    },
    {
      "title": "ลูกค้าระดับ Gold",
      "detail": "ลูกค้าเป็น Gold tier ตั้งแต่ปี 2019...",
      "action": "เสนอสิทธิประโยชน์ Gold tier...",
      "status": "success"
    },
    {
      "title": "เสี่ยงยกเลิกบริการ",
      "detail": "ลูกค้าใช้บริการมานานแต่ไม่พอใจรุนแรง...",
      "action": "รีบดำเนินการแก้ไขทันที...",
      "status": "danger"
    }
  ],
  "script": {
    "summary": "ลูกค้าระดับ Gold (Sarah) โกรธมาก...",
    "suggestion": "ขออภัยค่ะคุณ Sarah ที่เกิดความผิดพลาด..."
  }
}
```

---

## Feedback & Recommendations

### ✅ Strengths

1. **Parallel Architecture** - All 3 cards run simultaneously, reducing latency
2. **Multi-Language Support** - Prompts detect language and respond in same language (Thai/English)
3. **Clear Separation of Concerns** - Each card has specific role (Emotion, Leverage, Strategy)
4. **Real-time** - Analysis triggers based on conversation activity, not fixed intervals
5. **Context Awareness** - Aggregator considers conversation history and last speaker

### ⚠️ Issues Identified

#### 1. **Critical Context Gap: Who is the Customer?**

**Problem:** The workflow receives `user_info` which is the **operator's info**, not the **customer persona** info.

**Current Input:**
```json
{
  "user_info": {
    "userId": "ec4db2ef-91ba-4b12-91e7-7bdf75b557ba",
    "userName": "Admin User"
  }
}
```

**Missing:** Customer tier, account history, behavior profile, escalation triggers

**Impact:** Card 2 (Leverage) cannot identify actual customer benefits because it doesn't know:
- Customer tier (Gold/Silver/Bronze)
- Account tenure (since 2019)
- Historical issues
- Entitled perks

**Recommendation:** Pass `persona_config` to workflow instead of `user_info`:
```json
{
  "customer_profile": {
    "name": "Sarah Thompson",
    "tier": "Gold",
    "account_since": "2019",
    "behavior_profile": {
      "initialMood": "angry",
      "patienceLevel": "low",
      "escalationTriggers": ["long hold times", "repeating information"]
    }
  }
}
```

---

#### 2. **Timing Issue: Analysis Happens After Agent Speaks**

**Problem:** Current trigger logic analyzes after the operator responds, making suggestions reactive instead of proactive.

**Current Flow:**
```
Customer speaks → Agent responds → Analysis runs → Suggestion shows
                    ↑ Problem: Agent already spoke!
```

**Impact:** Suggested script arrives too late - operator has already responded.

**Recommendation:** Trigger analysis on **customer speech completion**, before agent responds:
```python
@session.on("user_input_transcribed")
def on_transcript(transcript):
    if transcript.is_final:
        # TRIGGER ANALYSIS IMMEDIATELY
        trigger = conv_manager.add_turn("Customer", text)
        if trigger.get("should_analyze"):
            # Run analysis BEFORE agent generates response
            # Result can guide agent's response generation
```

---

#### 3. **Aggregator Logic Flaw: Context Misinterpretation**

**Problem:** The aggregator prompt tries to determine "who spoke last" but this is often incorrect due to timing.

**Current Prompt:**
```python
"""Identify the LAST speaker in the conversation:
   - If LAST is "Agent" → Agent just spoke, WAITING for customer
   - If LAST is "Customer" → Customer just spoke, Agent needs to RESPOND"""
```

**Problem:** The conversation_data includes the AI agent's own responses as "Agent", not just the operator.

**Recommendation:** Distinguish between:
- `Operator` (human trainee)
- `Customer` (AI persona)

Don't track AI responses as "Agent" in coaching context.

---

#### 4. **No Escalation Detection from Behavior Profile**

**Problem:** Personas have defined escalation triggers (e.g., "long hold times", "repeating information"), but these aren't monitored.

**Persona Config:**
```json
{
  "escalationTriggers": ["long hold times", "repeating information", "no resolution"],
  "deescalationTriggers": ["empathy", "discounts", "quick resolution"]
}
```

**Current:** Card 3 (Strategy) does generic churn risk analysis

**Recommendation:** Add explicit escalation trigger monitoring:
```python
# In ConversationManager
if any(trigger in last_customer_message for trigger in persona_escalation_triggers):
    card_3_data["status"] = "danger"
    card_3_data["action"] = f"ESCALATION TRIGGER: {matched_trigger}"
```

---

#### 5. **Missing Post-Call Summary Workflow**

**Current State:** The `call_model_summary` function is commented out and not used.

**Recommendation:** Implement post-call summary for training review:
- Overall performance score
- Key moments (escalations, resolutions)
- Coaching effectiveness
- Suggested improvements

---

### 🔧 Suggested Improvements

| Priority | Improvement | Impact |
|----------|-------------|--------|
| **HIGH** | Pass persona_config to workflow | Better leverage identification |
| **HIGH** | Trigger analysis on customer speech | Proactive suggestions |
| **MEDIUM** | Add escalation trigger monitoring | More relevant strategy cards |
| **MEDIUM** | Implement post-call summary | Training review value |
| **LOW** | Add confidence scores to cards | Operator can judge suggestion quality |
| **LOW** | Cache LLM responses for similar contexts | Reduce API costs |

---

## Performance Metrics

Based on logs, current system performance:

| Metric | Value | Notes |
|--------|-------|-------|
| **Analysis Latency** | ~2-3 seconds | End-to-end from trigger to publish |
| **LLM Calls per Analysis** | 4 parallel | 3 cards + 1 aggregator |
| **Trigger Frequency** | Every 3 turns | Could be too frequent/infrequent |
| **Context Window** | Last 6 turns | Good balance of context vs noise |

---

## Conclusion

The AXTRA Copilot system has a solid foundation with:
- Clean parallel architecture using LangGraph
- Multi-language support
- Real-time data flow via LiveKit Data Channels

**Critical fixes needed:**
1. Pass customer persona data (not operator data) to workflow
2. Trigger analysis on customer speech completion for proactive suggestions
3. Fix speaker identification to distinguish Operator vs AI Customer

With these fixes, the system will provide more relevant, timely coaching that truly helps operators improve their skills.

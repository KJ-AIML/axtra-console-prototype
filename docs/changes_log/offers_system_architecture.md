# Offers & Rules System Architecture

**Date:** 2026-02-17  
**Purpose:** Thai Market Promotion System (The 1 Exclusive Integration)

---

## Overview

The Offers & Rules system consists of:
1. **General Promotions** - Public campaigns (e.g., The 1 Exclusive 5th Anniversary)
2. **Personal Promotions** - Targeted campaigns based on tier, tenure, and behavior
3. **Knowledge Base** - Support articles searchable by Copilot
4. **Realtime Copilot** - AI suggestions including promotion recommendations

---

## Database Schema

### 1. General Promotions (`general_promotions`)

```sql
- id: TEXT PRIMARY KEY
- name, name_th: Campaign names
- promo_code: Optional code (NULL for auto-apply)
- discount_type: percentage | fixed_amount | free_shipping | free_gift | points_bonus
- discount_value, max_discount_amount
- usage_limit_total, usage_limit_per_user, usage_count
- start_date, end_date
- status: draft | active | paused | expired | disabled
- copilot_suggestion_enabled: BOOLEAN
- copilot_trigger_keywords: JSON array
```

### 2. Personal Promotions (`personal_promotions`)

```sql
- id: TEXT PRIMARY KEY
- name, name_th: Promotion names
- discount_type: + tier_upgrade
- benefits_summary: JSON {discount_percent, extra_points, etc.}

-- TARGETING CRITERIA
- target_tiers: JSON ["Gold", "Platinum"]
- target_min_tenure_months: Minimum membership duration
- target_max_tenure_months: For new user promos
- target_account_age_years: e.g., 5 for "5th anniversary"

-- TRIGGER SETTINGS
- trigger_type: manual | auto_escalation | auto_churn_risk | auto_birthday | auto_anniversary | auto_inactive
- trigger_conditions: JSON with specific conditions
- auto_apply: BOOLEAN
- require_operator_approval: BOOLEAN

-- COPILOT INTEGRATION
- copilot_card_title, copilot_card_title_th: Short title for Card 2
- copilot_suggestion_script, copilot_suggestion_script_th: What operator should say
```

### 3. Knowledge Base (`knowledge_base_articles`)

```sql
- title, title_th, content, content_th
- category, tags, keywords
- copilot_searchable: BOOLEAN
- copilot_priority: Higher = suggested first
- copilot_trigger_keywords: JSON array
- view_count, helpful_count
```

### 4. Copilot User Settings (`copilot_user_settings`)

```sql
- Feature toggles: emotion_analysis, leverage_suggestions, etc.
- Card display settings: show_confidence, show_tier_badge, etc.
- Trigger settings: turns_threshold, char_threshold, time_threshold
```

---

## The 1 Exclusive 5th Anniversary Campaign

### General Promotion Details

| Field | Value |
|-------|-------|
| **ID** | `promo-the1-5th-anniversary` |
| **Name (TH)** | ฉลองครบ 5 ปี The 1 Exclusive |
| **Duration** | 31 Jan - 28 Feb 2026 |
| **Status** | Active |

### Benefits

| Benefit | Value |
|---------|-------|
| 💰 คูปองแทนเงินสด | ฿4,300 |
| 💳 คะแนน Mastercard | +1,000 คะแนน |
| 👑 คะแนน Central The 1 | +120,000 คะแนน |
| 🛡️ ต่อสถานะสมาชิก | 2 ปี |
| ✈️ ลุ้นทริปมัลดีฟส์ | 1 รางวัล |

### Locations
- เซ็นทรัล รีเทล
- ศูนย์การค้าเซ็นทรัล
- เซ็นทรัลชิดลม
- ศูนย์การค้าเซ็นทรัล เอ็มบาสซี

---

## Personal Promotions (Tier-Based)

### 1. Gold Member Retention

```yaml
ID: personal-gold-retention
Tier: Gold
Min Tenure: 12 months
Trigger: auto_escalation (cancel_request)
Auto-Apply: Yes

Benefits:
  - 15% OFF
  - +5,000 points
  - 6 months free shipping

Copilot Script:
  th: "ในฐานะสมาชิก Gold ที่สำคัญของเรา ดิฉันขอเสนอส่วนลด 15% วันนี้ 
       พร้อมรับคะแนนพิเศษ 5,000 คะแนน สิทธิพิเศษนี้มีเฉพาะสมาชิก Gold เท่านั้นค่ะ"
```

### 2. 5 Year Milestone

```yaml
ID: personal-5year-milestone
Tier: All (Silver, Gold, Platinum)
Account Age: 5 years
Trigger: auto_anniversary
Auto-Apply: No (requires operator approval)

Benefits:
  - ฿500 Credit
  - 6 months tier extension

Copilot Script:
  th: "ขอแสดงความยินดีที่ท่านอยู่กับเรามาครบ 5 ปีค่ะ! 
       ดิฉันมีเครดิตพิเศษ 500 บาทให้ท่าน พร้อมต่ออายุสถานะสมาชิกเพิ่มอีก 6 เดือนค่ะ"
```

### 3. New Member Welcome

```yaml
ID: personal-new-member
Tier: Bronze
Max Tenure: 3 months (new customers)
Trigger: manual
Auto-Apply: No

Benefits:
  - 20% OFF (max ฿1,000)
  - Welcome gift

Copilot Script:
  th: "ยินดีต้อนรับสู่ The 1 ค่ะ! ในฐานะสมาชิกใหม่ ดิฉันขอเสนอส่วนลด 20% 
       สำหรับการซื้อครั้งแรก สูงสุด 1,000 บาท พร้อมของขวัญต้อนรับพิเศษค่ะ"
```

---

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFERS & RULES SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │ GENERAL PROMOTIONS  │    │ PERSONAL PROMOTIONS │                         │
│  │                     │    │                     │                         │
│  │ The 1 5th Anniv.  │◄──►│ • Gold Retention   │                         │
│  │ • Auto-apply      │    │ • 5 Year Milestone │                         │
│  │ • Trigger keywords│    │ • New Member       │                         │
│  └──────────┬──────────┘    └──────────┬──────────┘                         │
│             │                          │                                    │
│             │    ┌─────────────────┐   │                                    │
│             └───►│  KNOWLEDGE BASE │◄──┘                                    │
│                  │                 │                                        │
│                  │ • Billing FAQ   │                                        │
│                  │ • VIP Articles  │                                        │
│                  │ • Promotion T&Cs│                                        │
│                  └────────┬────────┘                                        │
│                           │                                                 │
│                           ▼                                                 │
│                  ┌─────────────────┐                                        │
│                  │ REALTIME COPILOT│                                        │
│                  │                 │                                        │
│                  │ Card 1: Emotion │                                        │
│                  │ Card 2: Leverage│◄── Personal Promotions (if match)      │
│                  │ Card 3: Strategy│                                        │
│                  │                 │                                        │
│                  │ Suggested Script│──► Operator speaks to customer        │
│                  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How Copilot Uses Promotions

### 1. Trigger Detection

During a call, Copilot monitors for:
- **Keywords**: "The 1", "ครบรอบ", "5 ปี", "เซ็นทรัล", "สมาชิก"
- **Customer Tier**: Gold, Silver, Platinum, Bronze
- **Tenure**: How long they've been a member
- **Behavior**: At-risk, new member, anniversary

### 2. Promotion Matching

```typescript
// Example: Customer calls about canceling
const customer = {
  tier: 'Gold',
  tenure_months: 18,
  last_purchase_days: 75,
  escalation_type: 'cancel_request'
};

// Copilot matches: personal-gold-retention
// Shows in Card 2 (Leverage):
// Title: "รักษาสมาชิก Gold: ลด 15% + 5,000 คะแนน"
// Script: "ในฐานะสมาชิก Gold..."
```

### 3. Display in Copilot Cards

**Card 2 - Leverage** (when personal promo matches):
```
┌─────────────────────────────────────────┐
│ 💎 Gold Retention: 15% Off + 5,000 pts  │
│                                         │
│ เสนอสิทธิพิเศษเฉพาะสมาชิก Gold:         │
│ • ส่วนลด 15%                           │
│ • คะแนนพิเศษ 5,000                      │
│ • ส่งฟรี 6 เดือน                        │
│                                         │
│ [Apply Promotion] [View Details]       │
└─────────────────────────────────────────┘
```

---

## Files Created

| File | Purpose |
|------|---------|
| `server/db/schema/offers.sql` | Complete database schema |
| `server/db/migrations/003_offers_and_copilot.sql` | Migration file |
| `src/lib/api-types-offers.ts` | TypeScript types |
| `src/pages/Offers.tsx` | Updated UI with Thai promotion |
| `docs/changes_log/offers_system_architecture.md` | This documentation |

---

## Next Steps (Not Yet Implemented)

### 1. Backend API Endpoints
```typescript
// General Promotions
GET    /api/promotions/general
POST   /api/promotions/general
PUT    /api/promotions/general/:id
DELETE /api/promotions/general/:id

// Personal Promotions
GET    /api/promotions/personal
POST   /api/promotions/personal
PUT    /api/promotions/personal/:id
DELETE /api/promotions/personal/:id

// Copilot Integration
GET    /api/copilot/promotions/suggest  // Get matching promos during call
POST   /api/copilot/promotions/apply     // Apply selected promo
```

### 2. Python Agent Integration
```python
# In livekit_agent_langchain.py
# When analyzing conversation, check for:
# - Customer tier from persona_config
# - Trigger keywords in conversation
# - Match with personal_promotions table
# - Include matching promos in coaching_data
```

### 3. Frontend Enhancements
- Promotion detail modal
- Create/Edit promotion forms
- Usage analytics dashboard
- A/B testing for promotions

---

## Key Features

✅ **Database Schema** - Complete with seed data  
✅ **TypeScript Types** - Full type safety  
✅ **Mock UI** - Visual representation  
✅ **Thai Language Support** - All promotions in Thai  
⏳ **Backend API** - To be implemented  
⏳ **Python Agent** - To be integrated  
⏳ **Real Workflow** - Pending your clarification  

# Persona Architecture Proposal

## Overview

This document proposes a **One-to-Many** relationship between Personas and Simulations, enabling rich, reusable AI customer personas across multiple training scenarios.

---

## Relationship Model

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│    personas     │  1    M │ persona_scenarios   │ M     1 │    scenarios    │
│   (AI actors)   │◄───────►│   (junction)        │◄────────│  (simulations)  │
└─────────────────┘         └─────────────────────┘         └─────────────────┘

One Persona can appear in Many Scenarios
One Scenario has One Primary Persona (but can reference others)
```

---

## Database Schema

### 1. personas Table (NEW)

Central repository of AI customer personas.

```sql
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                      -- Display name: "Sarah Thompson"
  avatar_url TEXT,                         -- Optional avatar image
  
  -- Tier & Value
  tier TEXT DEFAULT 'Silver'               -- Bronze, Silver, Gold, Platinum
    CHECK(tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
  account_value INTEGER DEFAULT 0,         -- Customer lifetime value
  
  -- Demographics
  age_group TEXT,                          -- 25-34, 35-44, 55+, etc.
  region TEXT,                             -- Geographic region
  language TEXT DEFAULT 'en',              -- Primary language
  
  -- Contact (for simulation display)
  email TEXT,
  phone TEXT,
  account_since TEXT,                      -- ISO date string
  
  -- Contract Info (JSON for flexibility)
  contract_info TEXT,                      -- JSON: {plan, monthlyValue, renewalDate, status}
  
  -- AI Behavior Profile (JSON)
  behavior_profile TEXT,                   -- JSON:
                                           -- {
                                           --   initialMood: 'angry' | 'frustrated' | 'calm' | 'happy' | 'panicked',
                                           --   patienceLevel: 'low' | 'medium' | 'high',
                                           --   cooperationLevel: 'low' | 'medium' | 'high',
                                           --   escalationTriggers: string[],
                                           --   deescalationTriggers: string[],
                                           --   communicationStyle: 'formal' | 'casual' | 'aggressive' | 'passive'
                                           -- }
  
  -- Voice Configuration
  voice_id TEXT,                           -- LiveKit/OpenAI voice ID
  voice_speed TEXT DEFAULT 'normal',       -- slow, normal, fast
  
  -- AI Prompt Template
  system_prompt TEXT,                      -- Base personality prompt
  greeting_template TEXT,                  -- Opening lines
  
  -- Status
  is_active INTEGER DEFAULT 1,             -- Boolean
  is_template INTEGER DEFAULT 0,           -- Can be used as template for new personas
  
  -- Metadata
  created_by TEXT,                         -- User ID who created
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_personas_tier ON personas(tier);
CREATE INDEX idx_personas_active ON personas(is_active);
CREATE INDEX idx_personas_template ON personas(is_template);
```

### 2. persona_scenarios Table (Junction)

Links personas to scenarios with context-specific overrides.

```sql
CREATE TABLE persona_scenarios (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  
  -- Context-specific overrides (optional)
  context_override TEXT,                   -- JSON: Override behavior for this scenario
                                           -- {
                                           --   initialMood: 'panicked',  -- Override default
                                           --   specificIssue: 'Fraud alert on account'
                                           -- }
  
  -- Display order
  display_order INTEGER DEFAULT 0,
  
  -- Stats for this persona in this scenario
  usage_count INTEGER DEFAULT 0,
  avg_score REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  UNIQUE(persona_id, scenario_id)
);

-- Indexes
CREATE INDEX idx_ps_persona ON persona_scenarios(persona_id);
CREATE INDEX idx_ps_scenario ON persona_scenarios(scenario_id);
CREATE INDEX idx_ps_order ON persona_scenarios(scenario_id, display_order);
```

### 3. Modified scenarios Table

```sql
-- Add persona reference
ALTER TABLE scenarios ADD COLUMN primary_persona_id TEXT;
ALTER TABLE scenarios ADD COLUMN allow_random_persona INTEGER DEFAULT 0;  -- Allow any persona

-- Foreign key (optional, for strict integrity)
-- FOREIGN KEY (primary_persona_id) REFERENCES personas(id);
```

### 4. persona_call_history Table (Optional Enhancement)

Track call history per persona (shared across scenarios).

```sql
CREATE TABLE persona_call_history (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  call_type TEXT,                          -- Billing, Technical, etc.
  date TEXT,
  duration TEXT,
  outcome TEXT,                            -- Resolved, Escalated, etc.
  sentiment TEXT,                          -- positive, negative, neutral
  summary TEXT,
  
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);
```

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ name            │
│ ...             │
└────────┬────────┘
         │
         │ creates
         ▼
┌─────────────────┐         ┌─────────────────────┐
│    personas     │◄────────┤ persona_scenarios   │
│─────────────────│   1:M   │─────────────────────│
│ id (PK)         │         │ id (PK)             │
│ name            │         │ persona_id (FK)     │
│ tier            │         │ scenario_id (FK)    │
│ behavior_profile│         │ context_override    │
│ system_prompt   │         │ display_order       │
│ created_by (FK) │         │ usage_count         │
│ is_template     │         └──────────┬──────────┘
│ ...             │                    │
└─────────────────┘                    │ M:1
                                       │
                                       ▼
                              ┌─────────────────┐
                              │    scenarios    │
                              │─────────────────│
                              │ id (PK)         │
                              │ title           │
                              │ category        │
                              │ difficulty      │
                              │ primary_persona │
                              │ ...             │
                              └─────────────────┘
```

---

## Use Cases

### Use Case 1: Multiple Scenarios per Persona

```
Persona: "Sarah Thompson" (Angry Gold Tier Customer)

Scenarios:
1. Billing Dispute - Aggressive
   - Context: "Unexpected $45 charge"
   - Mood Override: angry
   
2. Service Cancellation - Retention
   - Context: "Switching to competitor"
   - Mood Override: frustrated
   
3. Product Return - Damaged Goods
   - Context: "Received broken equipment"
   - Mood Override: upset
   
4. Late Delivery Complaint
   - Context: "Order 3 days late"
   - Mood Override: angry
```

### Use Case 2: Same Scenario, Different Personas

```
Scenario: "Billing Dispute"

Personas:
1. "Sarah Thompson" - Angry, Gold Tier
   - High value customer, expects premium treatment
   
2. "Mike Johnson" - Confused, Bronze Tier
   - First-time caller, needs patient explanation
   
3. "Emily Chen" - Suspicious, Silver Tier
   - Thinks it's a scam, needs verification
```

### Use Case 3: Persona Templates

```
Template: "Angry Customer Base"
- behavior_profile: { initialMood: 'angry', patienceLevel: 'low', ... }
- system_prompt: "You are an angry customer..."

Derived Personas:
1. "Sarah Thompson" - Angry Gold Customer
   - Inherits base + tier: Gold, account_value: 15000
   
2. "Tom Wilson" - Angry Bronze Customer
   - Inherits base + tier: Bronze, account_value: 500
```

---

## API Design

### Get Personas for Scenario

```typescript
// GET /api/scenarios/:id/personas
{
  "primary": {
    "id": "pers-001",
    "name": "Sarah Thompson",
    "tier": "Gold",
    "behavior": { ... },
    "contextOverride": {
      "specificIssue": "Billing dispute - $45 overcharge"
    }
  },
  "alternatives": [
    { "id": "pers-002", "name": "Mike Johnson", ... },
    { "id": "pers-003", "name": "Emily Chen", ... }
  ]
}
```

### Get Scenarios for Persona

```typescript
// GET /api/personas/:id/scenarios
{
  "persona": { "id": "pers-001", "name": "Sarah Thompson", ... },
  "scenarios": [
    {
      "id": "scen-001",
      "title": "Billing Dispute",
      "category": "Billing",
      "contextOverride": { "initialMood": "angry" }
    },
    {
      "id": "scen-002",
      "title": "Service Cancellation",
      "category": "Retention",
      "contextOverride": { "initialMood": "frustrated" }
    }
  ]
}
```

### Create Persona with Scenarios

```typescript
// POST /api/personas
{
  "name": "Sarah Thompson",
  "tier": "Gold",
  "behaviorProfile": { ... },
  "systemPrompt": "...",
  "assignToScenarios": [
    { "scenarioId": "scen-001", "contextOverride": { ... } },
    { "scenarioId": "scen-002", "contextOverride": { ... } }
  ]
}
```

---

## Migration Plan

### Phase 1: Add Tables (Backward Compatible)

```sql
-- 1. Create new tables
CREATE TABLE personas (...);
CREATE TABLE persona_scenarios (...);

-- 2. Migrate existing data
INSERT INTO personas (id, name, tier, ...)
SELECT 
  lower(replace(persona, ' ', '-')),
  persona,
  CASE 
    WHEN persona LIKE '%VIP%' THEN 'Platinum'
    WHEN persona LIKE '%Gold%' THEN 'Gold'
    ELSE 'Silver'
  END
FROM scenarios
WHERE persona IS NOT NULL
GROUP BY persona;

-- 3. Create junction records
INSERT INTO persona_scenarios (persona_id, scenario_id)
SELECT 
  lower(replace(s.persona, ' ', '-')),
  s.id
FROM scenarios s
WHERE s.persona IS NOT NULL;

-- 4. Add column to scenarios (optional, for primary persona)
ALTER TABLE scenarios ADD COLUMN primary_persona_id TEXT;
UPDATE scenarios 
SET primary_persona_id = lower(replace(persona, ' ', '-'));
```

### Phase 2: Update Application Code

1. Update `usePersonaDataStore` to use new API
2. Update `ActiveSimulation` to fetch persona by scenario
3. Update `Personas` page to show persona-scenario relationships

### Phase 3: Deprecate Old Fields

1. Stop using `scenarios.persona` string field
2. Use `persona_scenarios` junction table exclusively

---

## Frontend State Management

```typescript
// stores/usePersonaStore.ts (enhanced)

interface PersonaState {
  // Persona management
  personas: Persona[];
  fetchPersonas: () => Promise<void>;
  createPersona: (data: CreatePersonaRequest) => Promise<Persona>;
  updatePersona: (id: string, data: Partial<Persona>) => Promise<void>;
  
  // Scenario assignments
  assignPersonaToScenario: (personaId: string, scenarioId: string, contextOverride?: object) => Promise<void>;
  removePersonaFromScenario: (personaId: string, scenarioId: string) => Promise<void>;
  getPersonasForScenario: (scenarioId: string) => Promise<Persona[]>;
  getScenariosForPersona: (personaId: string) => Promise<Scenario[]>;
  
  // Selection
  selectedPersona: Persona | null;
  selectedScenarioPersonas: Persona[];
  selectPersona: (persona: Persona | null) => void;
}
```

---

## Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Reusability** | One persona across multiple scenarios |
| **Consistency** | Same AI behavior across training |
| **Maintenance** | Update persona once, affects all scenarios |
| **Flexibility** | Override behavior per scenario |
| **Analytics** | Track persona performance across scenarios |
| **Templates** | Create persona templates for quick setup |
| **Variety** | Mix personas in same scenario |

---

## Questions to Consider

1. **Should scenarios allow multiple personas?** (A: Yes, for variety)
2. **Should personas be shareable across accounts?** (A: Yes, with template system)
3. **Should we version personas?** (A: Maybe, for tracking changes)
4. **Persona cloning?** (A: Yes, create new from template)


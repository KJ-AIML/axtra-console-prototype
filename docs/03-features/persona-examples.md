# Persona Examples: Current vs Proposed

## Current State: One-to-One (Limited)

```typescript
// Current data structure
const scenarios = [
  {
    id: 'scen-001',
    title: 'Billing Dispute',
    category: 'Billing',
    persona: 'Angry Customer',  // Just a name!
    // No rich persona data...
  },
  {
    id: 'scen-002', 
    title: 'Service Cancellation',
    category: 'Retention',
    persona: 'Angry Customer',  // Same name, duplicated config
  }
];

// Problems:
// ❌ "Angry Customer" config duplicated
// ❌ Can't reuse persona easily
// ❌ No way to track persona across scenarios
// ❌ Each scenario needs full persona setup
```

---

## Proposed: One-to-Many (Flexible)

```typescript
// personas table
const personas = [
  {
    id: 'pers-001',
    name: 'Sarah Thompson',
    tier: 'Gold',
    behavior: {
      initialMood: 'angry',
      patienceLevel: 'low',
      cooperationLevel: 'medium',
      escalationTriggers: ['long hold', 'no resolution'],
      deescalationTriggers: ['discounts', 'empathy']
    },
    systemPrompt: 'You are Sarah, a Gold tier customer...',
    voiceId: 'shimmer'
  }
];

// scenarios table
const scenarios = [
  {
    id: 'scen-001',
    title: 'Billing Dispute',
    category: 'Billing'
    // No persona data here!
  },
  {
    id: 'scen-002',
    title: 'Service Cancellation', 
    category: 'Retention'
  },
  {
    id: 'scen-003',
    title: 'Damaged Product Return',
    category: 'Returns'
  }
];

// persona_scenarios junction table
const personaScenarios = [
  // Sarah appears in ALL THREE scenarios!
  { personaId: 'pers-001', scenarioId: 'scen-001', contextOverride: { issue: 'Billing overcharge' } },
  { personaId: 'pers-001', scenarioId: 'scen-002', contextOverride: { issue: 'Switching to competitor' } },
  { personaId: 'pers-001', scenarioId: 'scen-003', contextOverride: { issue: 'Broken item received' } },
  
  // Other personas can share scenarios too
  { personaId: 'pers-002', scenarioId: 'scen-001', contextOverride: { issue: 'Unrecognized charge' } }
];

// Benefits:
// ✅ Sarah's config in ONE place
// ✅ Reused across 3 scenarios
// ✅ Context-specific overrides per scenario
// ✅ Another persona can use same scenario
```

---

## Real-World Example

### Training Program Structure

```
PERSONAS (AI Actors)
├── Sarah Thompson (Angry Gold)
│   ├── Behavior: Impatient, expects premium service
│   ├── Voice: Fast, assertive
│   └── Triggers: Long holds, transfers
│
├── Mike Johnson (Confused Bronze)
│   ├── Behavior: Patient but confused, needs guidance  
│   ├── Voice: Slow, uncertain
│   └── Triggers: Technical jargon, rushed explanations
│
├── Emily Chen (Suspicious Silver)
│   ├── Behavior: Cautious, asks many questions
│   ├── Voice: Measured, skeptical
│   └── Triggers: Vague answers, lack of verification
│
└── VIP Alex Sterling (Platinum)
    ├── Behavior: Demanding but polite
    ├── Voice: Polished, professional
    └── Triggers: Standard wait times, generic service

SIMULATIONS (Training Scenarios)
├── Billing Dispute
│   ├── Sarah ("I was overcharged $45!")
│   ├── Mike ("I don't understand this charge...")
│   └── Emily ("Is this charge legitimate?")
│
├── Technical Support
│   ├── Mike ("My internet isn't working...")
│   └── Sarah ("This is the 3rd time this month!")
│
├── Service Cancellation
│   ├── Sarah ("I'm switching to CompetitorX")
│   └── VIP Alex ("Your service doesn't meet our standards")
│
└── Product Return
│   ├── Sarah ("This arrived broken!")
│   └── Emily ("I need to verify the return policy first")
```

**Result:** 4 personas × 4 scenarios = 16 unique training combinations!

---

## Implementation Code Example

### Current (Hardcoded in Each Component)

```tsx
// ActiveSimulation.tsx - Current approach
const MOCK_CUSTOMER = {
  name: 'Sarah Thompson',
  tier: 'Gold',
  // ... duplicated in every scenario
};

const CustomerDataPanel = () => {
  return <div>{MOCK_CUSTOMER.name}</div>;  // Always same data
};
```

### Proposed (Dynamic from Store)

```tsx
// ActiveSimulation.tsx - Proposed approach
const { getPersonaForScenario } = usePersonaStore();

const CustomerDataPanel = ({ scenarioId, personaId }) => {
  // Get persona with scenario-specific context
  const persona = getPersonaForScenario(scenarioId, personaId);
  
  return (
    <div>
      <h3>{persona.name}</h3>
      <p>{persona.context.specificIssue}</p>  // "Billing overcharge" or "Switching to competitor"
    </div>
  );
};
```

---

## Database Migration Example

```sql
-- Step 1: Create personas from existing data
INSERT INTO personas (id, name, tier, behavior_profile, system_prompt)
SELECT 
  'pers-' || substr(hex(randomblob(4)), 1, 8),
  persona,
  CASE 
    WHEN persona LIKE '%VIP%' THEN 'Platinum'
    WHEN persona LIKE '%Gold%' OR persona LIKE '%Premium%' THEN 'Gold'
    ELSE 'Silver'
  END,
  json_object(
    'initialMood', 'angry',
    'patienceLevel', 'low',
    'cooperationLevel', 'medium'
  ),
  'You are ' || persona || ', a customer calling support...'
FROM scenarios
WHERE persona IS NOT NULL
GROUP BY persona;

-- Step 2: Link personas to scenarios
INSERT INTO persona_scenarios (persona_id, scenario_id, context_override)
SELECT 
  p.id,
  s.id,
  json_object('specificIssue', s.description)
FROM scenarios s
JOIN personas p ON p.name = s.persona;
```

---

## Quick Decision Guide

| If you want... | Use |
|----------------|-----|
| Same AI customer in multiple scenarios | ✅ One-to-Many |
| Different AI customers in same scenario | ✅ One-to-Many |
| Track persona performance across training | ✅ One-to-Mary |
| Template personas for quick creation | ✅ One-to-Many |
| Very simple, limited scenarios | One-to-One |
| Each scenario has unique customer | One-to-One |


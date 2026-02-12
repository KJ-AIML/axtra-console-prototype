# Database Architecture

Database design and schema for Turso (libsql).

---

## 🗄️ Database Overview

**Technology**: Turso (libsql) - Serverless SQLite
**Provider**: Turso (https://turso.tech)
**Location**: Edge-deployed (AWS Asia Pacific for this project)
**Connection**: HTTP-based with libsql client

---

## 📊 Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────▶│   sessions  │     │   accounts  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ email       │     │ user_id(FK) │     │ user_id(FK) │
│ password_   │     │ token       │     │ account_name│
│ name        │     │ expires_at  │     │ settings    │
│ initials    │     └─────────────┘     └─────────────┘
│ role        │
└──────┬──────┘
       │
       │         ┌─────────────┐     ┌─────────────┐
       │         │scenarios    │     │user_scenarios
       │         ├─────────────┤     ├─────────────┤
       │         │ id (PK)     │◀────│ id (PK)     │
       │         │ title       │     │ user_id(FK) │
       │         │ difficulty  │     │ scenario_id │
       │         │ duration    │     │ status      │
       │         │ type        │     │ score       │
       │         └─────────────┘     └─────────────┘
       │
       │         ┌─────────────┐
       │         │ call_sessions│
       │         ├─────────────┤
       └────────▶│ id (PK)     │
                 │ user_id(FK) │
                 │ scenario_id │
                 │ room_name   │
                 │ status      │
                 │ duration_sec│
                 └──────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│call_transcrip│ │ call_coaching│ │call_summaries│
├──────────────┤ ├──────────────┤ ├──────────────┤
│ id (PK)      │ │ id (PK)      │ │ id (PK)      │
│ call_id (FK) │ │ call_id (FK) │ │ call_id (FK) │
│ speaker      │ │ analysis_id  │ │ summary      │
│ text         │ │ card_*_title │ │ key_points   │
│ timestamp    │ │ card_*_detail│ │ strengths    │
└──────────────┘ │ script_*     │ │ improvements │
                 └──────────────┘ └──────────────┘
```

---

## 📋 Table Schemas

### users

User accounts and authentication data.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT UNIQUE NOT NULL,             -- Login email
  password_hash TEXT NOT NULL,            -- bcrypt hash
  name TEXT NOT NULL,                     -- Display name
  initials TEXT NOT NULL,                 -- For avatar
  role TEXT DEFAULT 'operator',           -- operator/admin
  avatar TEXT,                            -- Optional avatar URL
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
```

### sessions

Active authentication sessions.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,             -- JWT token
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### scenarios

Training scenarios/personas.

```sql
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL                -- Easy, Medium, Hard
    CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
  duration TEXT NOT NULL,                 -- e.g., "5-10 min"
  type TEXT NOT NULL,                     -- e.g., "billing"
  category TEXT,                          -- e.g., "Billing"
  persona TEXT DEFAULT 'Customer',        -- Character name
  rating REAL DEFAULT 4.5,
  completions INTEGER DEFAULT 0,
  is_recommended INTEGER DEFAULT 1,       -- Boolean (0/1)
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### user_scenarios

User progress on scenarios.

```sql
CREATE TABLE user_scenarios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started'       -- not_started, in_progress, completed
    CHECK(status IN ('not_started', 'in_progress', 'completed')),
  score INTEGER,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  UNIQUE(user_id, scenario_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_user_scenarios_user ON user_scenarios(user_id);
CREATE INDEX idx_user_scenarios_status ON user_scenarios(user_id, status);
```

### call_sessions

Voice call records.

```sql
CREATE TABLE call_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  room_name TEXT NOT NULL,                -- LiveKit room
  status TEXT DEFAULT 'in_progress'       -- in_progress, completed, abandoned
    CHECK(status IN ('in_progress', 'completed', 'abandoned')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  duration_seconds INTEGER DEFAULT 0,
  total_turns INTEGER DEFAULT 0,
  customer_sentiment TEXT DEFAULT 'neutral'
    CHECK(customer_sentiment IN ('angry', 'frustrated', 'neutral', 'satisfied', 'happy')),
  final_score INTEGER,
  -- Recording fields
  recording_status TEXT DEFAULT 'none'
    CHECK(recording_status IN ('none', 'recording', 'processing', 'completed', 'failed')),
  operator_track_url TEXT,
  agent_track_url TEXT,
  stereo_track_url TEXT,
  recording_started_at DATETIME,
  recording_ended_at DATETIME,
  operator_egress_id TEXT,
  agent_egress_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_call_sessions_user ON call_sessions(user_id);
CREATE INDEX idx_call_sessions_user_status ON call_sessions(user_id, status);
CREATE INDEX idx_call_sessions_user_ended ON call_sessions(user_id, ended_at DESC);
```

### call_transcripts

Conversation history.

```sql
CREATE TABLE call_transcripts (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  speaker TEXT NOT NULL                   -- customer, operator
    CHECK(speaker IN ('customer', 'operator')),
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_call_transcripts_call ON call_transcripts(call_id);
```

### call_coaching

AXTRA Copilot coaching history.

```sql
CREATE TABLE call_coaching (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  analysis_id INTEGER NOT NULL,
  -- Card 1 (Emotion)
  card_1_title TEXT,
  card_1_detail TEXT,
  card_1_action TEXT,
  card_1_status TEXT,
  -- Card 2 (Leverage)
  card_2_title TEXT,
  card_2_detail TEXT,
  card_2_action TEXT,
  card_2_status TEXT,
  -- Card 3 (Strategy)
  card_3_title TEXT,
  card_3_detail TEXT,
  card_3_action TEXT,
  card_3_status TEXT,
  -- Script
  script_summary TEXT,
  script_suggestion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_call_coaching_call ON call_coaching(call_id);
```

### call_summaries

Post-call AI summaries.

```sql
CREATE TABLE call_summaries (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT,                        -- JSON array
  strengths TEXT,                         -- JSON array
  improvements TEXT,                      -- JSON array
  customer_satisfaction INTEGER           -- 1-5 rating
    CHECK(customer_satisfaction BETWEEN 1 AND 5),
  resolution_status TEXT                  -- resolved, pending, escalated, unresolved
    CHECK(resolution_status IN ('resolved', 'pending', 'escalated', 'unresolved')),
  coaching_effectiveness INTEGER          -- 1-5 rating
    CHECK(coaching_effectiveness BETWEEN 1 AND 5),
  generated_by TEXT DEFAULT 'mock',       -- mock, ai
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
);
```

### qa_scores

QA scoring data.

```sql
CREATE TABLE qa_scores (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  scorer_id TEXT NOT NULL,
  scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  professionalism INTEGER CHECK(professionalism BETWEEN 1 AND 5),
  empathy INTEGER CHECK(empathy BETWEEN 1 AND 5),
  problem_solving INTEGER CHECK(problem_solving BETWEEN 1 AND 5),
  script_adherence INTEGER CHECK(script_adherence BETWEEN 1 AND 5),
  tone_manner INTEGER CHECK(tone_manner BETWEEN 1 AND 5),
  overall_score INTEGER CHECK(overall_score BETWEEN 0 AND 100),
  strengths TEXT,                         -- Free text
  improvements TEXT,                      -- Free text
  general_notes TEXT,
  status TEXT DEFAULT 'draft'             -- draft, submitted, approved
    CHECK(status IN ('draft', 'submitted', 'approved')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (scorer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(call_id, scorer_id)
);
```

---

## 🔄 Common Queries

### Get User Dashboard Data

```sql
-- Metrics
SELECT * FROM user_metrics WHERE user_id = ?;

-- Scenarios with progress
SELECT s.*, us.status, us.score
FROM scenarios s
LEFT JOIN user_scenarios us ON s.id = us.scenario_id AND us.user_id = ?
ORDER BY s.sort_order;

-- Recent calls
SELECT cs.*, s.title as scenario_title
FROM call_sessions cs
JOIN scenarios s ON cs.scenario_id = s.id
WHERE cs.user_id = ?
ORDER BY cs.started_at DESC
LIMIT 10;
```

### Get Call Details

```sql
-- Session
SELECT * FROM call_sessions WHERE id = ?;

-- Transcripts
SELECT * FROM call_transcripts 
WHERE call_id = ? 
ORDER BY sequence_order ASC;

-- Coaching
SELECT * FROM call_coaching 
WHERE call_id = ? 
ORDER BY analysis_id ASC;

-- Summary
SELECT * FROM call_summaries WHERE call_id = ?;
```

---

## 📈 Data Growth Estimates

| Table | Per User/Call | Growth Rate |
|-------|--------------|-------------|
| users | 1 row | Low |
| call_sessions | 1 per call | Medium |
| call_transcripts | ~10-50 per call | High |
| call_coaching | ~3-10 per call | Medium |
| call_summaries | 1 per call | Medium |

**Example:** 1000 calls/month
- ~1000 call_sessions
- ~20,000 call_transcripts
- ~5,000 call_coaching records

---

## 🔒 Security

- **Row-level security**: Not supported in SQLite
- **Application-level**: Filter all queries by user_id
- **Parameterized queries**: Always use `args` parameter
- **No sensitive data**: Don't store passwords in plain text

---

## 📚 Related

- [Backend Architecture](./backend.md)
- [API Reference](../06-reference/api-reference.md)

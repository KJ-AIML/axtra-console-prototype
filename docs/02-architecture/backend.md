# Backend Architecture

Overview of the Node.js HTTP API server architecture.

---

## 🏗️ Server Structure

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────┐
│        Node.js HTTP Server              │
│        (server/index.ts)                │
├─────────────────────────────────────────┤
│                                          │
│  1. CORS Handling                        │
│  2. Body Parsing                         │
│  3. Route Matching                       │
│  4. Auth Validation                      │
│  5. Service Handler                      │
│  6. Response                             │
│                                          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│          Services Layer                 │
├─────────────────────────────────────────┤
│  auth.ts         - Authentication       │
│  dashboard.ts    - Dashboard data       │
│  simulations.ts  - Training scenarios   │
│  livekit.ts      - Token generation     │
│  call-sessions.ts - Call management     │
│  recordings.ts   - Recording access     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         Database Layer                  │
│         (Turso/libsql)                  │
└─────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. Entry Point

```typescript
// server/index.ts
import { createServer } from 'http';

const server = createServer(async (req, res) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // 2. Parse body
  const body = await parseBody(req);
  
  // 3. Get auth token
  const token = getToken(req);
  
  // 4. Route handling
  await handleRequest(req, res, body, token);
});
```

### 2. Route Matching

```typescript
async function handleRequest(req, res, body, token) {
  const method = req.method;
  const segments = getPathSegments(req.url);
  
  // Pattern: GET /api/scenarios/:id
  if (method === 'GET' && 
      segments.length === 2 && 
      segments[0] === 'scenarios') {
    
    // Validate auth
    const user = await validateSession(token);
    if (!user) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
    
    // Call service
    const scenario = await getScenarioById(segments[1]);
    return sendJson(res, 200, { success: true, data: { scenario } });
  }
}
```

### 3. Authentication Flow

```
Request with Token
    │
    ▼
Extract Token from Header
    │ Authorization: Bearer <token>
    ▼
Validate Session
    │
    ├──▶ Check sessions table
    ├──▶ Verify expiry
    └──▶ Get user data
            │
            ▼
    Attach user to request context
            │
            ▼
    Continue to route handler
```

---

## 📡 API Design

### Response Format

All API responses follow this structure:

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": { // optional
    "page": 1,
    "total": 100
  }
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",  // optional
  "details": { ... }     // optional
}
```

### Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Usage
if (!user) {
  throw new ApiError(401, 'Invalid credentials', 'AUTH_INVALID');
}

// Handler
try {
  const result = await serviceHandler();
  sendJson(res, 200, { success: true, data: result });
} catch (error) {
  if (error instanceof ApiError) {
    sendJson(res, error.statusCode, { 
      success: false, 
      error: error.message,
      code: error.code 
    });
  } else {
    sendJson(res, 500, { 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
```

---

## 🗄️ Database Access Pattern

### Query Pattern

```typescript
// server/db.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Usage in services
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE email = ?',
  args: [email],
});

const user = result.rows[0];
```

### Transaction Pattern

```typescript
async function createCallSession(data: CreateCallSessionRequest) {
  const id = uuidv4();
  
  await db.execute({
    sql: `
      INSERT INTO call_sessions (
        id, user_id, scenario_id, room_name, status, started_at
      ) VALUES (?, ?, ?, ?, 'in_progress', datetime('now'))
    `,
    args: [id, data.user_id, data.scenario_id, data.room_name],
  });
  
  return { id, ...data };
}
```

---

## 🔐 Security

### Password Hashing

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Hash password
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
const verifyPassword = async (
  password: string, 
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

### JWT Token Generation

```typescript
import { v4 as uuidv4 } from 'uuid';

const generateToken = (): string => {
  return uuidv4();
};

// Session expiry (7 days)
const EXPIRY_DAYS = 7;

const createSession = async (userId: string) => {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);
  
  await db.execute({
    sql: `
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [uuidv4(), userId, token, expiresAt.toISOString()],
  });
  
  return token;
};
```

---

## 📊 Service Layer Examples

### Auth Service

```typescript
// server/auth.ts
export const loginUser = async (credentials: LoginRequest) => {
  // Find user
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [credentials.email],
  });
  
  const user = result.rows[0];
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }
  
  // Verify password
  const valid = await verifyPassword(
    credentials.password, 
    user.password_hash as string
  );
  
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }
  
  // Create session
  const token = await createSession(user.id as string);
  
  return {
    user: sanitizeUser(user),
    token,
    expiresIn: EXPIRY_DAYS * 24 * 60 * 60,
  };
};
```

### Dashboard Service

```typescript
// server/dashboard.ts
export const getDashboardData = async (userId: string) => {
  const [metrics, scenarios, skillVelocity, qaHighlights] = await Promise.all([
    getUserMetrics(userId),
    getUserScenarios(userId),
    getSkillVelocity(userId),
    getQaHighlights(userId),
  ]);
  
  return {
    metrics,
    scenarios,
    skillVelocity,
    qaHighlights,
  };
};
```

---

## 🚀 Performance Considerations

### Connection Pooling

Turso client handles connection pooling automatically.

### Caching Opportunities

```typescript
// Simple in-memory cache (for development)
const cache = new Map<string, { data: unknown; expiry: number }>();

const getCached = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + 60000 }); // 1 min cache
  return data;
};
```

### N+1 Query Prevention

```typescript
// Bad: N+1 queries
const users = await getUsers();
for (const user of users) {
  user.scenarios = await getUserScenarios(user.id); // N queries
}

// Good: Single query with JOIN
const result = await db.execute({
  sql: `
    SELECT u.*, s.* 
    FROM users u
    LEFT JOIN user_scenarios us ON u.id = us.user_id
    LEFT JOIN scenarios s ON us.scenario_id = s.id
  `,
});
```

---

## 📚 Related Documentation

- [Database Schema](./database.md)
- [API Reference](../06-reference/api-reference.md)
- [Troubleshooting](../06-reference/troubleshooting.md)

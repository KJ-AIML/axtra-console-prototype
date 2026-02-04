# Axtra Console - Authentication Server

This is the authentication backend for Axtra Console, using Turso (libsql) as the database.

## Database

- **Provider**: Turso (libsql)
- **URL**: `libsql://axdb-kjctsc.aws-ap-south-1.turso.io`
- **Token Required**: Set `TURSO_AUTH_TOKEN` in your `.env.local` file

## Getting a Turso Auth Token

1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Login to Turso:
   ```bash
   turso auth login
   ```

3. Create a token for your database:
   ```bash
   turso db tokens create axdb
   ```

4. Copy the token to your `.env.local` file:
   ```
   TURSO_AUTH_TOKEN=your_token_here
   ```

## Running the Server

### Development Mode (with Vite)

The API server starts automatically when you run the Vite dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Standalone Mode

Run the server independently:

```bash
npx tsx server/index.ts
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login existing user |
| POST | `/api/auth/logout` | Logout current user |
| GET | `/api/auth/me` | Get current user info |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | Get user's accounts |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API and database health |

## Default Seed User

When the database is first initialized, a seed user is created:

- **Email**: `admin@axtra.local`
- **Password**: `admin123`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Accounts Table
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT DEFAULT 'personal',
  settings TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

# Installation Guide

Complete step-by-step installation instructions for Axtra Console.

---

## 📦 System Requirements

### Minimum Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **OS**: Windows 10+, macOS 12+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB free space

### For Voice AI Features
- **Python**: 3.9+ (for AI agent)
- **uv**: Python package manager
- **Microphone**: Required for voice calls
- **Speakers/Headphones**: Required for hearing AI agent

---

## 🔄 Step-by-Step Installation

### Step 1: Install Node.js

**Windows:**
```powershell
# Download from https://nodejs.org/ (LTS version)
# Or use winget
winget install OpenJS.NodeJS
```

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v18+ or v20+
npm --version   # Should show 9+
```

---

### Step 2: Clone Repository

```bash
git clone <your-repo-url>
cd axtra-console-prototype
```

---

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- React 19 and related packages
- Vite build tool
- Tailwind CSS
- Testing libraries
- LiveKit SDK
- And more...

---

### Step 4: Database Setup (Turso)

#### 4.1 Create Turso Account
1. Go to https://turso.tech
2. Sign up with GitHub
3. Create a new database

#### 4.2 Get Authentication Token

**Option A: Using Turso CLI**
```bash
# Install CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create token
turso db tokens create <your-database-name>
```

**Option B: Via Web Dashboard**
1. Go to https://app.turso.tech
2. Select your database
3. Go to Settings → Tokens
4. Create new token

#### 4.3 Configure Database URL

Your database URL format:
```
libsql://<database-name>-<username>.turso.io
```

---

### Step 5: LiveKit Setup (Voice AI)

#### 5.1 Create LiveKit Account
1. Go to https://cloud.livekit.io
2. Sign up with GitHub or email
3. Create a new project

#### 5.2 Get API Credentials
1. In your project dashboard
2. Go to Settings → API Keys
3. Copy:
   - **API Key** (e.g., `APItmZGgjAJG5UC`)
   - **API Secret**
   - **WebSocket URL** (e.g., `wss://your-project.livekit.cloud`)

---

### Step 6: Environment Configuration

Create `.env.local` in project root:

```bash
# ============================================
# REQUIRED: Database Configuration
# ============================================
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token_here

# ============================================
# REQUIRED: API Configuration
# ============================================
VITE_API_BASE_URL=http://localhost:3001/api
API_PORT=3001

# ============================================
# REQUIRED: LiveKit (Voice AI)
# ============================================
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

# ============================================
# OPTIONAL: AI Agent (Python Call Summary)
# ============================================
AI_AGENT_URL=http://localhost:8001
AI_AGENT_TIMEOUT=30000

# ============================================
# OPTIONAL: R2 Storage (Call Recordings)
# ============================================
EGRESS_STORAGE_TYPE=s3
EGRESS_S3_BUCKET=your-bucket-name
EGRESS_S3_REGION=auto
EGRESS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
EGRESS_S3_ACCESS_KEY=your_access_key
EGRESS_S3_SECRET_KEY=your_secret_key
```

---

### Step 7: Python AI Agent Setup (Optional)

For voice AI features, you need the Python agent:

```bash
# Navigate to agent directory
cd server/agent/python-livekit

# Install uv (if not installed)
pip install uv

# Install dependencies
uv sync

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# Same LiveKit credentials as above
# Add GOOGLE_API_KEY for Gemini
```

**Get Google Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Add to `.env`:
```bash
GOOGLE_API_KEY=your_gemini_key
```

---

### Step 8: Start the Application

**Terminal 1 - Frontend + Backend:**
```bash
npm run dev
```

**Terminal 2 - Python Agent (optional, for voice AI):**
```bash
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev
```

---

## ✅ Verification

### Check Frontend
Open http://localhost:3000
- You should see the login page

### Check Backend
```bash
curl http://localhost:3001/api/health
```
Should return:
```json
{"status":"ok","database":"connected"}
```

### Check Database
Login with demo account:
- Email: `admin@axtra.local`
- Password: `admin123`

You should see the dashboard.

---

## 🔧 Post-Installation

### Create Demo Data
The app automatically seeds:
- 8 training scenarios
- Demo user account
- Sample dashboard data

### Run Tests
```bash
npm test -- --run
```

All 67 tests should pass.

---

## 🆘 Common Issues

### "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### "Database connection failed"
- Verify `TURSO_AUTH_TOKEN` is correct
- Check database URL format
- Ensure token hasn't expired

### "LiveKit not configured"
- Check all LiveKit environment variables
- Verify WebSocket URL starts with `wss://`

### "Python agent not found"
- Ensure you're in `server/agent/python-livekit`
- Run `uv sync` to install dependencies
- Check `.env` file exists with credentials

---

## 📚 Next Steps

- [Development Setup](./development-setup.md) - Configure your IDE
- [Architecture Overview](../02-architecture/index.md) - Understand the system
- [Voice AI Setup](../03-features/voice-ai/livekit-integration.md) - Complete voice setup

# Environment Variables

Complete reference for all environment variables.

---

## 🔧 Required Variables

### API Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Frontend API URL | `http://localhost:3001/api` |
| `API_PORT` | Backend server port | `3001` |

### Turso Database

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database URL | `libsql://axdb-kjctsc.aws-ap-south-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token | `your_token_here` |

### LiveKit

| Variable | Description | Example |
|----------|-------------|---------|
| `LIVEKIT_API_KEY` | LiveKit API key | `your_livekit_key` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `your_livekit_secret` |
| `LIVEKIT_URL` | LiveKit WebSocket URL | `wss://your-project.livekit.cloud` |

### Cloudflare R2 (Audio Storage)

| Variable | Description | Example |
|----------|-------------|---------|
| `EGRESS_S3_ENDPOINT` | R2 endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `EGRESS_S3_ACCESS_KEY` | R2 access key | `your_access_key` |
| `EGRESS_S3_SECRET_KEY` | R2 secret key | `your_secret_key` |
| `EGRESS_S3_BUCKET` | R2 bucket name | `axtra-recordings` |
| `EGRESS_S3_REGION` | R2 region | `auto` |

---

## 🐍 Python Agent Variables

Create these in `server/agent/python-livekit/.env`:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `LIVEKIT_URL` | LiveKit WebSocket URL | `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit API key | `your_livekit_key` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `your_livekit_secret` |
| `GOOGLE_API_KEY` | Google Gemini API key | `your_google_api_key` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG_MODE` | Enable verbose logging | `false` |
| `OPENAI_API_KEY` | Alternative LLM provider | - |
| `DEEPGRAM_API_KEY` | Alternative STT provider | - |

---

## 📄 Example Files

### Root .env.local

```bash
# API
VITE_API_BASE_URL=http://localhost:3001/api
API_PORT=3001

# Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# LiveKit
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# R2 Storage
EGRESS_S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
EGRESS_S3_ACCESS_KEY=your_key
EGRESS_S3_SECRET_KEY=your_secret
EGRESS_S3_BUCKET=axtra-recordings
EGRESS_S3_REGION=auto
```

### Python Agent .env

```bash
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret

# AI
GOOGLE_API_KEY=your_google_key

# Debug
DEBUG_MODE=true
```

---

## ⚠️ Security Notes

- Never commit `.env` or `.env.local` files
- Use different tokens for production/staging
- Rotate secrets regularly
- Restrict R2 bucket access

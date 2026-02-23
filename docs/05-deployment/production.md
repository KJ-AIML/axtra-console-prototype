# Production Deployment

Guide for deploying Axtra Console to production.

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass (`npm test -- --run`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] Environment variables configured

### Database

- [ ] Turso database accessible
- [ ] Auth token valid
- [ ] Tables migrated
- [ ] Indexes created

### External Services

- [ ] LiveKit project configured
- [ ] Cloudflare R2 bucket created
- [ ] Google API key valid

---

## 🚀 Deployment Steps

### 1. Environment Setup

Create production `.env.local`:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com/api
API_PORT=3001

# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_production_token

# LiveKit
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# R2 Storage
EGRESS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
EGRESS_S3_ACCESS_KEY=your_access_key
EGRESS_S3_SECRET_KEY=your_secret_key
EGRESS_S3_BUCKET=axtra-recordings
EGRESS_S3_REGION=auto

# Python Agent
GOOGLE_API_KEY=your_google_key
```

### 2. Build Frontend

```bash
npm run build
```

Output goes to `dist/` folder.

### 3. Start Services

**Node.js API:**
```bash
npm run server:prod
```

**Python Agent:**
```bash
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py start
```

---

## 🔒 Security

### Authentication

- Use HTTPS for all endpoints
- Set JWT expiry appropriately
- Store tokens securely (consider httpOnly cookies)

### Database

- Use separate auth tokens for prod/staging
- Enable Turso's row-level security if needed
- Regular backups

### CORS

```typescript
// Update CORS for production
cors: {
  origin: 'https://yourdomain.com',
  credentials: true,
}
```

---

## 📊 Monitoring

### Health Checks

Monitor these endpoints:
- `GET /api/health` - Server + DB status
- LiveKit connection status
- R2 bucket accessibility

### Logs

```bash
# Server logs
pm2 logs axtra-api

# Python agent logs
journalctl -u axtra-agent
```

---

## 🔄 Updates

### Zero-Downtime Updates

1. Deploy new build to staging
2. Run tests
3. Deploy to production
4. Verify health check
5. Monitor logs

### Rollback

```bash
# If issues detected, revert to previous build
git checkout previous-tag
npm run build
npm run server:prod
```

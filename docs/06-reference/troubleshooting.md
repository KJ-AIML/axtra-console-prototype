# Troubleshooting Guide

Common issues and solutions for Axtra Console development.

---

## 🚀 Server Issues

### "Route not found"

**Cause:** Path segment mismatch in server handler

**Solution:**
- Check URL matches exactly
- Verify `pathSegments` in server/index.ts
- Use console.log to debug route matching

### "Database error"

**Cause:** Invalid credentials or connection

**Solution:**
```bash
# Verify .env.local
TURSO_DATABASE_URL=libsql://axdb-kjctsc.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=your_token_here
```

### "Module not found"

**Solution:**
```bash
npm install
```

---

## 🎤 Voice AI Issues

### No voice response

**Checklist:**
- [ ] LiveKit room connected
- [ ] Microphone permission granted
- [ ] Audio not muted in browser
- [ ] Agent service running

**Debug:**
```bash
# Check LiveKit connection
curl http://localhost:3001/api/livekit/token -X POST \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check Python agent logs
cd server/agent/python-livekit
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

### Agent not joining

**Cause:** Python agent service not running

**Solution:**
```bash
cd server/agent/python-livekit
uv run python livekit_agent_langchain.py dev
```

### No transcription showing

**Cause:** STT not enabled or agent not responding

**Debug:**
- Check `[MainAgent]` logs for transcription events
- Verify `GOOGLE_API_KEY` is set
- Check LiveKit room participants

### No voice from Python agent

**Cause:** TTS not configured properly

**Solution:**
```bash
# Check .env in python-livekit/
GOOGLE_API_KEY=your_key
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Coaching cards not appearing

**Debug steps:**
1. Enable `DEBUG_MODE=true`
2. Check for `[MainAgent] Analysis triggered`
3. Check for `[Supervisor] ✅ Data published`
4. Check browser console for `🎯 AXTRA Copilot Update received`

### Analysis not triggering

**Cause:** Turn tracking incomplete

**Check:** Both Customer AND Agent turns are tracked (verify `conversation_item_added` handler)

### Empty coaching cards

**Cause:** LangGraph workflow output issue

**Check:** Cards should have `title`, `detail`, `action`, `status` fields

---

## 🧪 Test Issues

### Tests failing

**Solution:**
```bash
# Check mock setup
npm test -- --run

# Debug specific test
npm test -- Button.test.tsx
```

### "act()" warnings

**Solution:** Wrap state changes in `act()`:
```typescript
import { act } from '@testing-library/react';

await act(async () => {
  await user.click(button);
});
```

---

## 📦 Build Issues

### Build errors

**Solution:**
```bash
# Ensure Node.js version supports native fetch
node --version  # v18+

# Clear cache
rm -rf node_modules
npm install
npm run build
```

### Type errors

**Solution:**
```bash
# Check TypeScript
npx tsc --noEmit

# Fix any types
// ❌ Bad
const data: any = fetchData();

// ✅ Good
const data: ApiResponse = fetchData();
```

---

## 🔧 Debug Mode

### Frontend Debug

```typescript
// Add to component
console.log('State:', state);
console.log('Props:', props);
```

### Python Agent Debug

```bash
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

This enables:
- Trigger calculations (turns, chars, time)
- Workflow input/output
- Conversation buffer state
- Data channel publishing

---

## 📞 Getting Help

1. Check logs in browser console
2. Check Python agent stdout
3. Check server logs
4. Enable DEBUG_MODE
5. Review [Documentation](../README.md)

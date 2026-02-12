# Call Recording

Dual-track audio recording system using LiveKit Egress and Cloudflare R2 storage.

---

## 🎯 Overview

The Call Recording system captures both operator and agent audio during voice calls, stores them in Cloudflare R2, and provides playback with channel selection.

### Features

- **Dual-Track Recording** - Separate tracks for operator and agent
- **Cloud Storage** - Cloudflare R2 for scalable storage
- **Auto Start/Stop** - Recording starts when call begins, stops when ends
- **Audio Playback** - In-browser player with channel selection (Both/You/Customer)
- **Secure Access** - Proxied through backend to protect R2 credentials

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Call Recording Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    Start Call     ┌─────────────────┐                   │
│  │   Operator  │──────────────────▶│  LiveKit Room   │                   │
│  │  (Browser)  │                   │                 │                   │
│  └──────┬──────┘                   └────────┬────────┘                   │
│         │                                   │                            │
│         │  WebRTC                           │  Egress (Recording)        │
│         │                                   │                            │
│         │                                   ▼                            │
│         │                          ┌─────────────────┐                   │
│         │                          │ LiveKit Egress  │                   │
│         │                          │   (SFU)         │                   │
│         │                          └────────┬────────┘                   │
│         │                                   │                            │
│         │                                   │ WebSocket (RTMP/WS)        │
│         │                                   ▼                            │
│         │                          ┌─────────────────┐                   │
│         │                          │  Egress Service │                   │
│         │                          │   (Node.js)     │                   │
│         │                          └────────┬────────┘                   │
│         │                                   │                            │
│         │                                   │ Upload                     │
│         │                                   ▼                            │
│         │                          ┌─────────────────┐                   │
│         │                          │  Cloudflare R2  │                   │
│         │                          │   (Storage)     │                   │
│         │                          └─────────────────┘                   │
│         │                                                                │
│         │ Playback (Proxy)                                               │
│         │◄───────────────────────────────────────────────────────────────┤
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Recording Lifecycle

### 1. Auto-Start Recording

When a call starts (`startCallAndRecording`):

```typescript
// useLiveKitStore.ts
async startCallAndRecording(scenarioId: string) {
  // 1. Create call session
  const session = await createCallSession(...);
  
  // 2. Connect to LiveKit room
  await room.connect(...);
  
  // 3. Start recording via Egress
  const recording = await startCallRecording(session.id, room.name);
  
  // 4. Save recording info to state
  set({ recording: { egressId, operatorTrackId, agentTrackId } });
}
```

### 2. Recording in Progress

LiveKit Egress captures audio via WebSocket:
- **Operator Track** - `participant_[id]_audio_track`
- **Agent Track** - `participant_agent_audio_track`
- **Format** - OGG Opus (compressed audio)

### 3. Auto-Stop Recording

When call ends (`endCallAndSave`):

```typescript
async endCallAndSave() {
  // 1. Stop recording
  await stopCallRecording(callId);
  
  // 2. Stop Egress
  await egressService.stopEgress(recording.egressId);
  
  // 3. Complete call session
  await completeCallSession(...);
}
```

### 4. Storage

Files stored in Cloudflare R2:

```
recordings/
├── {call-id}/
│   ├── operator-{timestamp}.ogg
│   └── agent-{timestamp}.ogg
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# R2 Storage Configuration
EGRESS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
EGRESS_S3_ACCESS_KEY=your_access_key
EGRESS_S3_SECRET_KEY=your_secret_key
EGRESS_S3_BUCKET=axtra-recordings
EGRESS_S3_REGION=auto

# Optional: Custom R2 Public URL
# If not set, uses presigned URLs
# EGRESS_S3_PUBLIC_URL=https://cdn.yourdomain.com
```

### LiveKit Egress Setup

Ensure your LiveKit project has Egress enabled:

```bash
# Install LiveKit CLI
npm install -g @livekit/cli

# Check egress templates
lk egress list-templates
```

---

## 📡 API Endpoints

### Start Recording

```http
POST /api/calls/:callId/recording/start
Authorization: Bearer {token}
```

**Response:**
```json
{
  "egress_id": "EG_abc123",
  "status": "starting",
  "operator_track_id": "TR_op_xyz",
  "agent_track_id": "TR_ag_xyz"
}
```

### Stop Recording

```http
POST /api/calls/:callId/recording/stop
Authorization: Bearer {token}
```

### Get Audio File

```http
GET /api/recordings/:callId/audio?channel=operator|agent|both
Authorization: Bearer {token}
```

**Channels:**
- `operator` - Operator audio only
- `agent` - Agent (customer) audio only
- `both` - Mixed stereo (if available) or operator track

**Response:** Audio file (OGG format)

---

## 🎵 Audio Playback

### RecordingDetail Page

The audio player supports:
- **Play/Pause** controls
- **Seek** - Jump to timestamp
- **Speed control** - 0.5x, 1x, 1.5x, 2x
- **Channel selection** - Both/You/Customer
- **Volume** control

### Channel Selection

```typescript
// RecordingDetail.tsx
const [audioChannel, setAudioChannel] = useState<'operator' | 'agent' | 'both'>('both');

// When 'both' selected, loads and synchronizes two audio elements
// When 'operator' or 'agent', loads single track
```

### Sync Playback (Both Channels)

When playing both tracks:

```typescript
// togglePlay() - Plays both tracks simultaneously
await Promise.all([
  audioRef.current.play(),      // Operator
  agentAudioRef.current.play()  // Agent
]);

// handleSeek() - Seeks both tracks together
agentAudioRef.current.currentTime = audioRef.current.currentTime;
```

---

## 🗄️ Database Schema

### call_sessions Table

```sql
ALTER TABLE call_sessions ADD COLUMN (
  recording_egress_id TEXT,
  recording_started_at TEXT,
  recording_ended_at TEXT,
  recording_operator_track_url TEXT,
  recording_agent_track_url TEXT,
  recording_status TEXT DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'starting', 'recording', 'completed', 'failed'))
);
```

---

## 🧹 Cleanup Tools

Several scripts are available for managing R2 storage:

### List Recordings

```bash
# Check database recordings
npm run db:recordings

# Check R2 storage
npm run r2:check
```

### Cleanup Scripts

```bash
# Delete all recordings (USE WITH CAUTION)
npm run r2:cleanup

# Delete specific recording
npm run r2:delete -- --call-id=xxx

# Using AWS SDK (more reliable)
npm run r2:cleanup:aws
```

---

## 🐛 Troubleshooting

### Recording Not Starting

```bash
# Check LiveKit Egress is enabled
curl https://your-project.livekit.cloud/

# Check server logs for [Egress] messages
```

### Audio Not Playing

1. **Check R2 URLs are accessible**
   ```bash
   curl -I "https://your-r2-url/recordings/..."
   ```

2. **Check CORS headers** on R2 bucket

3. **Verify audio format** - Should be OGG Opus

### Recording Status Stuck

```bash
# Check recording status via API
GET /api/calls/:callId/recording/status
```

---

## 📚 Related

- [AI Call Summary](./ai-call-summary.md)
- [QA Scoring](./qa-scoring.md)
- [LiveKit Integration](./livekit-integration.md)

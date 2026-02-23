# Call Recording

Dual-track audio recording system using LiveKit Egress and Cloudflare R2 storage with synchronized playback.

---

## 🎯 Overview

The Call Recording system captures both operator and agent audio during voice calls, stores them in Cloudflare R2, and provides synchronized playback with channel selection.

### Features

- **Dual-Track Recording** - Separate tracks for operator and agent
- **Cloud Storage** - Cloudflare R2 for scalable storage
- **Auto Start/Stop** - Recording starts when call begins, stops when ends
- **Audio Playback** - In-browser player with channel selection (Both/You/Customer)
- **Synchronized Playback** - Both tracks play in sync when "Both" selected
- **CORS Support** - Proper headers for cross-origin audio streaming
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
│         │ Playback (Proxy with CORS)                                     │
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

### 3. File Storage Format

Files stored in Cloudflare R2 (without timestamp in filename):

```
recordings/
├── {call-id}/
│   ├── operator.ogg      # Operator audio
│   └── agent.ogg         # Agent (customer) audio
```

> **Note:** LiveKit adds its own timestamp to the file, so we don't include one in the path.

### 4. Auto-Stop Recording

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

# R2 Public URL (for direct access)
EGRESS_S3_PUBLIC_URL=https://pub-xxx.r2.dev

# Optional: Custom R2 Public URL
# If not set, uses presigned URLs
```

### R2 CORS Configuration

For audio playback to work, configure CORS on your R2 bucket:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
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
- `both` - Returns operator track (both loaded separately in UI)

**Response:** Audio file (OGG format) with CORS headers:
```
Content-Type: audio/ogg
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

### URL Variations Fallback

The audio endpoint tries multiple URL patterns for compatibility:

```typescript
const urlVariations = [
  `${R2_PUBLIC_URL}/${trackUrl}`,
  `${R2_PUBLIC_URL}/${trackUrl}.ogg`,
  `${R2_PUBLIC_URL}/${trackUrl.slice(0, -4)}`  // Without .ogg
];
```

---

## 🎵 Audio Playback

### RecordingDetail Page

The audio player supports:
- **Play/Pause** controls
- **Seek** - Jump to timestamp
- **Speed control** - 0.5x, 1x, 1.5x, 2x
- **Channel selection** - Both/You/Customer
- **Volume** control
- **Synchronized playback** - Both tracks stay in sync

### Channel Selection

```typescript
// RecordingDetail.tsx / QAReviewDetail.tsx
const [audioChannel, setAudioChannel] = useState<'operator' | 'agent' | 'both'>('both');

// When 'both' selected, loads and synchronizes two audio elements
// When 'operator' or 'agent', loads single track
```

### Dual Audio Implementation

```typescript
// State management
const [audioUrl, setAudioUrl] = useState<string | null>(null);        // Operator
const [agentAudioUrl, setAgentAudioUrl] = useState<string | null>(null); // Agent
const audioRef = useRef<HTMLAudioElement>(null);
const agentAudioRef = useRef<HTMLAudioElement>(null);
```

### Synchronized Playback

When playing both tracks:

```typescript
const togglePlay = async () => {
  if (isPlaying) {
    audioRef.current?.pause();
    agentAudioRef.current?.pause();
    setIsPlaying(false);
  } else {
    // Play both tracks simultaneously
    const playPromises = [];
    if (audioRef.current) {
      playPromises.push(audioRef.current.play());
    }
    if (agentAudioRef.current && audioChannel === 'both') {
      playPromises.push(agentAudioRef.current.play());
    }
    await Promise.all(playPromises);
    setIsPlaying(true);
  }
};

// Keep tracks synchronized on seek
const handleSeek = (time: number) => {
  if (audioRef.current) {
    audioRef.current.currentTime = time;
  }
  if (agentAudioRef.current && audioChannel === 'both') {
    agentAudioRef.current.currentTime = time;
  }
};
```

### Auto-Play Agent Track

If user clicks play before agent track loads:

```typescript
const shouldPlayAgentRef = useRef(false);

// When user clicks play
shouldPlayAgentRef.current = true;

// When agent track loads
useEffect(() => {
  if (agentAudioUrl && shouldPlayAgentRef.current) {
    agentAudioRef.current?.play();
    shouldPlayAgentRef.current = false;
  }
}, [agentAudioUrl]);
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

## 🛠️ Audio Playback Fixes

### R2 URL Mismatch Fix

**Problem:** LiveKit adds timestamps to filenames, causing URL mismatches.

**Solution:** Store path without timestamp, construct URLs consistently:

```typescript
// egress-service.ts
function getFilePath(filepath: string): string {
  return `${filepath}.ogg`;  // Removed timestamp - LiveKit adds its own
}
```

### CORS Headers

Added CORS headers to audio streaming response:

```typescript
// server/index.ts
const headers: Record<string, string> = {
  'Content-Type': 'audio/ogg',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### URL Variations Fallback

Multiple URL patterns for compatibility:

```typescript
const urlVariations = [
  `https://pub-xxx.r2.dev/${trackUrl}`,
  !trackUrl.endsWith('.ogg') ? `https://pub-xxx.r2.dev/${trackUrl}.ogg` : null,
  trackUrl.endsWith('.ogg') ? `https://pub-xxx.r2.dev/${trackUrl.slice(0, -4)}` : null,
].filter(Boolean);
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

4. **Check browser console** for CORS errors

### Recording Status Stuck

```bash
# Check recording status via API
GET /api/calls/:callId/recording/status
```

### Dual Audio Out of Sync

- Both tracks use the same `currentTime` reference
- Seek operations update both tracks simultaneously
- Auto-play agent track when it finishes loading

---

## 📚 Related

- [AI Call Summary](./ai-call-summary.md)
- [QA Scoring](./qa-scoring.md)
- [LiveKit Integration](./livekit-integration.md)

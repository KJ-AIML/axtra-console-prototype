# API Reference

Complete reference for all API endpoints.

---

## 🔐 Authentication

### POST /api/auth/login

Login and receive JWT token.

**Request:**
```json
{
  "email": "admin@axtra.local",
  "password": "admin123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@axtra.local",
    "name": "Admin User",
    "role": "admin"
  },
  "token": "jwt-token"
}
```

### POST /api/auth/logout

Logout and invalidate session.

### GET /api/auth/me

Get current user information.

---

## 📊 Dashboard

### GET /api/dashboard

Get complete dashboard data.

**Response:**
```json
{
  "metrics": { "completedScenarios": 5, ... },
  "scenarios": [...],
  "skillVelocity": [...],
  "qaHighlights": [...]
}
```

### GET /api/dashboard/metrics

Get KPI metrics only.

### GET /api/dashboard/scenarios

Get user scenarios progress.

---

## 🎓 Simulations

### GET /api/scenarios

List all scenarios with progress.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Billing Dispute",
    "description": "...",
    "difficulty": "hard",
    "progress": "completed"
  }
]
```

### GET /api/scenarios/:id

Get single scenario details.

### POST /api/scenarios/:id/start

Start a simulation.

### POST /api/scenarios/:id/complete

Complete simulation with score.

**Request:**
```json
{
  "score": 85,
  "feedback": "Great job!"
}
```

---

## 🎙️ LiveKit

### POST /api/livekit/token

Generate LiveKit token for voice call.

**Request:**
```json
{
  "roomName": "room-uuid",
  "participantName": "User Name"
}
```

**Response:**
```json
{
  "token": "livekit-jwt-token",
  "url": "wss://your-project.livekit.cloud"
}
```

---

## 📹 Recordings

### GET /api/recordings

List all recordings.

### GET /api/recordings/:id

Get recording details.

### GET /api/recordings/:id/audio?channel=operator|agent

Get audio file for recording.

---

## 📞 Calls

### POST /api/calls

Create new call session.

### POST /api/calls/complete

Complete call and generate summary.

### GET /api/calls/:id

Get call details with transcripts and coaching.

### GET /api/calls/history

Get user's call history.

---

## ⚙️ Demo

### POST /api/demo/reset-my-data

Reset current user's data.

### GET /api/health

Health check with database status.

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

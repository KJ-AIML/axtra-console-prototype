# Version Information

Current version and release details for Axtra Console.

---

## Current Version

**Version:** `0.5.0`

**Release Date:** 2026-02-17

**Codename:** "Persona Sync"

---

## Version History

| Version | Date | Codename | Key Features |
|---------|------|----------|--------------|
| 0.5.0 | 2026-02-17 | Persona Sync | Database-driven call history synchronization |
| 0.4.0 | 2026-02-13 | QA Flex | Flexible QA scoring, dual audio, Thai language |
| 0.3.0 | 2026-02-10 | AI Summary | AI call summary, stereo recording, human QA |
| 0.2.0 | 2026-02-05 | Copilot | AXTRA Copilot, LiveKit integration, recording |
| 0.1.0 | 2026-02-01 | Genesis | Initial release, dashboard, simulations |

---

## System Requirements

### Current Version (0.5.0)

**Frontend:**
- Node.js >= 18.0.0
- React 19.2.4
- Vite 6.2.0
- Tailwind CSS v4.1.18

**Backend:**
- Node.js >= 18.0.0 (native fetch support)
- Turso Database (libsql)
- LiveKit Cloud account (for voice features)

**Python Agent (AXTRA Copilot):**
- Python 3.13+
- uv package manager
- LiveKit Agents 1.2.0
- Google Gemini API key

---

## Database Compatibility

| Version | Database Schema | Migration Required |
|---------|-----------------|-------------------|
| 0.5.0 | v5 | Auto-migration on startup |
| 0.4.0 | v4 | Manual for some features |
| 0.3.0 | v3 | Auto-migration |
| 0.2.0 | v2 | Auto-migration |
| 0.1.0 | v1 | N/A |

### Schema Versions

**v5 (Current)**
- Added `persona_call_history` table
- Migration: Automatic on server startup

**v4**
- Added `human_qa_reviews`, `human_qa_criteria_scores`, `human_qa_comments` tables
- Added flexible QA criteria configuration

**v3**
- Added `call_coaching` and `call_summaries` tables
- Added stereo recording track URLs

**v2**
- Added `call_sessions` and `call_transcripts` tables
- Added `recording_status` to call_sessions

**v1**
- Initial schema with `users`, `sessions`, `scenarios`, `user_scenarios`

---

## API Compatibility

### REST API Version: v1

Base URL: `/api`

**Stable Endpoints:**
- `/auth/*` - Authentication
- `/dashboard` - Dashboard data
- `/scenarios/*` - Training scenarios
- `/simulations/*` - Simulation sessions
- `/livekit/*` - LiveKit tokens
- `/calls/*` - Call sessions and summaries
- `/personas/*` - Persona management (NEW in 0.5.0)
- `/qa/*` - QA scoring and reviews

**Breaking Changes:**
None in 0.5.0 - all changes are backward compatible.

---

## Feature Flags

Current features and their status:

| Feature | Status | Since Version | Notes |
|---------|--------|---------------|-------|
| Persona Call History | ✅ Stable | 0.5.0 | Synchronized across all views |
| Flexible QA Scoring | ✅ Stable | 0.4.0 | Scale/Binary types supported |
| Dual Audio Playback | ✅ Stable | 0.4.0 | Synchronized tracks |
| Thai Language Support | ✅ Stable | 0.4.0 | Agent + Coaching |
| AXTRA Copilot | ✅ Stable | 0.2.0 | Real-time coaching |
| Call Recording | ✅ Stable | 0.2.0 | Dual-track + stereo |
| AI Call Summary | ✅ Stable | 0.3.0 | Dual analysis |
| Human QA Review | ✅ Stable | 0.3.0 | AI vs Human comparison |

---

## Deprecation Notice

No deprecations in version 0.5.0.

---

## Upcoming (0.6.0)

Planned for late February 2026:

- **Persona Analytics Dashboard** - Call history trends and insights
- **Advanced Persona Builder** - AI-generated profiles from descriptions
- **CRM Integrations** - Import real customer data as personas

---

## Support Policy

| Version | Support Status | End of Support |
|---------|---------------|----------------|
| 0.5.x | ✅ Active | TBD |
| 0.4.x | ⚠️ Maintenance | 2026-03-01 |
| 0.3.x | ❌ End of Life | 2026-02-15 |
| < 0.3.0 | ❌ End of Life | 2026-02-01 |

---

## Checking Your Version

### Via UI
Check the footer of the application for the version number.

### Via API
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "0.5.0",
  "database": "connected"
}
```

### Via Package
```bash
npm list axtra-console
```

---

## Release Checklist

When upgrading to a new version:

1. **Backup Database** - Always backup before major upgrades
2. **Check Changelog** - Review breaking changes
3. **Update Dependencies** - `npm install`
4. **Run Migrations** - Restart server for auto-migrations
5. **Test Features** - Verify critical paths
6. **Update Documentation** - Check for new environment variables

---

## Contact

For version-specific issues:
- Check [Troubleshooting](./troubleshooting.md)
- Review [Changelog](./CHANGELOG.md)
- Check [Feature Updates](../03-features/FEATURE_UPDATES.md)


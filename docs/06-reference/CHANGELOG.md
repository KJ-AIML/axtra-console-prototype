# Changelog

All notable changes to the Axtra Console project.

---

## [0.5.0] - 2026-02-17

### Added

#### Persona Call History Synchronization
- **Database Schema**
  - Created `persona_call_history` table with migration support
  - Added `seedCallHistory()` function with deterministic seed data
  - 12 call history records across 8 default personas

- **API Endpoints**
  - `GET /api/personas/:id` - Returns persona with scenarios and call history
  - `GET /api/scenarios/:id/primary-persona` - Returns persona with call history for simulation
  - `getCallHistoryForPersona()` - Fetch call history for any persona
  - `addCallHistoryEntry()` - Add new call history records

- **Frontend Integration**
  - `PersonaDetailView` component displays recent call history
  - `CustomerDataPanel` History tab shows synchronized data
  - Loading states and empty states for better UX

### Changed

- **Personas Page** (`/personas`)
  - Clicking a persona now fetches full details including call history
  - Shows up to 3 most recent calls with type, date, duration, and outcome

- **ActiveSimulation Page** (`/simulation/:id`)
  - Customer Data Panel History tab now shows real data from database
  - Same call history as Personas page for consistent experience

- **Store Updates**
  - `usePersonaStore.fetchPersonaById()` - Fetches complete persona with call history
  - `usePersonaStore.fetchPrimaryPersonaForScenario()` - Returns persona with call history

### Fixed

- Fixed `TypeError: Cannot read properties of undefined (reading 'slice')` when call history was undefined
- Fixed "No call history available" showing on ActiveSimulation page when data existed
- Fixed database migration not creating `persona_call_history` table on existing installations

### Technical Details

**Database Migration Logic**
```typescript
// InitializePersonaTables now handles partial migrations
if (!callHistoryTableExists) {
  await createCallHistoryTable();
  await seedCallHistory();
}
```

**API Response Format**
```typescript
{
  persona: {
    id: string,
    name: string,
    // ... other fields
    callHistory: [
      {
        id: string,
        date: "2024-01-28",
        duration: "12m 45s",
        type: "Billing Inquiry",
        outcome: "Resolved",
        sentiment: "neutral",
        summary: "Customer questioned charges..."
      }
    ]
  }
}
```

---

## [0.4.0] - 2026-02-13

### Added

#### QA Scoring System Enhancement
- Flexible scoring types (Scale 1-N, Binary Yes/No)
- Configurable `max_score`, `weight`, and `is_required` flags
- `qa_criteria` table for dynamic criteria configuration
- `human_qa` table with JSON `criteria_scores`
- `/qa-reviewed` page for completed QA reviews

#### Dual Audio Playback
- Channel selector: 'You' (Operator) | 'Customer' (Agent) | 'Both'
- Synchronized playback in "Both" mode
- Auto-play agent track if user clicks before it loads

#### Thai Language Support
- Agent responds in Thai (ภาษาไทย)
- Coaching cards and summaries detect conversation language
- Thai instruction in agent prompts

### Fixed
- R2 URL mismatch (removed duplicate timestamp)
- CORS headers for audio streaming
- URL variations fallback for compatibility

---

## [0.3.0] - 2026-02-10

### Added
- AI Call Summary with dual analysis (Customer + Agent perspectives)
- Stereo recording with combined and separate tracks
- Human QA Review system

---

## [0.2.0] - 2026-02-05

### Added
- AXTRA Copilot real-time coaching with 3-card system
- LiveKit voice agent integration
- Call recording with egress service

---

## [0.1.0] - 2026-02-01

### Added
- Initial Axtra Console release
- Dashboard with KPIs and skill velocity
- Training simulations with scenarios
- Basic QA scoring system

---

## Version Format

Versions follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0) - Breaking changes
- **MINOR** (0.X.0) - New features (backward compatible)
- **PATCH** (0.0.X) - Bug fixes

---

## Migration Guide

### From 0.4.x to 0.5.0

The `persona_call_history` table will be automatically created on server restart.

1. **Restart the server:**
   ```bash
   npm run dev
   ```

2. **Verify migration:**
   Check logs for:
   ```
   🔄 Creating persona_call_history table...
   ✅ Call history table created
   🌱 Seeding call history...
   ✅ Seeded 12 call history records
   ```

3. **Test the feature:**
   - Navigate to `/personas`
   - Click on a persona (e.g., "Sarah Thompson")
   - Verify call history appears in the detail view
   - Navigate to a simulation
   - Verify the same call history appears in Customer Data Panel

---

## Unreleased

Features in development:

- [ ] Advanced persona builder with AI-generated profiles
- [ ] Call history analytics and trends
- [ ] Integration with external CRM systems
- [ ] Multi-language support expansion


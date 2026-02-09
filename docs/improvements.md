# AXTRA Console - Improvement Analysis

*Analysis Date: 2026-02-09*  
*Focus: Database Sync, UX Polish, Small Features*

---

## 📊 Current State Summary

### ✅ What's Working Well
- Full authentication & session management
- Voice calls with LiveKit + Gemini Realtime
- Real-time AXTRA Copilot coaching (3 cards)
- Post-call summary with data persistence
- Dashboard with KPIs, recent calls, stats
- Database properly structured (11 tables)

### ⚠️ Areas Needing Improvement

---

## 🎯 Priority 1: Database Sync Improvements

### 1.1 Missing Real-Time Data Refresh

**Problem:** Dashboard doesn't auto-refresh after completing a call

**Current Flow:**
1. User completes call
2. Data saved to database
3. User returns to dashboard
4. **Old data still shown** (need manual refresh)

**Solution:**
```typescript
// In Dashboard.tsx - Add polling or refresh on mount
useEffect(() => {
  // Refresh when component becomes visible
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchDashboardData();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Effort:** 15 minutes  
**Impact:** High - Users see fresh data immediately

---

### 1.2 Empty States Need Better Guidance

**Problem:** Many pages show "No data" without explaining what to do

**Pages Affected:**
- Dashboard (before first call)
- Recent Calls widget
- QA Highlights

**Solution:** Add actionable empty states
```typescript
// Example for Recent Calls
{recentCalls.length === 0 && (
  <div className="text-center py-8">
    <Phone size={48} className="mx-auto text-gray-300 mb-4" />
    <h4 className="font-semibold text-gray-700 mb-2">No practice calls yet</h4>
    <p className="text-sm text-gray-500 mb-4">Start your first simulation to see your progress</p>
    <button 
      onClick={() => navigate('/simulations')}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
    >
      Start Training
    </button>
  </div>
)}
```

**Effort:** 30 minutes per page  
**Impact:** Medium - Better user onboarding

---

### 1.3 Call Session Status Tracking

**Problem:** No way to see "in-progress" calls or recover abandoned ones

**Current:** Call sessions table has `status` field but not used in UI

**Solution:** 
1. Add "Continue Practice" button on dashboard if `status = 'in_progress'`
2. Show warning if user tries to start new call while one is active
3. Auto-abandon old calls after timeout (e.g., 2 hours)

```typescript
// In server/call-sessions.ts - Add cleanup job
export async function abandonStaleCalls(maxAgeMinutes: number = 120): Promise<void> {
  await db.execute({
    sql: `
      UPDATE call_sessions 
      SET status = 'abandoned', ended_at = datetime('now')
      WHERE status = 'in_progress' 
      AND datetime(started_at, '+${maxAgeMinutes} minutes') < datetime('now')
    `
  });
}
```

**Effort:** 1 hour  
**Impact:** Medium - Prevents data inconsistency

---

## 🎨 Priority 2: UX Polish

### 2.1 Loading States Inconsistency

**Problem:** Mix of skeleton loaders and spinners

**Current State:**
- Dashboard: Full skeleton ✓
- ActiveSimulation: Spinner only
- Simulations: No loading state

**Solution:** Standardize loading patterns
```typescript
// Create reusable components
<SkeletonCard />        // For cards
<SkeletonList rows={4} /> // For lists
<SpinnerOverlay />      // For full-page loads
```

**Effort:** 1 hour  
**Impact:** Low-Medium - Visual consistency

---

### 2.2 Better Error Handling

**Problem:** Generic error messages don't help users

**Current:** `showError('Failed to load', 'Please try again')`

**Better:** Context-aware errors with retry
```typescript
// In stores
fetchDashboardData: async () => {
  try {
    // ... fetch
  } catch (error) {
    const isNetworkError = error.message.includes('fetch');
    const message = isNetworkError 
      ? 'Network connection lost. Check your internet and try again.'
      : 'Server error. Our team has been notified.';
    
    set({ 
      error: message,
      showRetryButton: true 
    });
  }
}

// In component
{error && (
  <ErrorState 
    message={error} 
    onRetry={fetchDashboardData}
    onDismiss={clearError}
  />
)}
```

**Effort:** 1 hour  
**Impact:** Medium - Better error recovery

---

### 2.3 Navigation State Persistence

**Problem:** Losing scroll position and filters when navigating

**Example:**
1. Scroll down Simulations page
2. Apply difficulty filter
3. Click scenario
4. Go back
5. **Filters reset, scroll lost**

**Solution:** Store filter state in URL or sessionStorage
```typescript
// useSimulationStore.ts
const [filters, setFilters] = useState(() => {
  // Restore from sessionStorage
  const saved = sessionStorage.getItem('simulation_filters');
  return saved ? JSON.parse(saved) : { difficulty: null, category: null };
});

// Save on change
useEffect(() => {
  sessionStorage.setItem('simulation_filters', JSON.stringify(filters));
}, [filters]);
```

**Effort:** 30 minutes  
**Impact:** Medium - Better UX for browsing

---

## 🗄️ Priority 3: Database Optimizations

### 3.1 Missing Indexes

**Problem:** Queries may slow down with more data

**Current Tables Without Indexes:**
- `call_sessions`: No index on `(user_id, status)`
- `call_coaching`: No index on `call_id`
- `user_scenarios`: No index on `(user_id, status)`

**Solution:** Add indexes in schema
```sql
-- In db.ts SCHEMA
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_status 
ON call_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_call_coaching_call_id 
ON call_coaching(call_id);

CREATE INDEX IF NOT EXISTS idx_user_scenarios_user_status 
ON user_scenarios(user_id, status);
```

**Effort:** 15 minutes  
**Impact:** High (long-term) - Query performance

---

### 3.2 Data Archiving Strategy

**Problem:** Tables will grow indefinitely

**Current:** No archiving of old calls

**Solution:** Mark old data or move to archive
```typescript
// server/maintenance.ts
export async function archiveOldCalls(olderThanDays: number = 90): Promise<void> {
  // Option 1: Soft delete
  await db.execute({
    sql: `
      UPDATE call_sessions 
      SET is_archived = 1 
      WHERE ended_at < datetime('now', '-${olderThanDays} days')
      AND is_archived = 0
    `
  });
  
  // Dashboard queries should filter: WHERE is_archived = 0
}
```

**Effort:** 1 hour  
**Impact:** High (long-term) - Database size management

---

### 3.3 Call Data Export

**Problem:** Users can't export their practice data

**Use Case:** User wants to review call history offline or share with coach

**Solution:** Add export endpoint
```typescript
// server/call-sessions.ts
export async function exportCallData(callId: string): Promise<string> {
  const details = await getCallDetails(callId);
  
  const exportData = {
    metadata: details.session,
    transcript: details.transcripts,
    coaching: details.coaching,
    summary: details.summary,
    exported_at: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
}
```

**Effort:** 30 minutes  
**Impact:** Low-Medium - User empowerment

---

## 🔧 Priority 4: Quick Fixes

### 4.1 Scenario Completion Sync Issue

**Problem:** Sometimes simulation shows "in_progress" after call ends

**Root Cause:** Race condition between call completion and scenario update

**Current Code:**
```typescript
// In call-sessions.ts completeCallSession()
// Updates user_scenarios, but may fail silently
```

**Fix:** Add transaction or verification
```typescript
// After updating user_scenarios, verify it worked
const verifyResult = await db.execute({
  sql: 'SELECT status FROM user_scenarios WHERE user_id = ? AND scenario_id = ?',
  args: [userId, scenarioId]
});

if (verifyResult.rows[0]?.status !== 'completed') {
  console.error('Failed to update scenario status');
  // Retry or alert
}
```

**Effort:** 20 minutes  
**Impact:** High - Fixes status inconsistency

---

### 4.2 Coaching Cards Overflow

**Problem:** Long text in coaching cards breaks layout

**Current:** No text truncation

**Fix:** Add max-height and scroll
```css
.coaching-card {
  max-height: 200px;
  overflow-y: auto;
}
```

**Effort:** 10 minutes  
**Impact:** Low - Visual polish

---

### 4.3 Audio Permission Handling

**Problem:** If user denies mic permission, call fails silently

**Current:** Shows generic error

**Better:** Guide user to fix permission
```typescript
// In useLiveKitStore.ts
if (error.name === 'NotAllowedError') {
  showError(
    'Microphone Access Denied',
    'Please allow microphone access in your browser settings and try again.'
  );
}
```

**Effort:** 15 minutes  
**Impact:** Medium - Better onboarding

---

## 📈 Priority 5: Small Feature Additions

### 5.1 Call Favorites/Bookmarks

**Problem:** Can't mark good practice calls for review

**Solution:** Add favorite column
```sql
-- In db.ts
call_sessions: `
  ...
  is_favorite INTEGER DEFAULT 0,
  notes TEXT,  -- User notes about the call
  ...
`
```

**UI:** Star button on CallSummaryModal and Recent Calls

**Effort:** 1 hour  
**Impact:** Low-Medium - User organization

---

### 5.2 Quick Scenario Restart

**Problem:** After finishing call, need multiple clicks to retry

**Current:** Click Done → Navigate to Simulations → Find scenario → Start

**Better:** Direct retry from summary
```typescript
// In CallSummaryModal
<button onClick={onRetry}>Try Again</button>  // Already exists!
// Just ensure it navigates back to same scenario
```

**Effort:** Already implemented! Just verify it works  
**Impact:** Medium - Faster iteration

---

### 5.3 Coaching Usage Stats

**Problem:** Don't know which coaching cards are most helpful

**Solution:** Track card interactions
```typescript
// In useLiveKitStore.ts
addCoachingInteraction: (cardIndex: number, action: 'viewed' | 'copied') => {
  // Could send to analytics or store locally
}
```

**Show in Dashboard:**
- "Most viewed: Emotion cards"
- "You used 45 coaching tips this week"

**Effort:** 1 hour  
**Impact:** Low - Nice-to-have insights

---

## 📋 Implementation Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Auto-refresh dashboard | 15m | High | **P1** |
| Fix scenario completion sync | 20m | High | **P1** |
| Add database indexes | 15m | High (long-term) | **P1** |
| Better empty states | 30m/page | Medium | **P2** |
| Audio permission handling | 15m | Medium | **P2** |
| Error state improvements | 1h | Medium | **P2** |
| Call export | 30m | Low-Medium | **P3** |
| Navigation persistence | 30m | Medium | **P3** |
| Data archiving | 1h | High (long-term) | **P3** |
| Coaching stats | 1h | Low | **P4** |
| Call favorites | 1h | Low-Medium | **P4** |

---

## 🎯 Recommended Next Steps

### Immediate (Today - 2 hours)
1. ✅ Add dashboard auto-refresh (15m)
2. ✅ Fix scenario completion verification (20m)
3. ✅ Add database indexes (15m)
4. ✅ Improve empty states on Dashboard (30m)

### Short-term (This week)
5. Audio permission error handling
6. Better error states with retry
7. Navigation persistence
8. Call data export

### Medium-term (Next 2 weeks)
9. Data archiving strategy
10. Coaching usage analytics
11. Call favorites/bookmarks

---

## 🔍 Code Review Notes

### Good Patterns to Maintain
- ✅ Consistent error handling with `showError()`
- ✅ Proper TypeScript types throughout
- ✅ Database transactions for related operations
- ✅ Proper cleanup in useEffect (remove event listeners)

### Anti-patterns to Fix
- ⚠️ Some components fetch data on every render (add `useEffect` with empty deps)
- ⚠️ No debouncing on search inputs
- ⚠️ Direct localStorage access (should wrap in try-catch)

---

*End of Analysis*

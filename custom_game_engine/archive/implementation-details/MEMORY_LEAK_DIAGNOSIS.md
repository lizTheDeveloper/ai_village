# Memory Leak Diagnosis Report

**Date:** 2026-01-04
**Status:** 🔴 CRITICAL - Multiple uncleaned intervals found

## Summary

Found **6 critical memory leaks** caused by `setInterval`/`setTimeout` calls that are never cleared. These accumulate over time, especially when:
- Server is restarted without killing old processes
- Browser tab is reloaded without closing
- Multiple game instances are running

## Critical Leaks Found

### Server-Side (scripts/metrics-server.ts)

**1. Auto-save interval (Line 6044)**
```typescript
setInterval(() => {
  if (gameSessions.size > 0) {
    saveAllSessionsToDisk();
  }
}, 30000);  // Every 30 seconds - NEVER CLEARED
```
- **Impact:** HIGH - Runs every 30s, accumulates if server restarts
- **Fix:** Store interval ID and clear in SIGINT handler

**2. Cleanup interval (Line 6051)**
```typescript
setInterval(() => {
  cleanupOldSessions();
  cleanupOldCanonEvents();
}, 24 * 60 * 60 * 1000);  // Every 24 hours - NEVER CLEARED
```
- **Impact:** MEDIUM - Runs daily, but still leaks
- **Fix:** Store interval ID and clear in SIGINT handler

### Client-Side (demo/src/main.ts)

**3. Agent roster update (Line 3103)**
```typescript
setInterval(() => {
  panels.agentRosterPanel.updateFromWorld(gameLoop.world);
}, 60000);  // Every 60s - NEVER CLEARED
```
- **Impact:** MEDIUM - Accumulates on page reload
- **Fix:** Store interval ID and clear on page unload

**4. Animal roster update (Line 3121)**
```typescript
setInterval(() => {
  panels.animalRosterPanel.updateFromWorld(gameLoop.world);
}, 60000);  // Every 60s - NEVER CLEARED
```
- **Impact:** MEDIUM - Accumulates on page reload
- **Fix:** Store interval ID and clear on page unload

**5. Status display update (Line 3226) ⚠️ HIGHEST IMPACT**
```typescript
setInterval(updateStatus, 100);  // Every 100ms - NEVER CLEARED
```
- **Impact:** 🔴 CRITICAL - Runs 10x/second! Accumulates rapidly on reload
- **Fix:** Store interval ID and clear on page unload

**6. Auto-save interval (Line 3444)**
```typescript
setInterval(async () => {
  // ... auto-save logic
}, AUTOSAVE_INTERVAL_MS);  // Every 60s - NEVER CLEARED
```
- **Impact:** MEDIUM - Accumulates on page reload
- **Fix:** Store interval ID and clear on page unload

## Current System State

**Running Processes:**
- Old metrics server: PID 11648 (from 4:24AM)
- Old Vite server: PID 11612 (from 4:24AM)

**Stale PID Files:**
- `.api-server.pid`: 45320 (dead)
- `.dev-server.pid`: 45464 (dead)
- `.metrics-server.pid`: 45156 (dead)

**Problem:** PID files don't match running processes, causing orchestrator confusion.

## Repair Plan

1. ✅ Add cleanup handlers for all intervals
2. 🔄 Fix PID file tracking in start.sh
3. 🔄 Clean up old processes
4. 🔄 Restart servers cleanly

## Code Quality Stats

- Total `setInterval`/`setTimeout` calls: 93
- Total cleanup calls: 49
- **Cleanup ratio: 53%** (should be 100%)

## Recommendations

1. **Immediate:** Clear all intervals on shutdown/unload
2. **Short-term:** Audit all 93 interval calls for cleanup
3. **Long-term:** Create utility wrapper that auto-tracks intervals

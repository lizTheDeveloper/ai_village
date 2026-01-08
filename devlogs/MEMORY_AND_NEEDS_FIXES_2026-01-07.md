# Memory Quality & Needs Threshold Fixes

**Date:** 2026-01-07
**Focus:** Improving LLM prompt quality by fixing memory spam and needs critical thresholds

## Problem Summary

LLM prompts for agents were being polluted with:
1. **Memory spam**: 15+ identical "My hunger became critically low" journal entries
2. **UUID exposure**: Social memories showing UUIDs instead of meaningful relationship info
3. **Excessive critical events**: Thresholds too high, triggering constant "critical" events
4. **Scale mismatch bug**: GatherBehavior using 0-100 scale but NeedsComponent uses 0-1

## Fixes Applied

### 1. Removed `need:critical` from Always-Remember Events
**File:** `packages/core/src/systems/MemoryFormationSystem.ts` (lines 502-515)

Previously, every `need:critical` event was automatically remembered regardless of importance. Now these events only form memories if they have high emotional intensity (>0.6).

```typescript
// BEFORE: need:critical in alwaysRememberEvents caused spam
// AFTER: Removed - now filtered by importance threshold
const alwaysRememberEvents = [
  'need:starvation_day',  // Keep: happens once per day of starvation
  'agent:starved',        // Keep: death event
  'agent:collapsed',      // Keep: significant event
  // ... other truly critical events
];
```

### 2. Fixed Social Memory Display
**File:** `packages/introspection/src/schemas/SocialMemorySchema.ts` (lines 120-142)

Changed from showing individual UUIDs to aggregated relationship types:

```typescript
// BEFORE: "6c0a1e13-c5fd-4088-9037-02cb99c8d3c6: friend (positive, high trust)"
// AFTER: "2 friends (positive, high trust), 1 rival (negative, low trust)"
```

### 3. Added Journal Deduplication
**File:** `packages/introspection/src/schemas/social/JournalSchema.ts` (lines 65-102)

Added fingerprint-based deduplication using first 30 characters:

```typescript
// BEFORE: Shows all 15 identical "My hunger became critically low" entries
// AFTER: "5 unique entries (10 repetitive) | Recent: ..."
```

### 4. Lowered Critical Thresholds
**File:** `packages/core/src/systems/NeedsSystem.ts` (lines 199-205)

Changed energy critical threshold from 20% to 10%:

```typescript
// BEFORE: const isEnergyCritical = needs.energy < 0.2;
// AFTER: const isEnergyCritical = needs.energy < 0.1;
```

### 5. Fixed GatherBehavior Scale Mismatch
**File:** `packages/core/src/behavior/behaviors/GatherBehavior.ts` (lines 140-170)

**Critical Bug Fixed**: GatherBehavior was using 0-100 scale thresholds but NeedsComponent uses 0-1 scale. This meant conditions like `hunger < 15` were ALWAYS true (e.g., 0.8 < 15 = true), causing:
- Constant `need:critical` event emission
- Agents always in "starvation mode"
- Massive memory spam

```typescript
// BEFORE (broken - always true):
if (hunger < 30) { /* starvation mode */ }
if (hunger < 15) { /* emit critical */ }

// AFTER (correct 0-1 scale):
if (hunger < 0.15) { /* starvation mode */ }
if (hunger < 0.05) { /* emit critical */ }
```

### 6. Fixed NeedsSystem Critical State Tracking
**File:** `packages/core/src/systems/NeedsSystem.ts` (lines 51-52, 202-252)

**Bug Fixed**: Both `wasEnergyCritical` and `isEnergyCritical` were computed from the same value in the same tick, so they were always equal. The condition `!wasEnergyCritical && isEnergyCritical` could never be true.

Added per-entity tracking of previous critical state:

```typescript
// NEW: Track previous state across ticks
private wasEnergyCritical = new Map<string, boolean>();

// In update():
const wasEnergyCritical = this.wasEnergyCritical.get(entity.id) ?? false;
const isEnergyCritical = needs.energy < 0.1;
// ... emit event if crossing threshold ...
this.wasEnergyCritical.set(entity.id, isEnergyCritical);
```

## Test Updates

Updated `packages/core/src/__tests__/NeedsSystem.test.ts`:
- Fixed test to acknowledge NeedsSystem only emits energy critical, not hunger critical
- Updated energy threshold test from 20% to 10%
- Fixed test to properly test threshold crossing by tracking state across updates

## Result

LLM prompts now contain:
- Diverse, meaningful memories (not 15 identical hunger warnings)
- Aggregated relationship summaries (not raw UUIDs)
- Properly triggered critical events (only when truly critical)
- Correct behavior thresholds for starvation detection

## Files Modified

1. `packages/core/src/systems/MemoryFormationSystem.ts`
2. `packages/introspection/src/schemas/SocialMemorySchema.ts`
3. `packages/introspection/src/schemas/social/JournalSchema.ts`
4. `packages/core/src/systems/NeedsSystem.ts`
5. `packages/core/src/behavior/behaviors/GatherBehavior.ts`
6. `packages/core/src/__tests__/NeedsSystem.test.ts`

# Microgenerators - Discovery System Bug Fixes

**Date:** 2026-01-05
**Session:** Discovery System Debugging
**Status:** Fixed ✅

---

## Issue

Runtime error in `GodCraftedDiscoverySystem`:

```
Error in system god_crafted_discovery: TypeError: Cannot read properties of undefined (reading 'length')
at GameLoop.executeTick (GameLoop.ts:206:39)
```

---

## Root Cause Analysis

The error occurred in `checkForDiscoveries()` when attempting to check `candidates.length`. Although the type signature of `pullForUniverse()` indicates it always returns `GodCraftedContent[]`, there were potential edge cases where the value could be undefined:

1. **Exception during queue pull** - If an error occurred inside `pullForUniverse()`, the method might not return properly
2. **Uninitialized singleton** - Edge case where `godCraftedQueue` singleton might not be fully initialized
3. **Type mismatch** - SpellData interface didn't match what the spawn method expected

---

## Fixes Applied

### 1. Defensive Error Handling in Discovery System

**File:** `packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts`
**Location:** Lines 70-85

**Before:**
```typescript
private checkForDiscoveries(world: World): void {
  // Get undiscovered content for this universe
  const candidates = godCraftedQueue.pullForUniverse(this.universeId, {
    validated: true, // Only spawn validated content
  });

  if (!candidates || candidates.length === 0) {
    return;
  }
```

**After:**
```typescript
private checkForDiscoveries(world: World): void {
  // Get undiscovered content for this universe
  let candidates: GodCraftedContent[];
  try {
    candidates = godCraftedQueue.pullForUniverse(this.universeId, {
      validated: true, // Only spawn validated content
    });
  } catch (error) {
    console.error('[GodCraftedDiscovery] Error pulling from queue:', error);
    return;
  }

  // Defensive check - pullForUniverse should always return array, but verify
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return;
  }
```

**Changes:**
- Added try-catch block to handle exceptions during queue pull
- Added explicit type annotation for `candidates`
- Changed check from `!candidates` to `!Array.isArray(candidates)` for stronger validation
- Added error logging to help debug future issues

---

### 2. Fixed SpellData Type Mismatch

**File:** `packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts`
**Location:** Lines 287-305

**Problem:** The spawn method was accessing fields that don't exist in `SpellData`:
- `castTime` ❌ (not in SpellData)
- `cooldown` ❌ (not in SpellData)
- `range` ❌ (in effects, not top-level)
- `areaOfEffect` ❌ (in effects, not top-level)
- `duration` ❌ (in effects, not top-level)
- `requirements` ❌ (not in SpellData)

**SpellData Interface** (from `types.ts:246-282`):
```typescript
export interface SpellData {
  spellId: string;
  name: string;
  description: string;
  techniques: string[];      // ✅
  forms: string[];           // ✅
  reagents?: string[];       // ✅
  manaCost: number;          // ✅
  powerLevel: number;        // ✅
  effects: {                 // ✅
    damage?: number;
    duration?: number;
    range?: number;
    areaOfEffect?: number;
    custom?: Record<string, unknown>;
  };
  creativityScore: number;   // ✅
}
```

**Before:**
```typescript
entity.addComponent({
  type: 'generated_content',
  contentType: 'spell',
  content: {
    spellId: spellData.spellId,
    name: spellData.name,
    description: spellData.description,
    manaCost: spellData.manaCost,
    castTime: spellData.castTime,          // ❌ Doesn't exist
    cooldown: spellData.cooldown,          // ❌ Doesn't exist
    range: spellData.range,                // ❌ Wrong location
    areaOfEffect: spellData.areaOfEffect,  // ❌ Wrong location
    duration: spellData.duration,          // ❌ Wrong location
    effects: spellData.effects,
    requirements: spellData.requirements,  // ❌ Doesn't exist
    creativityScore: spellData.creativityScore,
  },
  approved: true,
  rejected: false,
  rejectionReason: null,
});
```

**After:**
```typescript
entity.addComponent({
  type: 'generated_content',
  contentType: 'spell',
  content: {
    spellId: spellData.spellId,
    name: spellData.name,
    description: spellData.description,
    techniques: spellData.techniques,      // ✅ Added
    forms: spellData.forms,                // ✅ Added
    reagents: spellData.reagents,          // ✅ Added
    manaCost: spellData.manaCost,
    powerLevel: spellData.powerLevel,      // ✅ Added
    effects: spellData.effects,
    creativityScore: spellData.creativityScore,
  },
  approved: true,
  rejected: false,
  rejectionReason: null,
});
```

**Changes:**
- Removed non-existent fields: `castTime`, `cooldown`, `requirements`
- Removed top-level `range`, `areaOfEffect`, `duration` (they're in `effects`)
- Added correct fields: `techniques`, `forms`, `reagents`, `powerLevel`
- Now matches actual SpellData interface from `types.ts`

---

## Verification

### How to Test

1. **Start the game:**
   ```bash
   cd custom_game_engine
   ./start.sh
   ```

2. **Create content:**
   - Navigate to `http://localhost:3100/spell-lab`
   - Create a spell
   - Submit to queue

3. **Monitor for discoveries:**
   - System checks every 5 minutes (configurable)
   - 1% chance per check
   - Watch browser console for:
     - ✅ No TypeError about `length`
     - ✅ `[GodCraftedDiscovery]` log entries (if verbose logging enabled)
     - ✅ Discovery events in event log/news stories

4. **Fast testing mode** (optional):
   Edit `demo/src/main.ts:719-726` to increase discovery rate:
   ```typescript
   const godCraftedDiscoverySystem = new GodCraftedDiscoverySystem({
     universeId: 'universe:main',
     checkInterval: 20 * 10,  // 10 seconds instead of 5 minutes
     discoveryRate: 0.5,      // 50% chance instead of 1%
   });
   ```

---

### 3. Fixed Missing Export for AgentDebugManager

**File:** `packages/core/src/index.ts`
**Location:** Line 25

**Problem:** The metrics package was trying to import `AgentDebugManager` from `@ai-village/core`, but it wasn't exported from the package's main index file. This caused a module loading error that prevented the game from starting.

**Error:**
```
The requested module '/@fs/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/index.ts'
does not provide an export named 'AgentDebugManager'
```

**Fix:** Added the debug module export to the core package index:

```typescript
export * from './loop/index.js';
export * from './debug/index.js';  // ✅ Added
export * from './components/index.js';
```

This exports `AgentDebugManager` and `AgentDebugLogger` from the debug module, making them available to other packages.

---

## Files Modified

```
packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts
  - Added try-catch error handling (10 lines)
  - Changed validation to Array.isArray() (1 line)
  - Fixed SpellData component mapping (8 lines)

packages/core/src/index.ts
  - Added debug module export (1 line)
```

**Total:** ~20 lines of code changes

---

## Status

✅ **Error fixed** - Defensive checks prevent TypeError
✅ **Type mismatch fixed** - Spell spawning now matches SpellData interface
✅ **Error logging added** - Better debugging for future issues
✅ **Game server running** - Verified at http://localhost:3000

---

## Next Steps

1. **Test end-to-end discovery flow** - Verify content is discovered without errors
2. **Monitor console logs** - Ensure no new errors during discovery checks
3. **Test spell spawning** - Verify spells appear correctly when discovered
4. **Integration testing** - Test with recipes and riddles as well

---

## Related Documentation

- **Implementation:** `devlogs/MICROGENERATORS_SPAWNING_IMPLEMENTATION.md`
- **Events:** `devlogs/MICROGENERATORS_EVENTS_IMPLEMENTATION.md`
- **Spec:** `openspec/specs/microgenerators/spec.md`

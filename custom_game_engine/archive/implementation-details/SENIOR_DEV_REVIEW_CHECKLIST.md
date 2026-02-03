# Senior Dev Review Checklist

> **Purpose:** Prevent production bugs, performance issues, and memory leaks before code is merged.

## ⚠️ Memory Leak Prevention

### Rule: All `setInterval` / `setTimeout` Must Have Cleanup

**Before merging, verify:**

- [ ] **Every `setInterval` has a corresponding `clearInterval`**
- [ ] **Every `setTimeout` has a corresponding `clearTimeout` OR is intentionally one-shot**
- [ ] **Cleanup handlers are registered BEFORE the interval starts**

**Client-side (Browser):**
```typescript
// ✅ CORRECT - Track and cleanup on unload
const intervalIds: ReturnType<typeof setInterval>[] = [];

intervalIds.push(setInterval(() => { /* ... */ }, 1000));

window.addEventListener('beforeunload', () => {
  intervalIds.forEach(clearInterval);
});
```

```typescript
// ❌ WRONG - No cleanup, memory leak!
setInterval(() => { /* ... */ }, 1000);
```

**Server-side (Node.js):**
```typescript
// ✅ CORRECT - Clear on SIGINT
const autoSaveInterval = setInterval(() => { /* ... */ }, 30000);

process.on('SIGINT', () => {
  clearInterval(autoSaveInterval);
  process.exit(0);
});
```

```typescript
// ❌ WRONG - No cleanup, accumulates on restart!
setInterval(() => { /* ... */ }, 30000);
```

### Rule: Use TickScheduler for Game Logic

**Game-synchronized tasks MUST NOT use `setInterval`.**

Use `TickScheduler` (TODO: implement) for:
- Auto-save based on game time
- Roster updates based on ticks
- Any logic that should pause when game pauses

```typescript
// ✅ CORRECT - Syncs with game loop
tickScheduler.registerTask('autosave', 1200, () => {
  // Runs every 1200 ticks (60s @ 20 TPS)
});

// ❌ WRONG - Runs on wall-clock time, ignores game state
setInterval(() => {
  // Auto-save
}, 60000);
```

**When `setInterval` IS allowed:**
- ✅ UI updates (status display, animations)
- ✅ Server infrastructure (metrics, cleanup)
- ❌ Game logic (use TickScheduler instead)

---

## 🔍 Component Type Names

**Rule: Always use `lowercase_with_underscores`**

```typescript
// ✅ CORRECT
entity.hasComponent('spatial_memory');
type = 'steering';

// ❌ WRONG
entity.hasComponent('SpatialMemory');
type = 'Steering';
```

**Why:** Consistency across codebase, grep-friendly, matches JSON serialization.

---

## 💥 No Silent Fallbacks - Crash on Invalid Data

**Rule: Fail fast with clear errors, no silent defaults**

```typescript
// ❌ WRONG - Masks missing data
const health = data.get("health", 100);
const efficiency = Math.min(1, Math.max(0, val));

// ✅ CORRECT - Crashes with clear error
if (!("health" in data)) {
  throw new Error("Missing required 'health' field");
}
if (efficiency < 0 || efficiency > 1) {
  throw new RangeError(`Invalid efficiency: ${efficiency}`);
}
```

**Exception:** Truly optional fields
```typescript
// ✅ OK - description is actually optional
const description = data.get("description", "");
```

**Why:** Bugs surface immediately in dev, not 3 days later in production.

---

## 📊 Use Math Utilities for Normalization

**Rule: Use helpers from `packages/core/src/utils/math.ts`**

```typescript
import { softmax, sigmoid, normalize } from '../utils/math.js';

// ✅ CORRECT - Validated utilities
const weights = softmax([0.5, 1.2, 0.8]);
const efficiency = sigmoid(rawValue);
const normalized = normalize(values);

// ❌ WRONG - Manual normalization, no validation
const sum = values.reduce((a, b) => a + b);
const normalized = values.map(v => v / sum);
```

**Why:** Built-in validation, prevents NaN/Infinity bugs.

---

## 🚫 No Debug Output in Production

**Rule: Only `console.error` and `console.warn` allowed**

```typescript
// ❌ PROHIBITED
console.log('Debug:', x);
console.debug('State:', s);
console.info('Info:', i);

// ✅ ALLOWED
console.error('[SystemName] Error:', e);
console.warn('[SystemName] Warning:', w);
```

**Why:** Clean production logs, performance (logging is expensive).

---

## ⚡ Performance: Cache Queries & Avoid Math.sqrt

**Rule: Query outside loops, use squared distance**

```typescript
// ❌ WRONG - Query in loop, sqrt in hot path
for (const entity of entities) {
  const others = world.query().with('position').executeEntities(); // ⚠️
  const distance = Math.sqrt(dx*dx + dy*dy);  // ⚠️
  if (distance < radius) { /* ... */ }
}

// ✅ CORRECT - Cache query, squared comparison
const others = world.query().with('position').executeEntities();
const radiusSquared = radius * radius;
for (const entity of entities) {
  if (dx*dx + dy*dy < radiusSquared) { /* ... */ }
}
```

**Tools:**
- `CachedQuery` for persistent queries
- `SingletonCache` for singleton entities
- `distanceSquared()` helper
- `isWithinRadius()` helper

See: `PERFORMANCE.md`

---

## 💾 Save/Load: Use `saveLoadService`

**Rule: NEVER re-implement save logic**

```typescript
import { saveLoadService } from '@ai-village/core';

// ✅ CORRECT
await saveLoadService.save(world, { name: 'checkpoint' });
await saveLoadService.load('checkpoint_key', world);

// ❌ WRONG - Custom serialization
JSON.stringify(world.entities);  // ⚠️ Breaks versioning, migrations
```

**When to save:**
- Before destructive operations (settings changes, reloads)
- Before experimental features
- Major state transitions

See: `METASYSTEMS_GUIDE.md#persistence-system`

---

## ♻️ Conservation of Game Matter

**Rule: NEVER delete entities - mark as corrupted instead**

```typescript
// ❌ WRONG - Deletes data permanently
world.removeEntity(brokenEntity);
souls.splice(deadSoulIndex, 1);

// ✅ CORRECT - Preserve for recovery
brokenEntity.addComponent({
  type: 'corrupted',
  corruption_reason: 'validation_failed',
  recoverable: true,
});
```

**Why:**
- Future data recovery scripts
- Emergent gameplay (find corrupted content)
- Debugging (see what went wrong)
- No permanent data loss

See: `CLAUDE.md#conservation-of-game-matter`

---

## 🧪 Pre-Merge Verification

**Before marking PR ready for review:**

- [ ] `npm run build` passes with no errors
- [ ] No browser console errors during manual testing
- [ ] All error paths tested (invalid inputs throw exceptions)
- [ ] No memory leaks (intervals cleaned up, listeners removed)
- [ ] Performance: No queries in loops, no Math.sqrt in hot paths
- [ ] All `console.log/debug/info` removed
- [ ] Component types use `lowercase_with_underscores`
- [ ] Save/load tested if world state changed

---

## 📋 Code Review Focus Areas

**Reviewer should verify:**

1. **Memory Management**
   - Intervals have cleanup
   - Event listeners removed
   - No circular references

2. **Error Handling**
   - No silent fallbacks
   - Clear error messages
   - Fail fast on invalid data

3. **Performance**
   - Queries cached
   - Math.sqrt avoided
   - No O(n²) in hot paths

4. **Data Integrity**
   - Conservation of Game Matter followed
   - Save/load uses `saveLoadService`
   - No data deletion, only corruption marking

5. **Code Style**
   - Component types lowercase
   - No debug output
   - Math utils used for normalization

---

## 🚨 Auto-Reject Criteria

**PR will be immediately rejected if:**

- ❌ `setInterval` without cleanup
- ❌ `Math.sqrt` in per-entity loop
- ❌ Query inside `for` loop
- ❌ `console.log` / `console.debug` in code
- ❌ Direct entity deletion (not via corruption component)
- ❌ Custom save/load implementation
- ❌ PascalCase component types

---

## 🔄 Continuous Improvement

**After each bug fix, update this checklist with:**
- Root cause
- Detection method
- Prevention rule

**Recent additions:**
- 2026-01-04: Memory leak prevention (setInterval cleanup)
- 2026-01-04: TickScheduler vs setInterval decision matrix

# Common Pitfalls & Anti-Patterns

> Quick reference for avoiding common mistakes in the AI Village codebase.
> For detailed explanations, see the linked documentation.

**Last Updated:** 2026-01-15

---

## Table of Contents

- [CRITICAL - Will Break the Game](#-critical---will-break-the-game)
- [HIGH - Causes Bugs](#-high---causes-bugs)
- [MEDIUM - Causes Confusion](#-medium---causes-confusion)
- [Quick Reference Table](#quick-reference-table)
- [Checklist Before Committing](#checklist-before-committing)

---

## 🔴 CRITICAL - Will Break the Game

### 1. Overly Broad `requiredComponents` (THE #1 PERFORMANCE KILLER)

**Wrong:**
```typescript
// ❌ Gets ALL 200,000+ entities with Position
// This caused tick times to grow from 50ms to 1000ms+
export class DoorSystem implements System {
  public readonly requiredComponents = [CT.Position]; // 200,000 entities!

  update(world: World, entities: ReadonlyArray<Entity>) {
    for (const entity of entities) {
      // Iterating 200,000 entities when you only need agents
      const agent = entity.getComponent(CT.Agent);
      if (!agent) continue; // Checking inside loop = disaster
    }
  }
}
```

**Right:**
```typescript
// ✅ Gets only the ~5 entities you actually need
export class DoorSystem implements System {
  public readonly requiredComponents = [CT.Position, CT.Agent]; // 5 entities!

  update(world: World, entities: ReadonlyArray<Entity>) {
    for (const entity of entities) {
      // Now only iterating agents, door checks are fast
    }
  }
}
```

**Why:** The ECS pre-filters entities based on `requiredComponents` BEFORE passing them to `update()`. If your system only needs agents but you specify `[CT.Position]`, you'll get 200,000+ entities instead of 5.

**Rules:**
1. **Include ALL components you filter by** - If you check `if (!agent) continue;`, add `CT.Agent` to requiredComponents
2. **Be as specific as possible** - More components = fewer entities = faster iteration
3. **Never use just `[CT.Position]`** - Almost every entity has Position (200k+)

**See:** [PERFORMANCE.md](./PERFORMANCE.md#-critical-system-requiredcomponents-must-be-specific)

---

### 2. Query in Loop (Catastrophic Performance)

**Wrong:**
```typescript
for (const entity of entities) {
  // ❌ Query on EVERY iteration!
  const others = world.query().with(CT.Position).executeEntities();
  for (const other of others) {
    // This makes O(n²) into O(n³)
  }
}
```

**Right:**
```typescript
// ✅ Query ONCE before loop
const others = world.query().with(CT.Position).executeEntities();
for (const entity of entities) {
  for (const other of others) {
    // Fast iteration
  }
}
```

**Why:** Queries are expensive. Doing them inside loops caused 1000ms+ tick times in production.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#1-repeated-queries), [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#1-cache-queries-critical)

---

### 3. Deleting Entities (Conservation of Game Matter)

**Wrong:**
```typescript
// ❌ NEVER delete entities
world.removeEntity(brokenEntity);
delete corruptedSave;
souls.splice(deadSoulIndex, 1);
```

**Right:**
```typescript
// ✅ Mark as corrupted and preserve
brokenEntity.addComponent({
  type: 'corrupted',
  corruption_reason: 'malformed_data',
  corruption_date: Date.now(),
  recoverable: true
});

corruptedSave.status = 'corrupted';
corruptedSave.preserve = true;

deadSoul.addComponent({
  type: 'deceased',
  death_cause: 'old_age',
  preserveForAfterlife: true
});
```

**Why:** Like conservation of matter in physics, **nothing in the game is ever truly deleted**. Benefits:
- Future recovery via data fixer scripts
- Emergent gameplay (corrupted content = quests)
- No data loss (players never lose progress)
- Debugging (inspect what went wrong)
- Lore integration (corrupted universes become game content)

**See:** [CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md), [CLAUDE.md](../CLAUDE.md#conservation-of-game-matter)

---

### 4. SharedWorker Misconception (Multiple Windows = Chaos)

**Wrong:**
```typescript
// ❌ Opening multiple browser windows
// Each window runs its own simulation!
// Now you have 3 conflicting worlds fighting for control
```

**Right:**
```typescript
// ✅ Only ONE window should run the simulation
// Other windows are view-only clients via SharedWorker
// The architecture enforces this, but don't fight it
```

**Why:** The game uses a SharedWorker architecture where ONE window runs the authoritative simulation and broadcasts state to other windows. Opening multiple game windows creates multiple competing simulations that will corrupt each other.

**See:** [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)

---

### 5. Variable deltaTime (Breaks Determinism)

**Wrong:**
```typescript
// ❌ BAD: Variable timestep
update(world: World, deltaTime: number): void {
  position.x += velocity.x * deltaTime;  // Non-deterministic!
  // deltaTime varies based on frame rate
}
```

**Right:**
```typescript
// ✅ GOOD: Fixed timestep (deltaTime is always 0.05s)
update(world: World, deltaTime: number): void {
  // deltaTime is constant (50ms = 0.05s)
  position.x += velocity.x * 0.05;
  // Or just use deltaTime - it's guaranteed to be 0.05
  position.x += velocity.x * deltaTime;
}
```

**Why:** The game uses a fixed 20 TPS timestep. deltaTime is **always** 0.05 seconds. Using it as a variable breaks determinism (replays, multiplayer sync, time travel).

**See:** [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#fixed-timestep-architecture)

---

### 6. Stale .js Files (Changes Don't Appear)

**Symptoms:**
- Changes don't appear in browser
- Console shows `.js` paths instead of `.ts`
- TypeScript errors but game still runs old code

**Fix:**
```bash
# Delete all compiled .js and .d.ts files from src/
find custom_game_engine/packages -path "*/src/*.js" -type f -delete
find custom_game_engine/packages -path "*/src/*.d.ts" -type f -delete
cd custom_game_engine/demo && npm run dev
```

**Why:** TypeScript may output `.js` to `src/`, causing Vite to serve stale files instead of `.ts`.

**See:** [CLAUDE.md](../CLAUDE.md#build-artifacts-stale-js-files)

---

## 🟠 HIGH - Causes Bugs

### 7. Math.sqrt in Hot Paths

**Wrong:**
```typescript
for (const entity of entities) {
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < radius) { /* ... */ }
}
```

**Right:**
```typescript
const radiusSquared = radius * radius;
for (const entity of entities) {
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < radiusSquared) { /* ... */ }
}
```

**Why:** `Math.sqrt()` is 10-20x slower than multiplication. In a loop that runs 20 times/second over 100+ entities, this adds up fast.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#2-expensive-math-operations)

---

### 8. Silent Fallbacks (Crash on Invalid Data)

**Wrong:**
```typescript
// ❌ Silently defaults to 100 if missing
health = data.get("health", 100);
efficiency = Math.min(1, Math.max(0, val)); // Clamps invalid values
```

**Right:**
```typescript
// ✅ Crash loudly on missing required data
if (!("health" in data)) {
  throw new Error("Missing required field 'health'");
}
health = data.health;

// Exception for truly optional fields
description = data.get("description", ""); // OK - description is optional
```

**Why:** Silent fallbacks hide bugs. If health is missing, there's a data corruption issue that needs to be fixed, not hidden. Fail fast, fail loud.

**See:** [CLAUDE.md](../CLAUDE.md#2-no-silent-fallbacks---crash-on-invalid-data)

---

### 9. Unnecessary Server Restarts

**Wrong:**
```typescript
// ❌ Restarting server after every TypeScript change
./start.sh kill
./start.sh
```

**Right:**
```typescript
// ✅ Just save the file - Vite HMR auto-reloads in 1-2 seconds
// No restart needed!
```

**Why:** Vite HMR auto-reloads TypeScript changes in 1-2 seconds. Restarting:
- Destroys simulation state
- Disrupts other agents' work
- Wastes time (30s restart vs 1s HMR)

**Restart only needed for:**
- `npm install`
- Config changes (`vite.config.ts`, `tsconfig.json`, `.env`)
- Crashes
- Stale `.js` in `src/`

**See:** [CLAUDE.md](../CLAUDE.md#do-not-restart-servers)

---

### 10. No System Throttling (Wastes CPU)

**Wrong:**
```typescript
// ❌ Runs every tick (20 times/second)
export class WeatherSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>) {
    // Weather changes slowly - why run this 20 times/second?
  }
}
```

**Right:**
```typescript
// ✅ Throttle to once every 5 seconds
export class WeatherSystem implements System {
  private readonly UPDATE_INTERVAL = 100; // ticks (5 seconds)
  private lastUpdate = 0;

  update(world: World, entities: ReadonlyArray<Entity>) {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    // Actual weather logic (runs every 5 seconds)
  }
}
```

**Why:** Not all systems need to run every tick (50ms). Weather changes slowly - running it 20 times/second wastes 95% of the CPU cycles.

**Common intervals:**
- `WeatherSystem`: 100 ticks (5s)
- `SoilSystem`: 20 ticks (1s)
- `MemoryConsolidation`: 1000 ticks (50s)
- `AutoSave`: 6000 ticks (5 minutes)

**See:** [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#throttling--update-intervals)

---

### 11. Array Allocations in Loops

**Wrong:**
```typescript
for (const entity of entities) {
  const nearby = Array.from(world.entities.values()); // ❌ New array every iteration
  // ... process nearby
}
```

**Right:**
```typescript
// ✅ Iterate directly
for (const entity of entities) {
  for (const other of world.entities.values()) {
    // ... process
  }
}

// ✅ BETTER: Use spatial indexing
const chunk = world.getEntitiesInChunk(chunkX, chunkY);
```

**Why:** Allocating arrays in loops creates garbage collection pressure. At 20 TPS with 100 entities, that's 2000 array allocations per second.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#3-array-allocations-in-loops)

---

### 12. Math.pow for Squaring

**Wrong:**
```typescript
const distSquared = Math.pow(dx, 2) + Math.pow(dy, 2); // ❌ Slow
```

**Right:**
```typescript
const distSquared = dx * dx + dy * dy; // ✅ Fast
```

**Why:** `Math.pow(x, 2)` is a function call with exponent logic. `x * x` is a single multiplication. 10x speed difference.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#2-expensive-math-operations)

---

### 13. Re-implementing Save Logic

**Wrong:**
```typescript
// ❌ Don't write custom save/load code
function mySave(world: World) {
  const json = JSON.stringify(world);
  localStorage.setItem('save', json);
}
```

**Right:**
```typescript
// ✅ Use the existing saveLoadService
import { saveLoadService } from '@ai-village/core';

await saveLoadService.save(world, {
  name: 'my_checkpoint',
  description: 'Village with 10 agents'
});

const result = await saveLoadService.load('checkpoint_key', world);
```

**Why:** `saveLoadService` handles:
- Serialization (components, entities, systems)
- Versioning (migrations between game versions)
- Checksums (corruption detection)
- Time travel (snapshots)
- Multiverse forking

**See:** [CLAUDE.md](../CLAUDE.md#saveload-system)

---

## 🟡 MEDIUM - Causes Confusion

### 14. Component Naming Convention (lowercase_with_underscores)

**Wrong:**
```typescript
type = 'SpatialMemory'; // ❌ PascalCase
entity.hasComponent('Steering'); // ❌ PascalCase
```

**Right:**
```typescript
type = 'spatial_memory'; // ✅ lowercase_with_underscores
entity.hasComponent('steering'); // ✅ lowercase_with_underscores
```

**Why:** Component types use `lowercase_with_underscores` convention throughout the codebase. Mixing conventions causes query failures.

**See:** [CLAUDE.md](../CLAUDE.md#1-component-types-use-lowercase_with_underscores)

---

### 15. Debug console.log() Output

**Wrong:**
```typescript
console.log('Debug:', x); // ❌ Prohibited
console.log('Processing entity:', entity.id); // ❌ Spams console
```

**Right:**
```typescript
// ✅ Only errors and warnings
console.error('[MySystem] Error:', e);
console.warn('[MySystem] Warning:', w);
```

**Why:** Debug logs spam the console and make real errors hard to find. Use browser DevTools breakpoints for debugging.

**See:** [CLAUDE.md](../CLAUDE.md#4-no-debug-output)

---

### 16. `as any` Type Casts

**Wrong:**
```typescript
const component = entity.getComponent('position') as any; // ❌ Bypasses type safety
```

**Right:**
```typescript
const component = entity.getComponent(CT.Position) as PositionComponent; // ✅ Proper type
```

**Why:** `as any` disables TypeScript's type checking, hiding bugs. Fix the underlying types instead.

**See:** General TypeScript best practices

---

### 17. Ignoring System Priority

**Wrong:**
```typescript
// ❌ MovementSystem runs before SteeringSystem
export class MovementSystem implements System {
  priority = 50; // Too early!
}

export class SteeringSystem implements System {
  priority = 100; // Too late!
}

// Result: Movement uses previous tick's velocity → lag
```

**Right:**
```typescript
// ✅ SteeringSystem calculates velocity first
export class SteeringSystem implements System {
  priority = 95; // Runs first
}

export class MovementSystem implements System {
  priority = 100; // Runs after
}
```

**Why:** System priority determines execution order. Data producers must run before data consumers.

**Priority ranges:**
- 1-10: Infrastructure (Time, Weather)
- 50-100: Agent Core (Brain, Movement)
- 100-200: Cognition (Memory, Skills)
- 900-999: Utility (Metrics, AutoSave)

**See:** [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#system-priority-ordering)

---

### 18. Not Using Math Utilities

**Wrong:**
```typescript
// ❌ Re-implementing existing utilities
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map(v => v / sum);
}
```

**Right:**
```typescript
// ✅ Use existing utilities
import { sigmoid, normalize, softmax } from '../utils/math.js';

const activated = sigmoid(x);
const normalized = normalize(values);
```

**Why:** Math utilities are already implemented, tested, and optimized.

**See:** [CLAUDE.md](../CLAUDE.md#3-use-math-utilities-packagescoresrcutilsmathts), `packages/core/src/utils/math.ts`

---

### 19. Singleton Query Every Tick

**Wrong:**
```typescript
update(world: World) {
  // ❌ Query every tick for singleton entity
  const timeEntity = world.query().with(CT.Time).executeEntities()[0];
  const time = timeEntity.getComponent(CT.Time);
}
```

**Right:**
```typescript
private timeEntityId: string | null = null;

update(world: World) {
  // ✅ Cache singleton entity ID
  if (!this.timeEntityId) {
    const entities = world.query().with(CT.Time).executeEntities();
    if (entities.length > 0) {
      this.timeEntityId = entities[0]!.id;
    }
  }

  if (this.timeEntityId) {
    const timeEntity = world.getEntity(this.timeEntityId);
    if (!timeEntity) {
      this.timeEntityId = null; // Entity was destroyed, re-query next tick
      return;
    }
    const time = timeEntity.getComponent(CT.Time);
  }
}
```

**Why:** Singleton entities (Time, Weather) don't change identity. Cache the ID instead of querying every tick.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#pattern-singleton-entity-cache)

---

### 20. Object Spreads in Hot Loops

**Wrong:**
```typescript
for (const entity of entities) {
  const data = { ...entity.components, ...extraData }; // ❌ Expensive spread
}
```

**Right:**
```typescript
for (const entity of entities) {
  // ✅ Only spread when necessary
  const data = entity.components;
  if (needsExtraData) {
    data = { ...data, ...extraData }; // Spread conditionally
  }
}
```

**Why:** Object spreads create new objects. In a hot loop (20 TPS, 100+ entities), that's 2000+ allocations per second.

**Note:** Spreads in `updateComponent()` are required for immutability - those are OK.

**See:** [PERFORMANCE.md](./PERFORMANCE.md#4-unnecessary-object-spreads)

---

## Quick Reference Table

| Pitfall | Severity | Symptom | Fix | Doc |
|---------|----------|---------|-----|-----|
| Overly broad `requiredComponents` | CRITICAL | 1000ms+ tick times | Add all filtered components to `requiredComponents` | [PERFORMANCE.md](./PERFORMANCE.md#-critical-system-requiredcomponents-must-be-specific) |
| Query in loop | CRITICAL | Massive slowdown | Cache query before loop | [PERFORMANCE.md](./PERFORMANCE.md#1-repeated-queries) |
| Deleting entities | CRITICAL | Data loss | Mark as corrupted, preserve | [CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md) |
| Multiple windows running simulation | CRITICAL | Corrupted state | Only one window runs simulation | [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) |
| Variable deltaTime | CRITICAL | Non-deterministic | Use fixed 0.05s timestep | [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#fixed-timestep-architecture) |
| Stale .js files | CRITICAL | Changes don't appear | Delete .js files from src/ | [CLAUDE.md](../CLAUDE.md#build-artifacts-stale-js-files) |
| Math.sqrt in hot path | HIGH | Slow performance | Use squared distance | [PERFORMANCE.md](./PERFORMANCE.md#2-expensive-math-operations) |
| Silent fallbacks | HIGH | Hidden bugs | Throw on invalid data | [CLAUDE.md](../CLAUDE.md#2-no-silent-fallbacks---crash-on-invalid-data) |
| Unnecessary server restarts | HIGH | Lost state, wasted time | Use Vite HMR | [CLAUDE.md](../CLAUDE.md#do-not-restart-servers) |
| No system throttling | HIGH | Wasted CPU | Add UPDATE_INTERVAL | [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#throttling--update-intervals) |
| Array allocations in loops | HIGH | GC pressure | Iterate directly or use spatial indexing | [PERFORMANCE.md](./PERFORMANCE.md#3-array-allocations-in-loops) |
| Math.pow for squaring | HIGH | Slow performance | Use `x * x` | [PERFORMANCE.md](./PERFORMANCE.md#2-expensive-math-operations) |
| Re-implementing save logic | HIGH | Missing features, bugs | Use `saveLoadService` | [CLAUDE.md](../CLAUDE.md#saveload-system) |
| Component naming convention | MEDIUM | Query failures | Use `lowercase_with_underscores` | [CLAUDE.md](../CLAUDE.md#1-component-types-use-lowercase_with_underscores) |
| Debug console.log() | MEDIUM | Console spam | Only errors/warnings | [CLAUDE.md](../CLAUDE.md#4-no-debug-output) |
| `as any` type casts | MEDIUM | Hidden bugs | Fix underlying types | N/A |
| Ignoring system priority | MEDIUM | Stale data, lag | Set priority based on dependencies | [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md#system-priority-ordering) |
| Not using math utilities | MEDIUM | Duplicate code | Import from `utils/math.ts` | [CLAUDE.md](../CLAUDE.md#3-use-math-utilities-packagescoresrcutilsmathts) |
| Singleton query every tick | MEDIUM | Unnecessary queries | Cache entity ID | [PERFORMANCE.md](./PERFORMANCE.md#pattern-singleton-entity-cache) |
| Object spreads in loops | MEDIUM | GC pressure | Spread conditionally | [PERFORMANCE.md](./PERFORMANCE.md#4-unnecessary-object-spreads) |

---

## Checklist Before Committing

### Code Quality
- [ ] Component types use `lowercase_with_underscores`
- [ ] No `as any` type casts (fix underlying types)
- [ ] No `console.log()` debug output (only errors/warnings)
- [ ] Error paths throw exceptions (no silent fallbacks)
- [ ] Using math utilities from `utils/math.ts` (not re-implementing)

### Performance
- [ ] **`requiredComponents` includes ALL filtered components**
- [ ] No queries inside loops (cache before loop)
- [ ] Distance comparisons use squared distance (no `Math.sqrt`)
- [ ] No `Math.pow(x, 2)` (use `x * x`)
- [ ] Queries cached if called multiple times per tick
- [ ] System has `UPDATE_INTERVAL` if not time-critical
- [ ] No `Array.from()` when direct iteration works
- [ ] No object spreads in tight loops
- [ ] Singleton entities cached by ID

### Architecture
- [ ] No entity deletions (mark as corrupted instead)
- [ ] Fixed timestep (deltaTime = 0.05s, don't use as variable)
- [ ] System priority set correctly (data producers before consumers)
- [ ] Using `saveLoadService` (not custom save logic)
- [ ] No server restarts for TypeScript changes (use HMR)

### Testing
- [ ] `npm test` passes (no failing tests)
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] No browser console errors (F12 → Console)
- [ ] Changes work as expected (test in browser)
- [ ] No performance regression (TPS/FPS stable)
- [ ] No stale `.js` files in `src/` (run cleanup script if changes don't appear)

---

## Additional Resources

- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimization guide
- **[SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)** - Fixed timestep, system priority, throttling
- **[CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md)** - Conservation of game matter
- **[CLAUDE.md](../CLAUDE.md)** - Full development guidelines
- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - ECS, packages, data flow
- **[SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)** - All 212+ systems with priorities

---

**Remember:** These pitfalls were discovered the hard way. Following this guide saves you from repeating the same mistakes.

**Last Updated:** 2026-01-15

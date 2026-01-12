# Performance Hotspots

## Overview

Code review identified performance issues that could cause frame drops with many entities. These include nested loops, repeated queries, and inefficient data structure usage. Systems run every tick (20 TPS), so even small inefficiencies compound.

---

## 1. Critical Issues

### 1.1 Double Query of Storage Buildings

**File:** `packages/core/src/systems/BuildingSystem.ts:650-727`

**Problem:** `deductResourcesFromStorage()` queries all storage buildings TWICE:
```typescript
// First query (line 650-653)
const storageBuildings = this.world.query()
  .with('building', 'inventory', 'position')
  .executeEntities();

// Later in same method, loops through storageBuildings again
for (const storage of storageBuildings) {
  for (const slot of inventory.slots) {  // Nested loop
    // ...
  }
}
```

**Impact:** O(n * m) where n = storage buildings, m = inventory slots. With 20 storages × 50 slots = 1000 iterations per resource deduction.

**Fix:**
```typescript
deductResourcesFromStorage(costs: ResourceCost[]): boolean {
  // Single query, build lookup map
  const storageBuildings = this.world.query()
    .with('building', 'inventory', 'position')
    .executeEntities();

  // Build resource availability map in single pass
  const availability = new Map<string, { storage: Entity, slot: number, count: number }[]>();

  for (const storage of storageBuildings) {
    const inventory = storage.getComponent('inventory');
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot.itemId) {
        if (!availability.has(slot.itemId)) {
          availability.set(slot.itemId, []);
        }
        availability.get(slot.itemId)!.push({ storage, slot: i, count: slot.count });
      }
    }
  }

  // Now deduct using pre-built map - O(costs.length)
  for (const cost of costs) {
    const sources = availability.get(cost.itemId);
    // ... deduct from sources
  }
}
```

---

### 1.2 Queries Inside Loops (GovernanceDataSystem)

**File:** `packages/core/src/systems/GovernanceDataSystem.ts`

**Problem:** Each governance building triggers its own entity query:
```typescript
// Line 145 - inside loop for each town hall
for (const townhall of townhalls) {
  const agents = this.world.query().with('identity').executeEntities();
  // ... process agents
}

// Line 191 - inside loop for each census bureau
for (const bureau of censusBureaus) {
  const agents = this.world.query().with('identity').executeEntities();
  // ... process agents
}
```

**Impact:** With 5 governance buildings, same query runs 5 times per tick.

**Fix:** Query once, pass to all methods:
```typescript
update(deltaTime: number): void {
  // Single query for all governance updates
  const agents = this.world.query().with('identity', 'agent').executeEntities();
  const agentsWithNeeds = this.world.query().with('agent', 'needs').executeEntities();

  this.updateTownHalls(agents);
  this.updateCensusBureaus(agents);
  this.updateHealthClinics(agentsWithNeeds);
}

private updateTownHalls(agents: Entity[]): void {
  // Use passed agents instead of querying
}
```

---

### 1.3 Linear Search with Array.includes()

**File:** `packages/core/src/systems/SocialGradientSystem.ts:78`

**Problem:**
```typescript
if (!this.pendingProcessing.includes(speakerId)) {
  this.pendingProcessing.push(speakerId);
}
```

**Impact:** O(n) search for each agent check. With 100 agents, 100 × 100 = 10,000 comparisons per tick worst case.

**Fix:** Use Set instead of Array:
```typescript
// Change from
private pendingProcessing: string[] = [];

// To
private pendingProcessing = new Set<string>();

// Usage
if (!this.pendingProcessing.has(speakerId)) {
  this.pendingProcessing.add(speakerId);
}
```

---

### 1.4 Entity Search by ID in Loop

**File:** `packages/core/src/systems/SocialGradientSystem.ts:91`

**Problem:**
```typescript
for (const speakerId of this.pendingProcessing) {
  const entity = entities.find(e => e.id === speakerId);  // O(n) search
  // ...
}
```

**Impact:** O(n × m) where n = pending speakers, m = all entities.

**Fix:** Build ID lookup map:
```typescript
// Build map once
const entityById = new Map(entities.map(e => [e.id, e]));

// O(1) lookup
for (const speakerId of this.pendingProcessing) {
  const entity = entityById.get(speakerId);
  if (!entity) continue;
  // ...
}
```

Or use `world.getEntity(speakerId)` if available.

---

### 1.5 Collision Queries Every Frame

**File:** `packages/core/src/systems/MovementSystem.ts:201-237`

**Problem:**
```typescript
// Called for EVERY moving entity, EVERY frame
private hasHardCollision(position: Position): boolean {
  const buildings = this.world.query()
    .with('building', 'position')
    .executeEntities();  // Query all buildings every call
  // ...
}
```

**Impact:** With 50 agents and 100 buildings, runs 50 × 100 = 5,000 building checks per tick.

**Fix:** Cache building positions, invalidate on building change:
```typescript
private buildingCollisionCache: Map<string, { x: number, y: number, width: number, height: number }> | null = null;
private cacheValidUntilTick = 0;

private getBuildingCollisions(): Map<string, ...> {
  if (this.buildingCollisionCache && this.world.tick < this.cacheValidUntilTick) {
    return this.buildingCollisionCache;
  }

  // Rebuild cache
  this.buildingCollisionCache = new Map();
  const buildings = this.world.query().with('building', 'position').executeEntities();
  for (const b of buildings) {
    // ... populate cache
  }
  this.cacheValidUntilTick = this.world.tick + 20; // Cache for 1 second

  return this.buildingCollisionCache;
}

// Subscribe to building events to invalidate cache
this.eventBus.on('building:complete', () => { this.buildingCollisionCache = null; });
this.eventBus.on('building:destroyed', () => { this.buildingCollisionCache = null; });
```

---

## 2. Medium Issues

### 2.1 Repeated getComponent() Calls

**File:** `packages/core/src/systems/MovementSystem.ts:45-66`

**Problem:**
```typescript
const movement = entity.getComponent('movement');
const position = entity.getComponent('position');
const velocity = entity.getComponent('velocity');
const steering = entity.getComponent('steering');
// Later...
const circadian = entity.getComponent('circadian');
const needs = entity.getComponent('needs');
```

**Fix:** Get all components once at start:
```typescript
const components = {
  movement: entity.getComponent('movement'),
  position: entity.getComponent('position'),
  velocity: entity.getComponent('velocity'),
  steering: entity.getComponent('steering'),
  circadian: entity.getComponent('circadian'),
  needs: entity.getComponent('needs'),
};
```

Or use destructuring if entity supports it:
```typescript
const { movement, position, velocity, steering } = entity.getComponents(
  'movement', 'position', 'velocity', 'steering'
);
```

---

### 2.2 Dual Filter Operations

**File:** `packages/core/src/systems/GovernanceDataSystem.ts:203-204`

**Problem:**
```typescript
const recentBirths = this.birthLog.filter(b => currentTime - b.timestamp < timeWindow).length;
const recentDeaths = this.deathLog.filter(d => currentTime - d.timestamp < timeWindow).length;
```

**Fix:** Single pass if logs can be combined, or use reduce:
```typescript
let recentBirths = 0;
let recentDeaths = 0;
const cutoff = currentTime - timeWindow;

for (const b of this.birthLog) {
  if (b.timestamp >= cutoff) recentBirths++;
}
for (const d of this.deathLog) {
  if (d.timestamp >= cutoff) recentDeaths++;
}
```

Or maintain running counts updated on birth/death events.

---

### 2.3 Array Slice Creating Copies

**File:** `packages/core/src/systems/GovernanceDataSystem.ts:98, 167-168`

**Problem:**
```typescript
this.deathLog = this.deathLog.slice(-100);  // Creates new array
const recentDeaths = [...this.deathLog];     // Another copy
```

**Fix:** Use circular buffer or limit during push:
```typescript
private readonly MAX_LOG_SIZE = 100;

recordDeath(data: DeathRecord): void {
  this.deathLog.push(data);
  if (this.deathLog.length > this.MAX_LOG_SIZE) {
    this.deathLog.shift();  // Remove oldest, no full copy
  }
}
```

---

## 3. Implementation Priority

### Phase 1: Critical (biggest impact)
1. Fix BuildingSystem double query
2. Fix GovernanceDataSystem queries in loops
3. Fix SocialGradientSystem linear search (Array → Set)
4. Fix MovementSystem collision caching

### Phase 2: Medium
5. Cache entity lookups by ID
6. Reduce repeated getComponent() calls
7. Optimize filter chains

### Phase 3: Measure
8. Add performance timing to systems
9. Profile with 100+ agents
10. Identify remaining hotspots

---

## 4. Performance Testing

Add timing to critical systems:

```typescript
update(deltaTime: number): void {
  const start = performance.now();

  // ... system logic

  const elapsed = performance.now() - start;
  if (elapsed > 1) { // More than 1ms
    console.warn(`[${this.constructor.name}] Slow update: ${elapsed.toFixed(2)}ms`);
  }
}
```

Target: Each system should complete in <1ms with 100 entities.

---

## 5. Verification

```bash
# Run game with performance monitoring
npm run dev

# In browser console:
game.enablePerformanceLogging();

# Look for warnings about slow systems
```

After fixes:
- No system should take >2ms per tick
- Frame rate should stay at 60fps with 100+ entities
- No garbage collection spikes from array allocations

---

**End of Specification**

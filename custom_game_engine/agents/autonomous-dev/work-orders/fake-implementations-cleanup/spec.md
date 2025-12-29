# Fake Implementations & Missing Integrations Cleanup

## Overview

A code review identified multiple fake implementations, stub code, and missing event integrations that undermine system reliability. This work order addresses code that appears to work but actually does nothing or uses placeholder logic.

## Core Principle: No Fake Logic

Code should do what it claims to do. If a function can't be implemented yet, it should throw `Error('Not implemented')` rather than return fake data that makes tests pass while hiding broken functionality.

---

## 1. Fake Implementations to Fix

### 1.1 PlantSystem.isTileSuitable() - CRITICAL

**File:** `packages/core/src/systems/PlantSystem.ts:814`

**Current (FAKE):**
```typescript
isTileSuitable(position: Position): boolean {
  return position.x % 2 === 0;  // Fake modulo logic
}
```

**Problem:** This makes half the tiles "suitable" based on x-coordinate parity. Tests pass but the logic is nonsense.

**Required Fix:** Implement actual tile suitability checking:
```typescript
isTileSuitable(position: Position, plantType?: string): boolean {
  const tile = this.world.getTileAt(position.x, position.y);
  if (!tile) return false;

  // Check terrain type
  const validTerrain = ['grass', 'dirt', 'tilled_soil'];
  if (!validTerrain.includes(tile.terrain)) return false;

  // Check if already occupied
  const entities = this.world.getEntitiesAt(position);
  const hasPlant = entities.some(e => e.hasComponent('plant'));
  if (hasPlant) return false;

  // Check soil quality if tilled
  if (tile.terrain === 'tilled_soil') {
    const soil = tile.getComponent('soil');
    if (soil && soil.fertility < 0.2) return false;
  }

  return true;
}
```

**Tests to Update:** Any tests relying on the modulo behavior need real tile setup.

---

### 1.2 SeedGatheringSystem - DISABLED/STUB

**File:** `packages/core/src/systems/SeedGatheringSystem.ts:42-45`

**Current:**
```typescript
update(deltaTime: number): void {
  // Disabled until ActionQueue migration is complete
  return;
}
```

**Problem:** Entire system does nothing. Comment says "disabled until ActionQueue migration" but ActionQueue exists.

**Required Fix:** Either:
1. **Implement properly** using ActionQueue pattern (preferred)
2. **Delete the file** if seed gathering is handled elsewhere
3. **Throw error** if truly not ready: `throw new Error('SeedGatheringSystem disabled - see issue #XXX')`

**Investigation Needed:** Check if seed gathering is handled by:
- `HarvestActionHandler`
- `GatherBehavior`
- `ResourceGatheringSystem`

If handled elsewhere, delete this dead code.

---

### 1.3 IngredientPanel Mock Inventory

**File:** `packages/renderer/src/IngredientPanel.ts:88`

**Current (FAKE):**
```typescript
const ingredientData = ingredients.map(ing => ({
  ...ing,
  available: 10,  // Hardcoded fake value
}));
```

**Problem:** Always shows 10 available regardless of actual inventory.

**Required Fix:**
```typescript
const ingredientData = ingredients.map(ing => {
  const inventory = this.world.getPlayerInventory();
  if (!inventory) {
    throw new Error('IngredientPanel requires player inventory');
  }
  const available = inventory.getItemCount(ing.itemId);
  return { ...ing, available };
});
```

---

### 1.4 Hardcoded Agent IDs

**Files:**
- `packages/core/src/systems/BuildingSystem.ts:145`
- `packages/core/src/actions/AnimalHousingActions.ts:221`

**Current:**
```typescript
builderId: 'system',  // Placeholder
agentId: 'system',    // Placeholder
```

**Problem:** Loses track of which agent performed actions. Breaks:
- Skill XP attribution
- Memory formation ("I built this")
- Metrics tracking

**Required Fix:** Pass actual agent ID through the call chain:
```typescript
// BuildingSystem.ts
completeConstruction(buildingId: string, builderId: string): void {
  // ...
  this.eventBus.emit('building:complete', {
    buildingId,
    builderId,  // Real agent ID
    // ...
  });
}
```

---

### 1.5 Hardcoded Metrics Values

**File:** `packages/core/src/systems/MetricsCollectionSystem.ts:158`

**Current:**
```typescript
gatherTime: 1000,  // Hardcoded - "would need actual timing"
```

**Required Fix:** Track actual gather start/end times:
```typescript
// In ResourceGatheringSystem or GatherBehavior
const startTime = performance.now();
// ... gathering logic ...
const gatherTime = performance.now() - startTime;

this.eventBus.emit('resource:gathered', {
  // ...
  gatherTime,
});
```

---

## 2. Missing Event Integrations

### 2.1 Events Emitted But Never Handled (Orphaned)

These events are emitted but no system listens to them:

| Event | Emitter | Should Be Handled By |
|-------|---------|---------------------|
| `resource:regenerated` | ResourceGatheringSystem | MetricsCollectionSystem |
| `product_ready` | AnimalHousingSystem | InventorySystem or AgentBrainSystem (trigger collection behavior) |
| `housing:dirty` | AnimalHousingSystem | AgentBrainSystem (trigger cleaning behavior) |
| `housing:full` | AnimalHousingSystem | UI notification, AgentBrainSystem (expand housing) |
| `life_stage_changed` | AnimalSystem | MetricsCollectionSystem, MemoryFormationSystem |
| `animal_state_changed` | AnimalSystem | MetricsCollectionSystem |
| `trade:buy`, `trade:sell` | TradingSystem | MetricsCollectionSystem, EconomySystem |
| `research:*` (4 events) | ResearchSystem | UI, UnlockSystem, MetricsCollectionSystem |
| `goal:achieved` | GoalGenerationSystem | MemoryFormationSystem, MetricsCollectionSystem |
| `station:fuel_low` | BuildingSystem | UI notification |
| `station:fuel_empty` | BuildingSystem | UI notification, disable station |

**Required Fixes:**

For each orphaned event, either:
1. **Add handler** in appropriate system
2. **Remove emission** if the event isn't needed
3. **Document** why no handler is needed (rare)

**Priority handlers to add:**

```typescript
// MetricsCollectionSystem - add these subscriptions
this.eventBus.on('resource:regenerated', this.handleResourceRegenerated);
this.eventBus.on('trade:buy', this.handleTrade);
this.eventBus.on('trade:sell', this.handleTrade);
this.eventBus.on('goal:achieved', this.handleGoalAchieved);
this.eventBus.on('research:completed', this.handleResearchCompleted);

// AgentBrainSystem or BehaviorRegistry - trigger behaviors
this.eventBus.on('product_ready', this.triggerCollectionBehavior);
this.eventBus.on('housing:dirty', this.triggerCleaningBehavior);
```

---

### 2.2 Events Expected But Never Emitted (Missing Emitters)

These events are subscribed to but never emitted:

| Event | Listener | Should Be Emitted By |
|-------|----------|---------------------|
| `agent:idle` | ReflectionSystem, MetricsCollectionSystem | AgentBrainSystem or IdleBehaviorSystem |
| `memory:recalled` | MemoryConsolidationSystem | LLMDecisionProcessor or ReflectionSystem |
| `time:new_week` | ReflectionSystem | TimeSystem |
| `harvest:first` | MemoryFormationSystem | HarvestActionHandler (on first harvest per agent) |
| `social:conflict` | MemoryFormationSystem | CommunicationSystem (on argument/disagreement) |
| `social:interaction` | MemoryFormationSystem | CommunicationSystem (generic social event) |
| `discovery:location` | MemoryFormationSystem | ExplorationSystem |

**Required Fixes:**

**AgentBrainSystem - emit agent:idle:**
```typescript
// When agent has no behavior and no urgent needs
if (!currentBehavior && !hasUrgentNeed) {
  this.eventBus.emit('agent:idle', {
    agentId: entity.id,
    timestamp: this.world.getCurrentTick(),
    location: position,
  });
}
```

**TimeSystem - emit time:new_week:**
```typescript
// In time progression logic
if (this.dayOfWeek === 0 && previousDayOfWeek !== 0) {
  this.eventBus.emit('time:new_week', {
    week: this.currentWeek,
    season: this.currentSeason,
  });
}
```

**HarvestActionHandler - emit harvest:first:**
```typescript
// Track first harvest per agent
const agent = this.world.getEntity(agentId);
const skills = agent.getComponent('skills');
if (!skills.hasHarvested) {
  skills.hasHarvested = true;
  this.eventBus.emit('harvest:first', {
    agentId,
    plantType,
    timestamp: this.world.getCurrentTick(),
  });
}
```

---

## 3. Placeholder Tests to Fix

### 3.1 Tests That Always Pass

**Files:**
- `packages/core/src/systems/__tests__/FertilizerAction.test.ts` (16 tests)
- `packages/core/src/systems/__tests__/WateringAction.test.ts` (3 tests)

**Pattern:**
```typescript
it('should apply fertilizer correctly', () => {
  expect(true).toBe(true); // Placeholder
});
```

**Required Fix:** Either:
1. **Implement real assertions** testing actual behavior
2. **Mark as `it.skip`** with TODO comment explaining what's needed
3. **Delete** if the test isn't needed

### 3.2 Tests That Always Fail

**File:** `packages/core/src/actions/__tests__/TillAction.test.ts` (9 tests)

**Pattern:**
```typescript
it('should validate tilling position', () => {
  expect(true).toBe(false); // Placeholder - will fail
});
```

**Problem:** These fail intentionally but provide no useful signal.

**Required Fix:** Implement or skip with clear TODO.

---

## 4. Implementation Priority

### Phase 1: Critical Fake Logic (Day 1)
1. Fix `PlantSystem.isTileSuitable()` - blocking farming gameplay
2. Resolve `SeedGatheringSystem` - delete or implement
3. Fix hardcoded agent IDs - breaking skill attribution

### Phase 2: Event Integration (Day 2)
1. Add missing event emitters (`agent:idle`, `time:new_week`, `harvest:first`)
2. Add handlers for critical orphaned events (`product_ready`, `housing:dirty`)
3. Wire up metrics for remaining orphaned events

### Phase 3: Test Cleanup (Day 3)
1. Fix or skip placeholder tests
2. Update tests that relied on fake `isTileSuitable` logic
3. Add integration tests for new event flows

### Phase 4: UI/Polish (Day 4)
1. Fix `IngredientPanel` mock inventory
2. Fix hardcoded metrics values
3. Add UI handlers for `station:fuel_low`, research events

---

## 5. Verification Checklist

Before marking complete:

- [ ] `PlantSystem.isTileSuitable()` uses real tile/terrain checks
- [ ] `SeedGatheringSystem` either works or is deleted
- [ ] No hardcoded `'system'` agent IDs remain
- [ ] `IngredientPanel` shows real inventory counts
- [ ] `agent:idle` event is emitted and handled
- [ ] `time:new_week` event is emitted
- [ ] `product_ready` triggers collection behavior
- [ ] No `expect(true).toBe(true)` placeholder tests remain
- [ ] All tests pass: `npm run test`
- [ ] Build passes: `npm run build`
- [ ] Grep for `// Placeholder` returns 0 results in non-test files

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `packages/core/src/systems/PlantSystem.ts` | Fix `isTileSuitable()` |
| `packages/core/src/systems/SeedGatheringSystem.ts` | Implement or delete |
| `packages/core/src/systems/BuildingSystem.ts` | Pass real builderId |
| `packages/core/src/actions/AnimalHousingActions.ts` | Pass real agentId |
| `packages/core/src/systems/MetricsCollectionSystem.ts` | Add event handlers, fix gatherTime |
| `packages/core/src/systems/AgentBrainSystem.ts` | Emit `agent:idle` |
| `packages/core/src/systems/TimeSystem.ts` | Emit `time:new_week` |
| `packages/core/src/actions/HarvestActionHandler.ts` | Emit `harvest:first` |
| `packages/renderer/src/IngredientPanel.ts` | Use real inventory |
| `packages/core/src/systems/__tests__/FertilizerAction.test.ts` | Fix placeholders |
| `packages/core/src/systems/__tests__/WateringAction.test.ts` | Fix placeholders |
| `packages/core/src/actions/__tests__/TillAction.test.ts` | Fix placeholders |

---

**End of Specification**

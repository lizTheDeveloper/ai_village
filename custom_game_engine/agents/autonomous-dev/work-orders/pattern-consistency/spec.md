# Pattern Consistency Cleanup

## Overview

Code review found inconsistent patterns across the codebase: missing `as const` assertions, illogical system priorities, and inconsistent error handling. This creates maintenance burden and subtle bugs.

---

## 1. Missing `as const` on Component Types

Per TypeScript best practices, component type literals should use `as const` for stricter typing.

### Components WITHOUT `as const` (16 files to fix):

| File | Line |
|------|------|
| `components/VelocityComponent.ts` | 13 |
| `components/GoalsComponent.ts` | 71 |
| `components/SocialMemoryComponent.ts` | 50 |
| `components/TrustNetworkComponent.ts` | 15 |
| `components/MemoryComponentClass.ts` | 16 |
| `components/PersonalityComponent.ts` | 20 |
| `components/SteeringComponent.ts` | 30 |
| `components/SocialGradientComponent.ts` | 28 |
| `components/JournalComponent.ts` | 26 |
| `components/BeliefComponent.ts` | 29 |
| `components/NeedsComponent.ts` | 5 |
| `components/SpatialMemoryComponent.ts` | 17 |
| `components/ExplorationStateComponent.ts` | 23 |
| `components/SemanticMemoryComponent.ts` | 56 |
| `components/EpisodicMemoryComponent.ts` | 61 |
| `components/ReflectionComponent.ts` | 28 |

### Also missing in ActionQueueClass:

| File | Line |
|------|------|
| `actions/ActionQueueClass.ts` | 13 |

**Fix pattern:**
```typescript
// Before
public readonly type = 'velocity';

// After
public readonly type = 'velocity' as const;
```

---

## 2. System Priority Issues

### 2.1 Priority Clustering at 15 (7 systems!)

These systems all have priority 15, causing undefined execution order:

- NeedsSystem
- BuildingSystem
- IdleBehaviorSystem
- CommunicationSystem
- SteeringSystem
- AnimalSystem
- SoilSystem

**Fix:** Assign distinct priorities based on logical dependencies:

```typescript
// Suggested reordering
NeedsSystem: 15        // Base needs first
SteeringSystem: 16     // Movement preparation
CommunicationSystem: 17 // Social before building
IdleBehaviorSystem: 18 // Idle after needs/movement
AnimalSystem: 19       // Animals after agents
SoilSystem: 20         // Environment
BuildingSystem: 21     // Buildings last in this group
```

### 2.2 SleepSystem Priority Contradiction

**File:** `systems/SleepSystem.ts`

- Current priority: 12
- Comment says: "run after Needs (15)"
- **Bug:** 12 runs BEFORE 15, not after

**Fix:** Change to priority 16 (after Needs at 15).

### 2.3 BuildingSystem Listed Twice

Found at both priority 15 and 16 in different comments/locations.

**Fix:** Audit BuildingSystem and set single consistent priority.

---

## 3. Error Handling Inconsistency

Some systems follow CLAUDE.md (throw on missing data), others don't.

### Systems with Silent Fallbacks (violate CLAUDE.md):

**CookingSystem.ts:192-200**
```typescript
// BAD: Returns null instead of throwing
private getRecipe(recipeId: string): Recipe | null {
  if (!this.recipeRegistry) {
    return null;  // Silent fallback
  }
  try {
    return this.recipeRegistry.getRecipe(recipeId);
  } catch {
    return null;  // Swallows ALL errors
  }
}
```

**Fix:**
```typescript
private getRecipe(recipeId: string): Recipe {
  if (!this.recipeRegistry) {
    throw new Error('[CookingSystem] RecipeRegistry not initialized');
  }
  return this.recipeRegistry.getRecipe(recipeId);
  // Let errors propagate - don't catch
}
```

**PlantSystem.ts (multiple locations):**
```typescript
// BAD: Fallback to 'unknown' hides missing data
const entityId = this.plantEntityIds.get(plant) || 'unknown';
const entityId = this.plantEntityIds.get(plant) || entity.id;
const entityId = this.plantEntityIds.get(plant) || `plant_${Date.now()}`;
```

**Fix:**
```typescript
const entityId = this.plantEntityIds.get(plant);
if (!entityId) {
  throw new Error(`[PlantSystem] Plant ${plant.speciesId} not registered in plantEntityIds`);
}
```

### Systems with CORRECT Error Handling (examples to follow):

- `BuildingSystem.ts:110-123` - Throws with context
- `AnimalSystem.ts:31-40` - Throws for missing required fields
- `ExplorationSystem.ts:39-43` - Catches, logs context, re-throws

---

## 4. Implementation Checklist

### Phase 1: Add `as const` (30 min)
- [ ] Add `as const` to all 16 component type declarations
- [ ] Add `as const` to ActionQueueClass
- [ ] Run build to verify no type errors

### Phase 2: Fix System Priorities (1 hour)
- [ ] Audit all system priorities and document dependencies
- [ ] Fix priority clustering at 15
- [ ] Fix SleepSystem priority (12 → 16)
- [ ] Resolve BuildingSystem duplicate priority
- [ ] Add comments explaining priority choices

### Phase 3: Fix Error Handling (1 hour)
- [ ] Fix CookingSystem.getRecipe() to throw
- [ ] Fix PlantSystem entityId fallbacks to throw
- [ ] Grep for `|| 'unknown'` and `|| entity.id` patterns
- [ ] Convert each to explicit null check + throw

### Verification
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Grep for `|| 'unknown'` returns 0 results in systems
- [ ] Grep for `catch { return null }` returns 0 results

---

**End of Specification**

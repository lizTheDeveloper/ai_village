# BodySystem StateMutatorSystem Audit Report

**Date:** 2026-01-21
**Status:** Read-only audit - no files modified
**Scope:** BodySystem.registerDelta() usage patterns and complexity analysis

---

## Executive Summary

BodySystem registers **6-8 distinct delta rates** per entity via StateMutatorSystem, with complex nested cleanup management and multiple lifecycle stages. The system is **moderately complex but well-structured** within the delta pattern. The approach is reasonable but could be simplified by moving some mutation metadata to a component-based approach.

---

## 1. Fields Being Mutated

### Blood/Health Fields
| Field | Component | Type | Range | Purpose |
|-------|-----------|------|-------|---------|
| `bloodLoss` | `Body` | Number | 0-100 | Active bleeding from injuries |
| `health` | `Needs` | Number | 0-100 | Health damage from blood loss (secondary) |

### Healing Fields (Per Body Part)
| Field | Component | Type | Range | Purpose |
|-------|-----------|------|-------|---------|
| `parts.{partId}.health` | `Body` | Number | 0-maxHealth | Natural healing of body part |
| `parts.{partId}.injuries.{i}.healingProgress` | `Body` | Number | 0-100 | Healing progress of specific injury |

**Note:** These are deeply nested field mutations (e.g., `parts.left_arm_1.health`, `parts.left_arm_1.injuries.0.healingProgress`). StateMutatorSystem handles this via string-based field paths.

### Other Components Updated
- `Mood` (via `applyPainToStress()` - not delta-based)
- `Animal.stress` (direct update, not delta-based)

---

## 2. Delta Rates Registered

### Blood Loss/Recovery Deltas (1-2 per entity)

#### Case A: Active Bleeding (`totalBleedRate > 0`)
```typescript
// Delta 1: Blood loss accumulation
registerDelta({
  field: 'bloodLoss',
  deltaPerMinute: totalBleedRate * 60,  // Per-second → per-minute conversion
  min: 0,
  max: 100,
  source: 'body_blood_loss',
})

// Delta 2: Health damage (IF bloodLoss > 50)
registerDelta({
  field: 'health' (on Needs component),
  deltaPerMinute: -((body.bloodLoss - 50) * 0.02 * 60),
  min: 0,
  max: 100,
  source: 'body_bleed_damage',
})
```

**Rates:**
- Bleed rate accumulates per injury (e.g., 0.1 + 0.05 = 0.15 per-second)
- Blood loss per minute: `bleedRate * 60`
- Health damage per minute (when bleeding heavily): `(bloodLoss - 50) * 0.02 * 60 = (bloodLoss - 50) * 1.2`

#### Case B: Blood Recovery (no active bleeding)
```typescript
// Delta: Natural recovery at 0.5 per second
registerDelta({
  field: 'bloodLoss',
  deltaPerMinute: -(0.5 * 60) = -30,  // Constant recovery rate
  min: 0,
  max: 100,
  source: 'body_blood_recovery',
})
```

### Healing Deltas (Variable: 2 × number of injured parts)

#### Per Body Part Health
```typescript
registerDelta({
  field: `parts.${partId}.health`,
  deltaPerMinute: 0.1 * healingMultiplier * 60,  // ~6 HP/minute base
  min: 0,
  max: part.maxHealth,
  source: `body_part_healing_${partId}`,
})
```

**Base rate:** 0.1 HP/second → 6 HP/game minute
**Healing multiplier** (lines 217-222):
- Hungry (hunger < 30): ×0.5
- Tired (energy < 30): ×0.5
- Resting (energy < 20): ×2.0
- Heavy blood loss (bloodLoss > 30): ×0.5
- **Example:** Resting + well-fed = 6 × 2.0 = 12 HP/minute

#### Per Injury Healing Progress
```typescript
registerDelta({
  field: `parts.${partId}.injuries.${i}.healingProgress`,
  deltaPerMinute: (1.0 / 3600) * healingMultiplier * 60 * 100,  // ~1.67% per minute
  min: 0,
  max: 100,
  source: `body_injury_healing_${injuryKey}`,
})
```

**Base rate:** 1% per in-game hour → 1.67% per game minute
**Applied with same healing multiplier**

---

## 3. Delta Lifecycle: Registration & Cleanup

### Timeline

#### Initialization
1. **BodySystem constructor**: Initializes empty cleanup maps
   ```typescript
   private deltaCleanups = new Map<string, {
     bloodLoss?: () => void;
     bloodRecovery?: () => void;
     healthDamage?: () => void;
   }>();

   private healingCleanups = new Map<string, {
     partHealing: Map<string, () => void>;
     injuryHealing: Map<string, () => void>;
   }>();
   ```

2. **BodySystem.setStateMutatorSystem()**: Stores reference to StateMutatorSystem

#### Per-Tick Execution (Priority 13, throttled to 1200 ticks)

**Entry Point:** `onUpdate(ctx)` (lines 67-111)

```
Tick condition: (currentTick - lastDeltaUpdateTick) >= DELTA_UPDATE_INTERVAL
Last update stored in: lastDeltaUpdateTick
```

**Step 1: Old Cleanup** (called once per game minute)
```
updateBloodLossDeltas():
  ↓ (lines 128-133)
  Get old cleanups: this.deltaCleanups.get(entity.id)
  Call: cleanups.bloodLoss?.()
  Call: cleanups.bloodRecovery?.()
  Call: cleanups.healthDamage?.()
  ↓ (lines 225-234)
updateHealingDeltas():
  Get old cleanups: this.healingCleanups.get(entity.id)
  Call each: cleanup() in partHealing.values()
  Call each: cleanup() in injuryHealing.values()
```

**Step 2: Register New Deltas**
```
updateBloodLossDeltas():
  Calculate totalBleedRate from all injuries (lines 142-150)
  ↓
  If totalBleedRate > 0:
    Register bloodLoss delta (lines 158-166)
    If bloodLoss > 50, register healthDamage delta (lines 174-182)
  Else:
    Register bloodRecovery delta (lines 189-197)
  ↓
  Store cleanup functions: this.deltaCleanups.set(entity.id, {})

updateHealingDeltas():
  For each body part (lines 240-284):
    If not infected && health < maxHealth:
      Register part health delta (lines 249-257)
      Store cleanup in partHealingCleanups map
    For each injury:
      Register injury healing progress delta (lines 272-280)
      Store cleanup in injuryHealingCleanups map
  ↓
  Store all cleanups: this.healingCleanups.set(entity.id, {...})
```

**Step 3: Process Real Healing Logic** (every throttle interval)
```
processNaturalHealing():
  For each body part:
    For each injury:
      If healingProgress >= 100:
        Remove injury from part.injuries
        Restore part health based on injury severity (5-60 HP)
```

### Cleanup Triggers

#### Explicit Cleanup (Automatic)
1. **Per-minute updates:** Old deltas cleaned up before new ones registered
2. **Entity death:** Deltas implicitly expire (no entity cleanup in BodySystem itself)
3. **Component removal:** StateMutatorSystem cleans up deltas if component missing

#### Implicit Cleanup (in StateMutatorSystem)
- **Expired deltas:** Removed after `expiresAtTick` or `totalAmount` exhausted
- **Entity deletion:** All deltas removed when entity not found

---

## 4. Component Types Being Updated

| Component Type | Fields Modified | Update Mechanism | Frequency |
|---|---|---|---|
| `CT.Body` | `bloodLoss`, `parts.{id}.health`, `parts.{id}.injuries.{i}.healingProgress` | StateMutatorSystem.registerDelta() | Every game minute (1200 ticks) |
| `CT.Needs` | `health` | StateMutatorSystem.registerDelta() | Every game minute (if bleeding heavily) |
| `CT.Mood` | `factors.physical` | Direct update via `comps.update()` | Every throttle interval (100 ticks) |
| `CT.Animal` | `stress` | Direct assignment | Every throttle interval (100 ticks) |

---

## 5. Complexity Analysis

### What's Complex

#### 1. Two-Level Cleanup Maps
```typescript
// Blood/health cleanups (simple map)
private deltaCleanups = new Map<string, {
  bloodLoss?: () => void;
  bloodRecovery?: () => void;
  healthDamage?: () => void;
}>();

// Healing cleanups (nested maps)
private healingCleanups = new Map<string, {
  partHealing: Map<string, () => void>;           // partId → cleanup
  injuryHealing: Map<string, () => void>;         // "partId:injuryIndex" → cleanup
}>();
```

**Issue:** Two different cleanup structures for similar use cases:
- Blood/health = flat object with optional fields
- Healing = nested maps with composite keys

**Cognitive load:** Need to maintain both patterns, understand why they differ

#### 2. Dynamic Delta Count Per Entity
```
Minimum deltas: 1 (blood loss OR recovery)
Maximum deltas: 2 + (N * M)
  where N = number of body parts
  and M = average injuries per part

Example: Humanoid with 6 parts, 2 injuries each = 2 + (6 * 2) = 14 deltas
```

**Issue:** Unbounded delta count as injuries accumulate. Large injury cases could create 30+ deltas per entity.

#### 3. String-Based Field Paths
```typescript
field: `parts.${partId}.health`
field: `parts.${partId}.injuries.${i}.healingProgress`
```

**Issue:** No type safety. Misspelled field names only caught at runtime when StateMutatorSystem tries `hasNumericField()`.

#### 4. Conditional Delta Registration
```typescript
if (totalBleedRate > 0) {
  // Register bloodLoss delta
  if (body.bloodLoss > 50) {
    // Additionally register healthDamage delta
  }
} else if (body.bloodLoss > 0) {
  // Register bloodRecovery delta
}
```

**Issue:** Three competing branches makes it unclear when exactly 1 vs 2 deltas are active. `bloodLoss && bloodRecovery` can't both be true (mutually exclusive), but not immediately obvious from code structure.

#### 5. Manual State Tracking
```typescript
private lastDeltaUpdateTick = 0;  // Must manually track when deltas were last updated
```

**Issue:** Responsibility split between BodySystem (tracking) and StateMutatorSystem (applying). Easy to get out of sync if throttle intervals differ.

---

## 6. Could This Be Simplified with MutationVectorComponent?

### Proposed Alternative: Per-Entity Mutation Vector Component

Instead of registering deltas in BodySystem and tracking them in StateMutatorSystem, store mutation metadata on the entity itself:

```typescript
// New component (example structure)
interface MutationVectorComponent extends Component {
  type: 'mutation_vector';

  // Active mutations per field
  mutations: Map<string, {
    deltaPerMinute: number;
    min?: number;
    max?: number;
    source: string;
    expiresAtTick?: number;
  }>;
}
```

### Advantages

1. **Locality:** Mutation metadata lives on the entity being mutated
2. **Visibility:** No hidden cleanup function maps scattered across BodySystem
3. **Query-friendly:** Can find all entities with mutations via `world.query().with(CT.MutationVector)`
4. **Debugging:** DevPanel can directly inspect entity.getComponent('mutation_vector').mutations
5. **Entity lifecycle:** Mutations automatically cleaned up when entity deleted

### Disadvantages

1. **Overhead:** Every entity with mutations carries additional component
2. **Fragmentation:** Splits Body mutation logic across two components
   - Body = what changed
   - MutationVector = how it's changing
3. **Retroactive change:** Would require migrating existing BodySystem architecture
4. **Complexity increase:** Adding new component type is bigger change than refactoring registration

### Recommendation

**Keep current architecture** for these reasons:

1. **Performance acceptable:** Delta cleanup pattern is O(N) on number of active mutations, which is fine for typical injury counts (2-5 per agent)

2. **Single responsibility intact:** BodySystem owns body mutations, StateMutatorSystem handles all rate-based updates uniformly

3. **Works with NeedsSystem pattern:** BodySystem's delta management mirrors NeedsSystem's (`lines 45-51`), indicating architectural consistency

4. **Better separation:** Keeps mutation registration logic in BodySystem rather than spreading across components

**Caveat:** If delta count explodes (e.g., >30 mutations per entity in endgame scenarios), consider refactoring to MutationVectorComponent.

---

## 7. Issues & Recommendations

### Issue 1: Unbounded Delta Count (Medium Priority)

**Problem:** Number of deltas grows linearly with injuries. Large injury cases (10+ injuries) create 20+ deltas.

**Current behavior:**
```
6 body parts × 3 injuries avg = 6 + (6 × 3) = 24 deltas
(1 blood loss + 1 health damage + 6 part healing + 18 injury healing)
```

**Recommendation:** Consider injury batching or max damage cap:
- Cap injuries per part at N=5 (excess injury severity replaces older ones)
- OR: Register single "aggregate injury" delta instead of per-injury deltas

### Issue 2: Conditional Bloodloss/Recovery Logic (Low Priority)

**Problem:** Three-way branching makes control flow ambiguous.

**Current code (lines 152-198):**
```typescript
if (totalBleedRate > 0) {
  // Branch A: Bleeding
  registerDelta(bloodLoss)
  if (body.bloodLoss > 50) {
    registerDelta(healthDamage)  // Nested condition!
  }
} else if (body.bloodLoss > 0) {
  // Branch B: Recovery
  registerDelta(bloodRecovery)
}
// No explicit handling if totalBleedRate === 0 AND bloodLoss === 0
```

**Recommendation:** Flatten logic with explicit states:
```typescript
// Case 1: Currently bleeding
if (totalBleedRate > 0) { registerDelta(bloodLoss); }
// Case 2: Health penalty from heavy bleeding (independent of active bleeding)
if (body.bloodLoss > 50) { registerDelta(healthDamage); }
// Case 3: Blood recovery
if (totalBleedRate === 0 && body.bloodLoss > 0) { registerDelta(bloodRecovery); }
```

### Issue 3: String-Based Field Paths (Medium Priority)

**Problem:** Type unsafety for deeply nested fields like `parts.left_arm_1.injuries.0.healingProgress`

**Current handling:**
```typescript
if (!hasNumericField(component, delta.field)) {
  console.warn(`Field ${delta.field} on ${componentType} is not a number...`);
}
```

**Recommendation:** Add compile-time validation (optional):
- Create `BodyFieldPath` type union of valid field names
- Use discriminated unions for part/injury paths
- Example: `'bloodLoss' | `parts.${string}.health` | `parts.${string}.injuries.${number}.healingProgress``

### Issue 4: No Entity Cleanup Hook (Low Priority)

**Problem:** When entity dies, BodySystem doesn't explicitly clean up its maps.

**Current behavior:**
- Maps keep stale entries indefinitely
- StateMutatorSystem cleans up deltas when entity missing
- But BodySystem's cleanup maps remain populated

**Recommendation:** Add cleanup on entity death:
```typescript
// In onUpdate or as event listener
if (hasDestroyedVitalParts(body)) {
  this.deltaCleanups.delete(entity.id);
  this.healingCleanups.delete(entity.id);
}
```

### Issue 5: Healing Multiplier State Not Cached (Low Priority)

**Problem:** Healing multiplier recalculated from Needs/rest state every minute.

**Current pattern:**
```typescript
if (needs) {
  if (needs.hunger < 30) healingMultiplier *= 0.5;
  if (needs.energy < 30) healingMultiplier *= 0.5;
}
```

**Impact:** Low—recalculation is O(1), runs once per game minute, only 1-2 entities visible.

**No action needed** unless profiling shows this is bottleneck.

---

## 8. Comparative Analysis: BodySystem vs NeedsSystem

| Aspect | BodySystem | NeedsSystem | Notes |
|---|---|---|---|
| **Deltas per entity** | 2-24 (variable) | 2 (constant) | Body has injury variation |
| **Cleanup complexity** | 2-level nested maps | Simple object | NeedsSystem is simpler |
| **Update frequency** | 1200 ticks | 1200 ticks | Same throttle |
| **Field paths** | Nested strings | Simple fields | Body more complex |
| **Conditional branches** | 3 (bleeding logic) | 2 (sleep/activity) | Body slightly more complex |
| **Type safety** | None | None | Both use string paths |

**Verdict:** BodySystem follows NeedsSystem pattern with expected additional complexity due to injuries.

---

## Summary Table

| Category | Finding |
|---|---|
| **Fields Mutated** | bloodLoss, health (Needs), parts.*.health, parts.*.injuries.*.healingProgress |
| **Delta Rates** | Bleed: 0-rate × 60/min, Health damage: (bloodLoss-50) × 1.2/min, Healing: 6/min (modified), Injury healing: 1.67%/min |
| **Registration** | Every 1200 ticks (game minute), with cleanup-register cycle |
| **Components** | Body, Needs (secondary), Mood, Animal (pain-based direct updates) |
| **Complexity** | Moderate: 2-level cleanup maps, variable delta count, 3-branch bleed logic |
| **Simplification Potential** | Low—MutationVectorComponent would add complexity; current pattern acceptable |
| **Major Issues** | Issue #1 (unbounded deltas), Issue #2 (bleed logic clarity) |
| **Performance** | Good—O(N) cleanup, ~6 parts × ~3 injuries = ~24 deltas max typical case |

---

## Code Locations

**Primary files analyzed:**
- `/packages/core/src/systems/BodySystem.ts` — Lines 1-610
- `/packages/core/src/systems/StateMutatorSystem.ts` — Lines 1-340
- `/packages/core/src/systems/NeedsSystem.ts` — Lines 1-250 (comparative)
- `/packages/core/src/types/ComponentType.ts` — Line 155 (CT.Body)

**Related components:**
- `/packages/core/src/components/BodyComponent.ts` — Body structure, injury types
- `/packages/core/src/components/NeedsComponent.ts` — Referenced for health mutation

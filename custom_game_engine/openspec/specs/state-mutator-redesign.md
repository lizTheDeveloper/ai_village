# StateMutatorSystem Redesign Specification

## Implementation Status: COMPLETE ✅

**Completed:** January 2026

All phases of this redesign have been implemented:
- Phase 1: MutationVectorComponent created for entity-local storage
- Phase 2: StateMutatorSystem refactored to use per-tick direct mutation
- Phase 3: All 12+ systems migrated to new `setMutationRate()` API
- Phase 4: Legacy `registerDelta()` API removed

The legacy API (`registerDelta()`, `setStateMutatorSystem()`, cleanup functions) has been fully removed.

## Problem Statement

The current `StateMutatorSystem` was intended to be a **computation and GC pressure alleviator** but was implemented incorrectly. Instead of reducing allocations and enabling smooth per-tick updates, it:

1. **Runs only once per minute** (`throttleInterval = 1200`) instead of every tick
2. **Uses external Map** for delta storage instead of entity-local component
3. **Calls `getEntity()`** every update - expensive world lookup
4. **Calls `updateComponent()`** creating new objects - GC pressure
5. **Requires manual cleanup functions** - complexity overhead

## Audit Summary

### Systems Currently Using StateMutatorSystem (12+)

| System | Fields Mutated | Update Interval | Cleanup Funcs/Entity |
|--------|---------------|-----------------|---------------------|
| NeedsSystem | hunger, energy | 1200 ticks | 2 |
| AnimalSystem | hunger, thirst, energy, age, stress | 1200 ticks | 5 |
| BodySystem | blood, health | 1200 ticks | 2-5 |
| SleepSystem | sleepDrive, energy | 1200 ticks | 2 |
| TemperatureSystem | health | 1200 ticks | 1 (conditional) |
| FireSpreadSystem | health | 100 ticks | 1 |
| BuildingMaintenanceSystem | condition | 3600 ticks | 1 |
| AssemblyMachineSystem | progress | 1200 ticks | 1 |
| AfterlifeNeedsSystem | coherence, tether, solitude, peace | 1200 ticks | 4 |
| AgentSwimmingSystem | oxygen, health | 40 ticks | 3 |
| ResourceGatheringSystem | amount | 1200 ticks | 1 |
| Magic (HoT/DoT) | health, mana, stamina | N/A (spell-based) | 1-6 |

### Previous Architecture (Replaced)

```
┌─────────────────┐     registerDelta()      ┌─────────────────────────┐
│   NeedsSystem   │ ──────────────────────►  │   StateMutatorSystem    │
│   AnimalSystem  │                          │                         │
│   BodySystem    │  (external Map storage)  │  Map<entityId, delta[]> │
│   SleepSystem   │                          │                         │
│   ...12+ more   │                          │  throttle = 1200 ticks  │
└─────────────────┘                          └───────────┬─────────────┘
                                                         │
                                              Every 60 seconds:
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │  for each entityId:   │
                                             │    getEntity()  ← GC! │
                                             │    updateComponent()  │
                                             │         ↑ GC!         │
                                             └───────────────────────┘
```

**Problems:**
- `throttleInterval = 1200` means values jump once per minute (not smooth)
- `getEntity()` lookup every update = O(1) but still overhead
- `updateComponent()` creates new object every time = GC pressure
- External Map requires manual cleanup function tracking

## New Architecture (Implemented)

The original vision was for **one component per entity** that stores mutation rates, with the system running **every tick** doing simple math:

```
┌─────────────────┐     Update component      ┌─────────────────────────┐
│   NeedsSystem   │ ──────────────────────►  │   MutationVectorComponent │
│   AnimalSystem  │   (set rates directly)   │   (ON THE ENTITY)        │
│   BodySystem    │                          │                          │
│   ...           │                          │   hunger: { rate, deriv }│
└─────────────────┘                          │   energy: { rate, deriv }│
                                             │   health: { rate, deriv }│
                                             └───────────┬──────────────┘
                                                         │
                                              StateMutatorSystem
                                              throttle = 0 (EVERY TICK)
                                                         │
                                                         ▼
                                             ┌───────────────────────────┐
                                             │  for entity of entities:  │
                                             │    mv = entity.mutation   │
                                             │    mv.hunger.value +=     │
                                             │      mv.hunger.rate * dt  │
                                             │    mv.hunger.rate +=      │
                                             │      mv.hunger.deriv * dt │
                                             │  (NO getEntity!)          │
                                             │  (NO updateComponent!)    │
                                             │  (NO allocations!)        │
                                             └───────────────────────────┘
```

**Benefits:**
- Runs every tick = smooth interpolation
- No `getEntity()` calls = no world lookups
- No `updateComponent()` = no object allocations
- Derivative support = effects can decay naturally
- Entity-local storage = no external Map, no cleanup functions

## Implemented Design

### 1. MutationVectorComponent

```typescript
/**
 * Stores mutation rates for continuous value changes.
 * Located ON the entity - no external Map needed.
 */
export interface MutationVectorComponent {
  type: 'mutation_vector';
  version: 1;

  fields: {
    [fieldPath: string]: MutationField;
  };
}

export interface MutationField {
  /** Current rate of change per second */
  rate: number;

  /** Rate of change of rate per second (for decay/acceleration) */
  derivative: number;

  /** Minimum bound (optional) */
  min?: number;

  /** Maximum bound (optional) */
  max?: number;

  /** Source system for debugging */
  source: string;

  /** Tick at which this mutation expires (optional) */
  expiresAt?: number;

  /** Total amount to apply before expiring (optional, for bandages/potions) */
  totalAmount?: number;

  /** Amount applied so far (tracked internally) */
  appliedAmount?: number;
}
```

### 2. Refactored StateMutatorSystem

```typescript
export class StateMutatorSystem extends BaseSystem {
  public readonly id = 'state_mutator';
  public readonly priority = 5; // Early, before systems read values

  // EVERY TICK - this is the whole point!
  protected readonly throttleInterval = 0;

  // Only process entities with mutation vectors
  public readonly requiredComponents = [CT.MutationVector] as const;

  protected onUpdate(ctx: SystemContext): void {
    const dt = ctx.deltaTime; // Seconds since last tick
    const tick = ctx.tick;

    // Iterate entities directly - no getEntity() calls
    for (const entity of ctx.entities) {
      const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
      if (!mv) continue;

      const expiredFields: string[] = [];

      for (const [fieldPath, field] of Object.entries(mv.fields)) {
        // Apply rate
        const delta = field.rate * dt;

        // Apply to target field (e.g., "needs.hunger")
        this.applyDelta(entity, fieldPath, delta, field.min, field.max);

        // Apply derivative (rate decay)
        field.rate += field.derivative * dt;

        // Track totalAmount expiration
        if (field.totalAmount !== undefined) {
          field.appliedAmount = (field.appliedAmount ?? 0) + Math.abs(delta);
          if (field.appliedAmount >= field.totalAmount) {
            expiredFields.push(fieldPath);
          }
        }

        // Check tick expiration
        if (field.expiresAt !== undefined && tick >= field.expiresAt) {
          expiredFields.push(fieldPath);
        }

        // Check if rate has decayed to negligible
        if (Math.abs(field.rate) < 0.0001 && field.derivative === 0) {
          expiredFields.push(fieldPath);
        }
      }

      // Remove expired fields (mutate in place - no new object)
      for (const path of expiredFields) {
        delete mv.fields[path];
      }
    }
  }

  /**
   * Apply delta to a nested field path like "needs.hunger"
   * Uses direct mutation - no updateComponent() allocation
   */
  private applyDelta(
    entity: Entity,
    fieldPath: string,
    delta: number,
    min?: number,
    max?: number
  ): void {
    const parts = fieldPath.split('.');
    const componentType = parts[0] as ComponentType;
    const fieldName = parts.slice(1).join('.');

    const component = entity.getComponent(componentType);
    if (!component) return;

    // Direct mutation - no new object created
    let current = component as any;
    const pathParts = fieldName.split('.');
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
      if (!current) return;
    }

    const finalField = pathParts[pathParts.length - 1];
    let newValue = (current[finalField] ?? 0) + delta;

    // Apply bounds
    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);

    current[finalField] = newValue;
  }
}
```

### 3. Helper Functions for Systems

```typescript
/**
 * Set a mutation rate on an entity.
 * Creates MutationVectorComponent if needed.
 */
export function setMutationRate(
  entity: Entity,
  fieldPath: string,
  rate: number,
  options?: {
    derivative?: number;
    min?: number;
    max?: number;
    source?: string;
    expiresAt?: number;
    totalAmount?: number;
  }
): void {
  let mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);

  if (!mv) {
    mv = { type: CT.MutationVector, version: 1, fields: {} };
    entity.addComponent(mv);
  }

  mv.fields[fieldPath] = {
    rate,
    derivative: options?.derivative ?? 0,
    min: options?.min,
    max: options?.max,
    source: options?.source ?? 'unknown',
    expiresAt: options?.expiresAt,
    totalAmount: options?.totalAmount,
  };
}

/**
 * Clear a mutation rate.
 */
export function clearMutationRate(entity: Entity, fieldPath: string): void {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  if (mv?.fields[fieldPath]) {
    delete mv.fields[fieldPath];
  }
}

/**
 * Get current mutation rate for a field.
 */
export function getMutationRate(entity: Entity, fieldPath: string): number {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  return mv?.fields[fieldPath]?.rate ?? 0;
}
```

### 4. Migration Example: NeedsSystem

**Before (current):**
```typescript
// Every game minute, register/cleanup deltas
if (shouldUpdateRates) {
  // Clean up old
  const old = this.deltaCleanups.get(entity.id);
  old?.hunger();
  old?.energy();

  // Register new with external system
  const hungerCleanup = this.stateMutator.registerDelta({
    entityId: entity.id,
    componentType: CT.Needs,
    field: 'hunger',
    deltaPerMinute: -0.0008,
    min: 0,
    max: 1,
    source: 'needs_system'
  });

  // Store cleanup function
  this.deltaCleanups.set(entity.id, { hunger: hungerCleanup, ... });
}
```

**After (proposed):**
```typescript
// Whenever rate changes (state change, not every minute)
if (hungerRateChanged) {
  setMutationRate(entity, 'needs.hunger', -0.0008 / 60, {
    min: 0,
    max: 1,
    source: 'needs_system'
  });
}
// No cleanup needed - component lives with entity
// No throttling needed - StateMutatorSystem applies every tick
```

## Migration Plan

### Phase 1: Add MutationVectorComponent
1. Create `MutationVectorComponent` type
2. Add to ComponentType enum
3. Add helper functions

### Phase 2: Refactor StateMutatorSystem
1. Change `throttleInterval` to 0
2. Add `requiredComponents = [CT.MutationVector]`
3. Implement direct mutation (no updateComponent)
4. Keep `registerDelta()` as legacy adapter during migration

### Phase 3: Migrate Systems (incremental)
Priority order based on frequency and complexity:
1. NeedsSystem (high frequency, simple fields)
2. AnimalSystem (high frequency, 5 fields)
3. SleepSystem (high frequency, 2 fields)
4. BodySystem (medium frequency, complex)
5. AgentSwimmingSystem (conditional, 3 fields)
6. TemperatureSystem (conditional, 1 field)
7. FireSpreadSystem (high frequency damage)
8. BuildingMaintenanceSystem (low frequency)
9. AssemblyMachineSystem (low frequency)
10. AfterlifeNeedsSystem (4 fields)
11. ResourceGatheringSystem (low frequency)
12. Magic HoT/DoT (complex, spell-based)

### Phase 4: Remove Legacy
1. Remove `registerDelta()` API
2. Remove internal Map storage
3. Remove cleanup function tracking

## Performance Comparison

| Metric | Current | Proposed |
|--------|---------|----------|
| Update frequency | 1/minute | 20/second |
| getEntity() calls | N per update | 0 |
| updateComponent() calls | N per update | 0 |
| Object allocations | N per update | 0 |
| Cleanup functions tracked | ~5N | 0 |
| External Map entries | N | 0 |
| Value smoothness | Jumpy (60s) | Smooth |

Where N = number of entities with mutations.

## Risks and Mitigations

### Risk 1: Direct mutation breaks reactivity
**Mitigation:** Components already allow direct mutation. If reactivity is needed, add explicit dirty flags.

### Risk 2: Field path strings are error-prone
**Mitigation:** Create typed field path constants:
```typescript
const FIELD_PATHS = {
  NEEDS_HUNGER: 'needs.hunger',
  NEEDS_ENERGY: 'needs.energy',
  // ...
} as const;
```

### Risk 3: Magic effects need duration/dispel
**Mitigation:** `expiresAt` and `totalAmount` fields support this. Dispel = delete field from component.

### Risk 4: Multiple systems affecting same field
**Mitigation:** Fields can have multiple sources by using composite field paths or accumulating rates. StateMutatorSystem processes all in order.

## Success Criteria

1. **Zero GC pressure** from mutation application
2. **Smooth interpolation** - values change every tick, not jumping
3. **Simpler system code** - no cleanup function tracking
4. **Better debuggability** - mutation rates visible on entity
5. **Performance improvement** - reduced CPU from avoiding getEntity/updateComponent

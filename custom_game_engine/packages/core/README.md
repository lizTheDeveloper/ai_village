# @ai-village/core

Core ECS (Entity Component System) architecture and game systems for the AI Village game engine.

## Architecture

This package contains the foundational systems that power the game:
- Entity-Component-System (ECS) architecture
- System registry and execution
- Event bus for decoupled communication
- Component definitions
- Game systems (AI, physics, needs, etc.)

## Performance Pattern: StateMutatorSystem

**The StateMutatorSystem provides batched vector updates for gradual state changes, achieving 60-1200× performance improvements.**

### The Problem

Many game systems need to apply small, predictable changes every tick:
- **NeedsSystem**: Hunger/energy decay (updates 20 times per second)
- **BuildingMaintenanceSystem**: Building condition decay
- **PlantSystem**: Plant growth and aging
- **AnimalSystem**: Hunger/thirst/energy changes

Updating these every tick is expensive and unnecessary for gradual changes.

### The Solution: Batched Vector Updates

Instead of updating every tick, systems register **delta rates** (change per game minute) and `StateMutatorSystem` applies them in batches.

```typescript
// ❌ OLD: Update every tick (20 TPS)
update(world, entities, deltaTime) {
  for (const agent of agents) {
    agent.hunger -= 0.0008 * deltaTime;  // Tiny change every tick
  }
}
// 100 agents × 20 updates/sec = 2000 updates/sec

// ✅ NEW: Register delta rate (update once per game minute)
update(world, entities, deltaTime) {
  if (currentTick - lastUpdate >= 1200) { // Once per minute
    for (const agent of agents) {
      stateMutator.registerDelta({
        entityId: agent.id,
        field: 'hunger',
        deltaPerMinute: -0.0008,  // Rate per game minute
        min: 0, max: 1,
      });
    }
  }
}
// 100 agents × 1 update/60sec = 1.67 updates/sec (60× reduction)
```

### Performance Impact

**For 100 agents with hunger + energy:**
- **Before:** 4,000 field updates/sec
- **After:** 3.33 field updates/sec
- **Reduction:** 1,200× fewer updates

**System overhead:**
- Needs system: Every tick → Once per minute (60× reduction)
- StateMutatorSystem: Negligible (batches all deltas once per minute)

### Adopted Systems

1. **NeedsSystem** - Agent hunger/energy decay
2. **BuildingMaintenanceSystem** - Building condition decay
3. **AnimalSystem** - Animal needs, aging, and lifecycle
4. **PlantSystem** - Plant hydration/age/health decay
5. **TemperatureSystem** - Health damage from dangerous temperatures
6. **BodySystem** - Blood loss/recovery and injury/part healing (nested deltas)
7. **SleepSystem** - Sleep drive accumulation/depletion and energy recovery
8. **AfterlifeNeedsSystem** - Spiritual needs decay for souls in the Underworld (coherence, tether, solitude, peace)

### Usage Guide

#### 1. System Setup

Add dependency and reference:

```typescript
import type { StateMutatorSystem } from './StateMutatorSystem.js';

export class MySystem implements System {
  public readonly dependsOn = ['state_mutator'] as const;
  private stateMutator: StateMutatorSystem | null = null;
  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute
  private deltaCleanups = new Map<string, () => void>();

  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }
}
```

#### 2. Register Deltas

Update rates periodically (e.g., once per game minute):

```typescript
update(world: World, entities: ReadonlyArray<Entity>) {
  if (!this.stateMutator) {
    throw new Error('[MySystem] StateMutatorSystem not set');
  }

  const shouldUpdateRates = world.tick - this.lastUpdateTick >= this.UPDATE_INTERVAL;

  for (const entity of entities) {
    if (shouldUpdateRates) {
      // Clean up old delta
      if (this.deltaCleanups.has(entity.id)) {
        this.deltaCleanups.get(entity.id)!();
      }

      // Register new delta rate
      const cleanup = this.stateMutator.registerDelta({
        entityId: entity.id,
        componentType: CT.MyComponent,
        field: 'myField',
        deltaPerMinute: -0.05,  // Decay rate per game minute
        min: 0,
        max: 100,
        source: 'my_system',
      });

      this.deltaCleanups.set(entity.id, cleanup);
    }
  }

  if (shouldUpdateRates) {
    this.lastUpdateTick = world.tick;
  }
}
```

#### 3. Wire Up in registerAllSystems

```typescript
// In registerAllSystems.ts
const stateMutator = new StateMutatorSystem();
gameLoop.systemRegistry.register(stateMutator);

const mySystem = new MySystem();
mySystem.setStateMutatorSystem(stateMutator);
gameLoop.systemRegistry.register(mySystem);
```

### Advanced Features

#### Expiration (Buffs, Bandages, Potions)

**Time-based expiration:**
```typescript
registerDelta({
  entityId: agent.id,
  field: 'speed',
  deltaPerMinute: 0,  // Instant effect
  expiresAtTick: world.tick + (1200 * 5),  // 5 game minutes
  source: 'speed_buff',
});
```

**Amount-based expiration:**
```typescript
registerDelta({
  entityId: agent.id,
  field: 'hp',
  deltaPerMinute: +10,
  totalAmount: 20,  // Expires after 20 hp healed
  source: 'bandage',
});
```

#### Dynamic Rates

Update rates when conditions change:

```typescript
// Base energy decay
let energyDecay = -0.0003;  // Idle

// Activity-based modification
if (agent.behavior === 'gather') {
  energyDecay = -0.0008;  // Working
} else if (agent.isRunning) {
  energyDecay = -0.0012;  // Running
}

// Register updated rate
stateMutator.registerDelta({
  entityId: agent.id,
  field: 'energy',
  deltaPerMinute: energyDecay,
  min: 0, max: 1,
  source: 'needs_energy_decay',
});
```

#### UI Interpolation

Get smooth interpolated values between batch updates:

```typescript
// In NeedsSystem
getInterpolatedValue(
  world: World,
  entityId: string,
  field: 'hunger' | 'energy',
  currentValue: number
): number {
  if (!this.stateMutator) return currentValue;

  return this.stateMutator.getInterpolatedValue(
    entityId,
    CT.Needs,
    field,
    currentValue,
    world.tick
  );
}

// In UI code
const needsSystem = world.systemRegistry.get('needs') as NeedsSystem;
const displayHunger = needsSystem.getInterpolatedValue(
  world,
  agent.id,
  'hunger',
  needs.hunger
);
hungerBar.setProgress(displayHunger); // Smooth animation!
```

### When to Use StateMutatorSystem

✅ **Good candidates:**
- Slow, predictable changes (needs decay, passive regeneration)
- Effects that accumulate (damage over time, buffs/debuffs)
- Many entities with similar rates (100+ agents)
- Non-critical timing (UI updates can be delayed by 1 minute)

❌ **Bad candidates:**
- Instant changes (taking damage from attack - apply immediately!)
- Critical game logic (agent death checks - need immediate response)
- Irregular patterns (random events - can't predict rate)
- Few entities (< 10 entities don't benefit from batching)

### Cleanup Pattern

Always clean up deltas when no longer needed:

```typescript
// Pattern 1: Temporary effect
const cleanup = stateMutator.registerDelta({ ... });
setTimeout(cleanup, effectDuration);

// Pattern 2: Condition-based
let cleanup: (() => void) | null = null;

if (shouldApplyEffect && !cleanup) {
  cleanup = stateMutator.registerDelta({ ... });
} else if (!shouldApplyEffect && cleanup) {
  cleanup();
  cleanup = null;
}

// Pattern 3: Entity death/removal
stateMutator.clearEntityDeltas(entityId);
```

### Debug Tools

```typescript
const info = stateMutator.getDebugInfo();
console.log(`Entities with deltas: ${info.entityCount}`);
console.log(`Total deltas: ${info.deltaCount}`);
console.log('Deltas by source:', info.deltasBySource);

// Output:
// Entities with deltas: 100
// Total deltas: 250
// Deltas by source: Map {
//   'needs_hunger_decay' => 100,
//   'needs_energy_decay' => 100,
//   'building_maintenance' => 50
// }
```

### Migration Candidates

Other systems that could benefit from this pattern:

- **InjurySystem** - Health recovery over time
- **MoodSystem** - Mood decay/recovery

## Related Documentation

- **[ARCHITECTURE_OVERVIEW.md](../../ARCHITECTURE_OVERVIEW.md)** - Overall architecture
- **[SCHEDULER_GUIDE.md](../../SCHEDULER_GUIDE.md)** - Performance patterns
- **[PERFORMANCE.md](../../PERFORMANCE.md)** - Performance optimization guide
- **[devlogs/STATE_MUTATOR_SYSTEM_2026-01-07.md](../../devlogs/STATE_MUTATOR_SYSTEM_2026-01-07.md)** - Full system documentation
- **[devlogs/NEEDS_SYSTEM_INTEGRATION_2026-01-07.md](../../devlogs/NEEDS_SYSTEM_INTEGRATION_2026-01-07.md)** - Integration example

## License

MIT

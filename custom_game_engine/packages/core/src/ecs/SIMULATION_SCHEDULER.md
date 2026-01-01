# SimulationScheduler - Dwarf Fortress-style Performance Optimization

The SimulationScheduler implements a simulation range system similar to Dwarf Fortress and Minecraft, dramatically reducing per-tick processing by intelligently deciding which entities need to be updated.

## Core Concept

Entities are divided into three categories:

1. **ALWAYS** - Critical entities that must always simulate (agents, buildings, tame animals)
2. **PROXIMITY** - Only simulate when on-screen/near agents (wild animals, plants)
3. **PASSIVE** - Never in update loops, only react to events (resources, items)

## Performance Impact

**Before (with 4,260 entities):**
- Every system processes ALL matching entities every tick
- 3,402 resources checked every tick = wasted CPU
- 861 plants updated hourly = lag spikes
- Result: 150ms+ frame times after save/load

**After (same 4,260 entities):**
```
ALWAYS entities:   ~20 (agents, buildings) - always updated
PROXIMITY entities: ~100 (visible plants/animals) - only when on-screen
PASSIVE entities:  ~3,500 (resources) - ZERO per-tick cost

Net: 120 entities updated instead of 4,260 (97% reduction)
```

## Configuration

Simulation modes are defined in `SimulationScheduler.ts`:

```typescript
export const SIMULATION_CONFIGS: Record<string, ComponentSimulationConfig> = {
  // ALWAYS - Critical entities (always simulate)
  agent: { mode: SimulationMode.ALWAYS },
  building: { mode: SimulationMode.ALWAYS },
  deity: { mode: SimulationMode.ALWAYS },

  // PROXIMITY - Only when on-screen (near agents)
  plant: {
    mode: SimulationMode.PROXIMITY,
    range: 15, // tiles
    updateFrequency: 86400, // daily when visible
  },
  animal: {
    mode: SimulationMode.PROXIMITY,
    range: 15,
  },

  // PASSIVE - Event-driven only (zero per-tick cost)
  resource: { mode: SimulationMode.PASSIVE },
  inventory: { mode: SimulationMode.PASSIVE },
};
```

## How Systems Use It

Systems have two options:

### Option 1: Manual Filtering (Recommended for complex systems)

```typescript
export class PlantSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Filter entities using scheduler
    const activeEntities = world.simulationScheduler.filterActiveEntities(
      entities,
      world.tick
    );

    // Now only process active entities
    for (const entity of activeEntities) {
      // Plant only updates if:
      // - Within 15 tiles of an agent (on-screen)
      // - AND daily timer elapsed
      this.updatePlant(entity, world);
    }
  }
}
```

### Option 2: Automatic (System base class integration - Future)

```typescript
// Future: BaseSystem handles filtering automatically
export class PlantSystem extends BaseSystem {
  constructor() {
    super({
      requiredComponents: ['plant'],
      useSimulationScheduler: true, // Automatic filtering
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Entities already filtered by base class
    for (const entity of entities) {
      this.updatePlant(entity, world);
    }
  }
}
```

## Migration Guide

### Before
```typescript
update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
  // Processes ALL 861 plants every hour
  for (const entity of entities) {
    const plant = entity.getComponent<PlantComponent>('plant');
    if (!plant) continue;

    // Update plant growth
    this.updateGrowth(plant);
  }
}
```

### After
```typescript
update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
  // Only processes ~50 visible plants when timer elapsed
  const activeEntities = world.simulationScheduler.filterActiveEntities(
    entities,
    world.tick
  );

  for (const entity of activeEntities) {
    const plant = entity.getComponent<PlantComponent>('plant');
    if (!plant) continue;

    // Update plant growth (only for visible plants)
    this.updateGrowth(plant);
  }
}
```

## Special Cases

### Tame Animals (Always Simulate)

```typescript
// Wild animals freeze off-screen, but tame animals always simulate
const animal = entity.getComponent<AnimalComponent>('animal');
if (animal.tamed) {
  // Mark as essential to override proximity culling
  // Option 1: Tag-based (future)
  entity.addTag('essential');

  // Option 2: Component-based (current)
  // Add 'agent' or 'building' component to force ALWAYS mode
}
```

### Quest Items / Legendary Weapons

```typescript
// Important items should always simulate
export const SIMULATION_CONFIGS = {
  legendary_item: {
    mode: SimulationMode.ALWAYS,
    essential: true,
  },
  quest_item: {
    mode: SimulationMode.ALWAYS,
    essential: true,
  },
};
```

## Debugging

Check simulation stats:

```typescript
const stats = world.simulationScheduler.getStats(world);
console.log(`
  Always active: ${stats.alwaysCount}
  Proximity active: ${stats.proximityActiveCount}
  Proximity frozen: ${stats.proximityFrozenCount}
  Passive: ${stats.passiveCount}
  Total: ${stats.totalEntities}
`);
```

Expected output:
```
Always active: 20      (agents, buildings)
Proximity active: 50   (plants/animals on-screen)
Proximity frozen: 827  (plants/animals off-screen)
Passive: 3402          (resources, zero cost)
Total: 4299
```

## Adding New Component Types

When creating a new component, add its simulation config:

```typescript
// In SimulationScheduler.ts
export const SIMULATION_CONFIGS: Record<string, ComponentSimulationConfig> = {
  // ... existing configs ...

  my_new_component: {
    mode: SimulationMode.PROXIMITY,  // or ALWAYS or PASSIVE
    range: 15,  // Optional: proximity range
    updateFrequency: 1,  // Optional: ticks between updates
  },
};
```

Default if not specified: `PROXIMITY` mode with 15-tile range.

## Best Practices

1. **Resources should be PASSIVE** - They never move or change unless harvested
2. **Buildings should be ALWAYS** - Players expect buildings to work even off-screen
3. **Wild animals should be PROXIMITY** - Save CPU on far-away wildlife
4. **Tame animals should be ALWAYS** - Player investment requires always-on simulation
5. **Plants should be PROXIMITY with daily updates** - Only grow when visible, reduce frequency

## Performance Tips

- **Increase proximity range carefully** - Range 15 = ~700 tiles, range 20 = ~1,250 tiles
- **Use higher update frequencies** - Daily (86400) vs hourly (3600) = 24x reduction
- **Make decorations PASSIVE** - Non-interactive scenery shouldn't update at all
- **Tag essential entities** - Quest items, legendary weapons should ignore proximity

## Future Enhancements

- [ ] Spatial grid acceleration (O(1) proximity checks instead of O(n))
- [ ] Dynamic range adjustment based on frame time
- [ ] Per-entity override tags (`entity.addTag('essential')`)
- [ ] System-level auto-filtering via BaseSystem
- [ ] Metrics dashboard integration

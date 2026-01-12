# ECS (Entity-Component-System)

Core architecture for the game engine. Entities are containers for components; systems process entities with specific components.

## Key Classes

### World
Central state container. Read-only `World` for systems, mutable `WorldMutator` for game loop.

```typescript
// Query entities
const agents = world.query().with('agent', 'position').executeEntities();

// Access components
const health = world.getComponent<HealthComponent>(entityId, 'health');

// Spatial queries
const nearby = world.query().inRect(x, y, width, height).executeEntities();
```

### Entity
UUID container for components. Read-only interface; mutation via `World` methods.

```typescript
entity.hasComponent('position');
entity.getComponent<PositionComponent>('position');
```

### Query
Fluent builder for entity filtering. Supports component requirements, spatial bounds, tags.

```typescript
world.query()
  .with('agent', 'inventory')
  .without('dead')
  .inChunk(chunkX, chunkY)
  .executeEntities();
```

### System
Game logic processor. Systems read components, emit events, submit actions. Never directly mutate components.

```typescript
class MySystem implements System {
  readonly id = 'my-system';
  readonly priority = 100;
  readonly requiredComponents = ['position', 'velocity'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
    for (const entity of active) {
      // Process entity
    }
  }
}
```

## SimulationScheduler

Dwarf Fortress-style entity culling for performance. Reduces processing from 4,000+ entities to ~50-100.

**Modes:**
- **ALWAYS**: Critical entities (agents, buildings) - always simulated
- **PROXIMITY**: Near agents only (plants, wild animals) - freezes off-screen
- **PASSIVE**: Event-driven only (resources, items) - zero per-tick cost

**Usage in systems:**
```typescript
update(world: World, entities: ReadonlyArray<Entity>): void {
  const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
  // Only processes ~50 entities instead of 4,000+
}
```

**Configuration** (`SimulationScheduler.ts`):
```typescript
SIMULATION_CONFIGS = {
  agent: { mode: SimulationMode.ALWAYS },
  plant: { mode: SimulationMode.PROXIMITY, range: 15, updateFrequency: 86400 },
  resource: { mode: SimulationMode.PASSIVE }
}
```

## Performance Notes

- **Query caching**: GameLoop caches queries when `archetypeVersion` unchanged
- **Spatial index**: Chunk-based indexing for fast spatial queries
- **Update frequency**: Throttle non-critical systems (see `SIMULATION_CONFIGS`)
- **Squared distance**: Use `dx*dx + dy*dy < r*r` to avoid `Math.sqrt()`

## File Structure

- `World.ts` - World state and mutator interface
- `Entity.ts` - Entity container and ID generation
- `QueryBuilder.ts` - Fluent query API
- `System.ts` - System interface
- `SimulationScheduler.ts` - Entity culling configuration
- `ComponentManager.ts` - Component registration (internal)
- `SystemRegistry.ts` - System registration (internal)

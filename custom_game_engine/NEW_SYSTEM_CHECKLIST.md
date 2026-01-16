# New System Checklist

> Use this checklist when creating a new ECS system to ensure you follow best practices
> and don't miss important performance optimizations.

## Before You Start

- [ ] Read the relevant package README (e.g., `packages/core/README.md`)
- [ ] Check if a similar system already exists (search SYSTEMS_CATALOG.md)
- [ ] Determine the appropriate priority range (see SCHEDULER_GUIDE.md)
- [ ] Understand system dependencies (what must run before/after this system)

## System Design

### Priority Selection
| Range | Category | Examples |
|-------|----------|----------|
| 1-10 | Infrastructure | TimeSystem, WeatherSystem |
| 11-49 | Environment | TemperatureSystem, LightingSystem |
| 50-99 | Agent Core | MovementSystem, NeedsSystem |
| 100-199 | Cognition | MemorySystem, BeliefSystem |
| 200-299 | Social | ConversationSystem, RelationshipSystem |
| 300-399 | Building | ConstructionSystem, PowerSystem |
| 400-499 | Economy | TradeSystem, CurrencySystem |
| 500-599 | Magic | SpellcastingSystem, ManaSystem |
| 600-699 | Combat | DamageSystem, CombatSystem |
| 700-799 | Reproduction | MatingSystem, GestationSystem |
| 800-899 | Divinity | MiracleSystem, WorshipSystem |
| 900-999 | Utility | MetricsSystem, AutoSaveSystem |

### Required Components
- [ ] Are my `requiredComponents` as SPECIFIC as possible?
  - ❌ BAD: `[CT.Position]` - matches 200,000+ entities
  - ✅ GOOD: `[CT.Position, CT.Agent]` - matches ~5 entities
- [ ] Have I listed ALL components this system actually needs?
- [ ] Do I use optional component checks with `entity.hasComponent()` where appropriate?

## Performance Checklist

### Throttling
- [ ] Does this system need to run every tick (20 TPS)?
  - If NO: Use `ThrottledSystem` base class or implement UPDATE_INTERVAL pattern
  - If YES: Add comment `// NO_THROTTLE: [reason]` explaining why

Common intervals:
- 20 ticks (1 sec): Position updates, UI refresh
- 100 ticks (5 sec): Weather, environmental changes
- 200 ticks (10 sec): Relationship updates
- 1000 ticks (50 sec): Memory consolidation
- 6000 ticks (5 min): Auto-save

```typescript
// Pattern 1: ThrottledSystem base class (PREFERRED)
class MySystem extends ThrottledSystem {
  readonly throttleInterval = 100; // ticks
  protected updateThrottled(world: World, entities: Entity[], dt: number): void {
    // Your logic here
  }
}

// Pattern 2: Manual throttling (if base class not suitable)
class MySystem extends System {
  private UPDATE_INTERVAL = 100;
  private lastUpdate = 0;

  update(world: World): void {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;
    // Your logic here
  }
}
```

### Entity Filtering (SimulationScheduler)
- [ ] Does this system process entities that might not be visible on screen?
  - If YES: Use `FilteredSystem` base class or call `world.simulationScheduler.filterActiveEntities()`
  - Reduces processing from 4,000+ to ~50-100 entities

```typescript
// Pattern 1: FilteredSystem base class (PREFERRED)
class MySystem extends FilteredSystem {
  protected updateFiltered(world: World, activeEntities: Entity[], dt: number): void {
    // activeEntities already filtered by SimulationScheduler
  }
}

// Pattern 2: Manual filtering
update(world: World): void {
  const entities = world.query().with(...).executeEntities();
  const active = world.simulationScheduler.filterActiveEntities(entities, world.tick);
  for (const entity of active) { /* only ~50 visible vs 4000+ total */ }
}
```

### Combining Throttling + Filtering
- [ ] Do I need both throttling AND entity filtering?
  - If YES: Use `ThrottledFilteredSystem` base class

```typescript
class MySystem extends ThrottledFilteredSystem {
  readonly throttleInterval = 100;
  protected updateThrottledFiltered(world: World, activeEntities: Entity[], dt: number): void {
    // Runs every 100 ticks, only processes visible entities
  }
}
```

### Query Caching
- [ ] Do I call `world.query()` multiple times per tick?
  - If YES: Use `CachedQuery` utility class or cache results manually
- [ ] NEVER put queries inside loops

```typescript
// ❌ BAD - Query inside loop (catastrophic performance)
for (const entity of entities) {
  const others = world.query().with(CT.Position).executeEntities(); // Queries ALL entities EVERY iteration!
  // ...
}

// ✅ GOOD - Query cached before loop
const allPositions = world.query().with(CT.Position).executeEntities();
for (const entity of entities) {
  // Use cached results
}

// ✅ BETTER - Use CachedQuery utility
private queryCache = new CachedQuery();

update(world: World): void {
  const positions = this.queryCache
    .from(world)
    .with(CT.Position)
    .ttl(20) // Cache for 20 ticks
    .executeEntities();
  // ...
}
```

### Singleton Caching
- [ ] Do I access singleton entities (TimeEntity, WeatherEntity, etc.)?
  - If YES: Cache the entity ID, don't query every tick

```typescript
// ❌ BAD - Query singleton every tick
update(world: World): void {
  const timeEntity = world.query().with(CT.time).executeEntities()[0];
  // ...
}

// ✅ GOOD - Cache singleton ID
private timeEntityId: string | null = null;

update(world: World): void {
  if (!this.timeEntityId) {
    const timeEntity = world.query().with(CT.time).executeEntities()[0];
    this.timeEntityId = timeEntity?.id ?? null;
  }
  if (this.timeEntityId) {
    const timeEntity = world.getEntity(this.timeEntityId);
    // ...
  }
}
```

### Math Operations
- [ ] Am I using `Math.sqrt()` in hot paths?
  - Use squared distance comparison instead: `dx*dx + dy*dy < radius*radius`
- [ ] Am I using `Math.pow(x, 2)`?
  - Use `x * x` instead (10x faster)
- [ ] Am I using trigonometry (sin/cos/atan2) every tick?
  - Consider lookup tables or caching if used frequently

```typescript
// ❌ BAD - sqrt in distance check
if (Math.sqrt(dx*dx + dy*dy) < radius) { ... }

// ✅ GOOD - Squared distance
if (dx*dx + dy*dy < radius*radius) { ... }

// ❌ BAD - pow for squaring
const distSq = Math.pow(dx, 2) + Math.pow(dy, 2);

// ✅ GOOD - Direct multiplication
const distSq = dx*dx + dy*dy;
```

### Math Utilities
- [ ] Am I implementing common math functions?
  - Check `packages/core/src/utils/math.ts` first - it has softmax, sigmoid, normalize, clamp, lerp, etc.

```typescript
import { softmax, sigmoid, normalize, clamp, lerp } from '../utils/math.js';
```

## Code Quality Checklist

### Naming Conventions
- [ ] System ID uses `lowercase_with_underscores`
- [ ] Component types use `lowercase_with_underscores`
- [ ] Class name is PascalCase ending in "System"

```typescript
// ✅ GOOD
export class NavigationSystem extends System {
  readonly id = 'navigation';
  readonly requiredComponents = [CT.navigation, CT.position];
}

// ❌ BAD
export class NavigationSystem extends System {
  readonly id = 'Navigation'; // Should be lowercase
  readonly requiredComponents = [CT.Navigation]; // Should be lowercase
}
```

### Error Handling
- [ ] No silent fallbacks - throw on missing required data
- [ ] Error messages include entity IDs and context
- [ ] Optional fields use explicit optional handling

```typescript
// ❌ BAD - Silent fallback masks bugs
const health = data.health ?? 100;
const efficiency = Math.min(1, Math.max(0, value)); // Clamps invalid values silently

// ✅ GOOD - Explicit error handling
if (data.health === undefined) {
  throw new Error(`Missing required 'health' field for entity ${entity.id}`);
}
if (value < 0 || value > 1) {
  throw new Error(`Invalid efficiency value ${value} for entity ${entity.id}, must be 0-1`);
}

// ✅ GOOD - Explicit optional handling
const description = data.description ?? ""; // Truly optional, has reasonable default
```

### Entity Lifecycle (Conservation of Game Matter)
- [ ] NEVER use `world.removeEntity()` - mark as corrupted instead
- [ ] Use corruption system for invalid/broken entities
- [ ] See CORRUPTION_SYSTEM.md for details

```typescript
// ❌ BAD - Destroys data permanently
if (isBroken(entity)) {
  world.removeEntity(entity.id);
}

// ✅ GOOD - Preserve for recovery
if (isBroken(entity)) {
  entity.addComponent({
    type: 'corrupted',
    corruption_reason: 'malformed_navigation_data',
    corruption_timestamp: world.tick,
    recoverable: true,
    original_data: JSON.stringify(entity.getComponent('navigation'))
  });
}
```

### Logging
- [ ] No `console.log()` in production code (debug output prohibited)
- [ ] Use `console.warn()` for warnings with `[SystemName]` prefix
- [ ] Use `console.error()` for errors with `[SystemName]` prefix and full context

```typescript
// ❌ BAD
console.log('Processing entity', entity.id);
console.log('Debug:', someValue);

// ✅ GOOD
console.warn(`[NavigationSystem] Entity ${entity.id} has no path, skipping`);
console.error(`[NavigationSystem] Failed to calculate path for entity ${entity.id}:`, error);
```

### Type Safety
- [ ] No `as any` or `@ts-ignore` unless absolutely necessary
- [ ] If using type assertions, add comment explaining why
- [ ] Prefer type guards over type assertions

```typescript
// ❌ BAD
const position = entity.getComponent('position') as any;

// ✅ GOOD
const position = entity.getComponent<Position>('position');
if (!position) {
  throw new Error(`Entity ${entity.id} missing position component`);
}
```

## Integration Checklist

### Registration
- [ ] System is registered in `registerAllSystems.ts`
- [ ] System is in the correct category section (with comment header)
- [ ] Dependencies are registered BEFORE this system
- [ ] Priority ensures correct execution order

```typescript
// In registerAllSystems.ts
// --- Navigation Systems ---
world.addSystem(new PathfindingSystem(), 45);
world.addSystem(new NavigationSystem(), 46);     // After pathfinding
world.addSystem(new SteeringSystem(), 47);       // After navigation
```

### Dependencies
- [ ] Document what systems must run before this one
- [ ] Document what systems must run after this one
- [ ] Verify priority ordering matches dependencies

```typescript
/**
 * NavigationSystem - Processes navigation goals and updates paths
 *
 * Dependencies:
 * - BEFORE: PathfindingSystem (must recalculate paths first)
 * - AFTER: SteeringSystem (uses navigation targets)
 *
 * Priority: 46 (between PathfindingSystem:45 and SteeringSystem:47)
 */
```

### Events
- [ ] Emit events for state changes other systems might care about
- [ ] Subscribe to events in `initialize()`, not constructor
- [ ] Unsubscribe in cleanup (if implementing cleanup)

```typescript
initialize(world: World): void {
  // Subscribe to events
  world.events.on('agent_spawned', this.handleAgentSpawned.bind(this));
}

update(world: World): void {
  // Emit events for state changes
  if (pathCompleted) {
    world.events.emit('navigation_complete', {
      entityId: entity.id,
      destination: target
    });
  }
}
```

### Metrics
- [ ] Emit events that MetricsCollector can track (if applicable)
- [ ] Consider adding system-specific metrics for monitoring

```typescript
// Emit metrics events
world.events.emit('metric', {
  category: 'navigation',
  name: 'paths_calculated',
  value: pathCount,
  timestamp: world.tick
});
```

## Documentation Checklist

### Code Documentation
- [ ] JSDoc comment at class level explaining purpose
- [ ] JSDoc comments on public methods
- [ ] Inline comments for complex logic (why, not what)
- [ ] Document any non-obvious dependencies or assumptions

```typescript
/**
 * NavigationSystem - Manages agent pathfinding and movement goals
 *
 * This system processes navigation components to move agents toward their goals.
 * It works with PathfindingSystem to calculate optimal paths and with SteeringSystem
 * to handle local obstacle avoidance.
 *
 * Priority: 46 (after PathfindingSystem:45, before SteeringSystem:47)
 * Throttle: None - needs to update paths every tick for responsive movement
 *
 * Required Components:
 * - navigation: Target position and path state
 * - position: Current world position
 * - agent: Ensures only agents are processed (not buildings/plants)
 */
export class NavigationSystem extends System {
  // ...
}
```

### Catalog Entry
- [ ] Add entry to SYSTEMS_CATALOG.md with:
  - System name and ID
  - Priority
  - Required components
  - Optional components
  - Brief description
  - File location

### Package README
- [ ] If system is complex or introduces new concepts, add section to package README
- [ ] Include usage examples if API is exposed to other systems

## Testing Checklist

### Unit Tests
- [ ] Test core logic with mock World/Entity
- [ ] Test error cases (missing components, invalid data)
- [ ] Test throttling behavior (if applicable)
- [ ] Test entity filtering behavior (if applicable)

```typescript
describe('NavigationSystem', () => {
  it('should update navigation targets', () => {
    // Test normal case
  });

  it('should throw on missing required component', () => {
    // Test error case
  });

  it('should throttle updates correctly', () => {
    // Test throttling (if applicable)
  });

  it('should only process visible entities', () => {
    // Test entity filtering (if applicable)
  });
});
```

### Integration Tests
- [ ] Test interaction with dependent systems
- [ ] Test event emission/subscription
- [ ] Test with real world instance (not just mocks)

### Code Quality
- [ ] No `as any` in test code
- [ ] Tests are deterministic (no random failures)
- [ ] Tests clean up after themselves

## Verification Checklist

### Build & Lint
- [ ] Run `npm run build` - no type errors
- [ ] Run `npm run lint` - no errors (warnings OK with justification)
- [ ] Run `npm test` - all tests pass
- [ ] Check for stale `.js` files in `src/` (see CLAUDE.md)

```bash
cd custom_game_engine
npm run build     # Must pass
npm run lint      # No errors
npm test          # All tests pass

# Clean stale .js files if needed
find packages -path "*/src/*.js" -type f -delete
find packages -path "*/src/*.d.ts" -type f -delete
```

### Browser Validation
- [ ] Start game with `./start.sh`
- [ ] Open DevTools (F12) → Console → no red errors
- [ ] Test your system's functionality
- [ ] Check TPS/FPS - no performance regression
- [ ] Watch for warnings related to your system

### HMR (Hot Module Reload)
- [ ] Verify changes hot-reload correctly
- [ ] No need to restart server (unless changing config)
- [ ] See CLAUDE.md section "DO NOT RESTART SERVERS"

## Performance Validation

### Before Merge
- [ ] Profile system performance with many entities (1000+)
- [ ] Verify query count is reasonable (< 10 per tick)
- [ ] Check memory usage doesn't grow unbounded
- [ ] Verify TPS stays at 20 (no slowdown)

### Performance Targets
- **Query Count**: < 10 per tick (ideally < 5)
- **Entity Processing**: < 1ms per 100 entities
- **TPS**: Maintains 20 TPS with 100+ agents
- **Memory**: No memory leaks over 1000+ ticks

### Profiling Tools
```typescript
// Add to system for profiling
private profileMetrics = {
  queriesPerTick: 0,
  entitiesProcessed: 0,
  executionTime: 0
};

update(world: World): void {
  const start = performance.now();
  this.profileMetrics.queriesPerTick = 0;
  this.profileMetrics.entitiesProcessed = 0;

  // Your logic here

  this.profileMetrics.executionTime = performance.now() - start;

  // Log every 100 ticks during development
  if (world.tick % 100 === 0) {
    console.log(`[${this.id}] Metrics:`, this.profileMetrics);
  }
}
```

## Common Pitfalls

### Performance
- ❌ Querying inside loops
- ❌ Using `Math.sqrt()` for distance checks
- ❌ Not throttling slow-changing state
- ❌ Processing all entities when only visible ones matter
- ❌ Not caching singleton entities

### Correctness
- ❌ Silent fallbacks instead of throwing errors
- ❌ Using `world.removeEntity()` instead of corruption system
- ❌ Wrong priority causing execution order bugs
- ❌ Missing required components in query

### Code Quality
- ❌ `console.log()` for debugging
- ❌ Component types in PascalCase instead of lowercase_with_underscores
- ❌ Using `as any` without justification
- ❌ No error messages or poor error messages

## Quick Reference: Base Classes

```typescript
// Standard system - runs every tick
class MySystem extends System {
  readonly id = 'my_system';
  readonly priority = 50;
  readonly requiredComponents = [CT.position, CT.agent];

  update(world: World): void {
    const entities = world.query().with(...this.requiredComponents).executeEntities();
    for (const entity of entities) { /* process */ }
  }
}

// Throttled system - runs every N ticks
class MySystem extends ThrottledSystem {
  readonly id = 'my_system';
  readonly priority = 50;
  readonly requiredComponents = [CT.position, CT.agent];
  readonly throttleInterval = 100; // Every 5 seconds

  protected updateThrottled(world: World, entities: Entity[], dt: number): void {
    for (const entity of entities) { /* process */ }
  }
}

// Filtered system - only processes visible entities
class MySystem extends FilteredSystem {
  readonly id = 'my_system';
  readonly priority = 50;
  readonly requiredComponents = [CT.position, CT.plant];

  protected updateFiltered(world: World, activeEntities: Entity[], dt: number): void {
    for (const entity of activeEntities) { /* only visible entities */ }
  }
}

// Throttled + Filtered - best of both worlds
class MySystem extends ThrottledFilteredSystem {
  readonly id = 'my_system';
  readonly priority = 50;
  readonly requiredComponents = [CT.position, CT.plant];
  readonly throttleInterval = 100;

  protected updateThrottledFiltered(world: World, activeEntities: Entity[], dt: number): void {
    for (const entity of activeEntities) { /* visible entities, every N ticks */ }
  }
}
```

## Quick Reference: Query Caching

```typescript
// Instance cache (for one system)
import { CachedQuery } from '@ai-village/core';

class MySystem extends System {
  private queryCache = new CachedQuery();

  update(world: World): void {
    const results = this.queryCache
      .from(world)
      .with(CT.Agent)
      .ttl(20) // Cache for 20 ticks
      .executeEntities();
  }
}

// Global cache (shared across systems)
import { QueryCache } from '@ai-village/core';

const agents = QueryCache.get(world, 'all_agents', [CT.Agent], 20);
```

## Quick Reference: Math Utilities

```typescript
import {
  clamp,           // clamp(value, min, max)
  lerp,            // lerp(a, b, t)
  normalize,       // normalize(array)
  softmax,         // softmax(array)
  sigmoid,         // sigmoid(x)
  distance,        // distance(x1, y1, x2, y2)
  distanceSquared, // distanceSquared(x1, y1, x2, y2)
  randomRange,     // randomRange(min, max)
  randomInt,       // randomInt(min, max)
} from '../utils/math.js';
```

## Additional Resources

- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - ECS fundamentals, data flow
- **[SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)** - 212+ systems with priorities
- **[COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** - 125+ component types
- **[SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)** - GameLoop, system priority, throttling
- **[SIMULATION_SCHEDULER.md](./packages/core/src/ecs/SIMULATION_SCHEDULER.md)** - Entity culling
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance guidelines and profiling
- **[CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md)** - Conservation of game matter

---

**Remember**: Performance optimizations are not premature. The scheduler, throttling, and entity filtering are fundamental to maintaining 20 TPS with thousands of entities. Apply them from the start.

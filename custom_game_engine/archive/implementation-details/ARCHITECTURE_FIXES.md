# Architecture Fixes Backlog

> This document contains actionable fixes for architecture issues discovered during code review.
> Each section is independent and can be tackled by a separate agent.

---

## 1. Event System: Add Missing Event Types

**Priority**: Critical
**Effort**: 1-2 days
**Risk**: Low

### Problem

70+ events are emitted but not defined in `EventMap.ts`. Systems cast to `any` to subscribe:

```typescript
// Current - no type safety
(eventBus.subscribe as any)('divinity:proto_deity_belief', (event: any) => {
```

### Files to Modify

- `packages/core/src/events/EventMap.ts` - Add missing event definitions

### Events to Add

Search the codebase for these patterns and add types:

```bash
# Find all emitted events
grep -r "eventBus.emit" packages/core/src/systems/ | grep -oP "type:\s*['\"]([^'\"]+)['\"]" | sort -u

# Find all subscribed events
grep -r "subscribe(" packages/core/src/systems/ | grep -oP "['\"]([a-z_:]+)['\"]" | sort -u
```

**Known missing events** (non-exhaustive):

| Event | Emitted By | Data Shape |
|-------|------------|------------|
| `bless_agent` | AIGodBehaviorSystem | `{ deityId, targetId, blessing }` |
| `curse_agent` | AIGodBehaviorSystem | `{ deityId, targetId, curse }` |
| `send_vision` | AIGodBehaviorSystem | `{ deityId, targetId, vision }` |
| `inspire_prophet` | AIGodBehaviorSystem | `{ deityId, targetId }` |
| `answer_prayer` | AIGodBehaviorSystem | `{ deityId, prayerId, answer }` |
| `building:collapse_imminent` | BuildingSystem | `{ buildingId, integrity }` |
| `building:critical_condition` | BuildingSystem | `{ buildingId, condition }` |
| `building:harmony_analyzed` | BuildingSpatialAnalysisSystem | `{ buildingId, harmony }` |
| `building:needs_repair` | BuildingMaintenanceSystem | `{ buildingId, repairNeeded }` |
| `canon_event` | Multiple systems | `{ eventType, participants, description }` |
| `agent:xp_gained` | SkillSystem | `{ agentId, skill, amount }` |
| `divinity:proto_deity_belief` | DeityEmergenceSystem | `{ beliefData }` |
| `magic:skill_node_unlocked` | MagicSystem | `{ agentId, nodeId }` |
| `magic:spell_blocked` | CreatorInterventionSystem | `{ casterId, spellId, reason }` |
| `magic:spell_suppressed` | CreatorInterventionSystem | `{ casterId, spellId }` |
| `divinity:banned_spell_attempt` | CreatorInterventionSystem | `{ casterId, ban, trapTriggered }` |

### Acceptance Criteria

1. All events in EventMap.ts have proper TypeScript interfaces
2. No `as any` casts remain in event subscriptions
3. IDE autocomplete works for all event types
4. Run `grep -r "as any" packages/core/src/systems/ | grep -c subscribe` returns 0

---

## 2. System Dependencies: Make Implicit Dependencies Explicit

**Priority**: High
**Effort**: 1 day
**Risk**: Low (documentation only, no code changes)

### Problem

Systems depend on other systems running first, but this is only encoded in priority numbers. Nothing validates dependencies.

### Current State

```typescript
// PlantSystem.ts
export class PlantSystem implements System {
  public readonly id = 'plant';
  public readonly priority = 20;
  public readonly requiredComponents = [CT.Plant]; // Says nothing about TimeSystem, WeatherSystem
```

### Solution

Add a `dependsOn` property to each system (documentation-only first, validation later):

```typescript
export class PlantSystem implements System {
  public readonly id = 'plant';
  public readonly priority = 20;
  public readonly requiredComponents = [CT.Plant];

  /**
   * Systems that must run before this one.
   * @see TimeSystem (priority 3) - provides game time for day/night calculations
   * @see WeatherSystem (priority 5) - provides rain/frost events
   * @see SoilSystem - provides moisture/nutrient events
   */
  public readonly dependsOn = ['time', 'weather', 'soil'] as const;
```

### Files to Modify

Add dependency documentation to these systems (high-priority first):

| System | File | Dependencies |
|--------|------|--------------|
| PlantSystem | `systems/PlantSystem.ts` | TimeSystem, WeatherSystem, SoilSystem |
| PlantDiseaseSystem | `systems/PlantDiseaseSystem.ts` | PlantSystem |
| NeedsSystem | `systems/NeedsSystem.ts` | TimeSystem |
| BuildingSystem | `systems/BuildingSystem.ts` | (none declared, needs investigation) |
| MovementSystem | `systems/MovementSystem.ts` | TimeSystem, BuildingSystem |
| MemoryFormationSystem | `systems/MemoryFormationSystem.ts` | All systems that emit memory-worthy events |
| SkillSystem | `systems/SkillSystem.ts` | Systems that emit XP-granting events |

### Phase 2 (Future)

Add runtime validation in SystemRegistry:

```typescript
// In SystemRegistry.registerSystem()
for (const depId of system.dependsOn ?? []) {
  if (!this.systems.has(depId)) {
    console.warn(`[SystemRegistry] ${system.id} depends on ${depId} which is not registered`);
  }
  const dep = this.systems.get(depId);
  if (dep && dep.priority >= system.priority) {
    console.warn(`[SystemRegistry] ${system.id} (priority ${system.priority}) depends on ${depId} (priority ${dep.priority}) but runs before it!`);
  }
}
```

### Acceptance Criteria

1. Top 20 systems have `dependsOn` JSDoc comments
2. No system with dependencies has a priority lower than its dependencies
3. SYSTEMS_CATALOG.md updated with dependency column

---

## 3. Extract Constants: PlantSystem Magic Numbers

**Priority**: Medium
**Effort**: 2-3 hours
**Risk**: Low

### Problem

PlantSystem has 50+ magic numbers with no constants:

```typescript
return 0.3 + (0.7 * progress);  // What are these?
const hydrationGain = this.weatherRainIntensity === 'heavy' ? 30 :
                     this.weatherRainIntensity === 'light' ? 15 : 20;
```

### Solution

Create constants file and use throughout:

```typescript
// packages/core/src/systems/constants/PlantConstants.ts

export const PLANT_CONSTANTS = {
  // Light levels
  LIGHT_LEVEL_DAWN_MIN: 0.3,
  LIGHT_LEVEL_DAWN_MAX: 1.0,
  LIGHT_LEVEL_NIGHT: 0.1,

  // Hydration from rain
  HYDRATION_GAIN_HEAVY_RAIN: 30,
  HYDRATION_GAIN_MEDIUM_RAIN: 20,
  HYDRATION_GAIN_LIGHT_RAIN: 15,

  // Growth rates
  BASE_GROWTH_RATE: 0.0008,
  GROWTH_RATE_MODIFIER_OPTIMAL: 1.5,
  GROWTH_RATE_MODIFIER_POOR: 0.5,

  // Temperature
  OPTIMAL_TEMPERATURE_MIN: 15,
  OPTIMAL_TEMPERATURE_MAX: 25,
  STRESS_TEMPERATURE_THRESHOLD: 30,

  // Seeds
  DEFAULT_SEEDS_PER_PLANT: 5,
  SEED_DISPERSAL_RATE_PER_HOUR: 0.1,
  SEED_BURST_DISPERSAL_RATE: 0.3,
  DEFAULT_DISPERSAL_RADIUS: 3,

  // Update frequency
  HOUR_THRESHOLD: 24.0,
} as const;
```

### Files to Modify

1. Create `packages/core/src/systems/constants/PlantConstants.ts`
2. Update `packages/core/src/systems/PlantSystem.ts` to import and use constants
3. Update `packages/core/src/systems/PlantDiseaseSystem.ts` if it shares constants

### Acceptance Criteria

1. All numeric literals in PlantSystem replaced with named constants
2. Constants have JSDoc explaining what they control
3. Game behavior unchanged (test by running simulation)

---

## 4. Singleton Cache Utility

**Priority**: Medium
**Effort**: 2-3 hours
**Risk**: Low

### Problem

Systems access singleton entities (Time, Weather) in 4 different ways:

```typescript
// Pattern 1: Query every tick (slow)
const timeEntities = world.query().with(CT.Time).executeEntities();

// Pattern 2: Cache ID manually
if (!this.timeEntityId) {
  const timeEntities = world.query().with(CT.Time).executeEntities();
  this.timeEntityId = timeEntities[0]?.id;
}

// Pattern 3: Trust it exists
const time = world.getEntity(this.timeEntityId)!; // Crash if deleted

// Pattern 4: Pass in constructor (inconsistent with other systems)
constructor(timeEntity: Entity) { ... }
```

### Solution

Create a singleton cache utility:

```typescript
// packages/core/src/ecs/SingletonCache.ts

export class SingletonCache {
  private cache = new Map<ComponentType, Entity | null>();
  private lastArchetypeVersion = -1;

  constructor(private world: World) {}

  /**
   * Get the singleton entity with the given component type.
   * Returns null if no entity has this component.
   * Caches result until archetype version changes.
   */
  get<T extends Component>(componentType: ComponentType): Entity | null {
    // Invalidate cache if world structure changed
    if (this.world.archetypeVersion !== this.lastArchetypeVersion) {
      this.cache.clear();
      this.lastArchetypeVersion = this.world.archetypeVersion;
    }

    if (this.cache.has(componentType)) {
      return this.cache.get(componentType)!;
    }

    const entities = this.world.query().with(componentType).executeEntities();
    const entity = entities.length > 0 ? entities[0] : null;
    this.cache.set(componentType, entity);
    return entity;
  }

  /**
   * Get singleton entity, throw if not found.
   */
  getRequired<T extends Component>(componentType: ComponentType): Entity {
    const entity = this.get(componentType);
    if (!entity) {
      throw new Error(`Required singleton entity with component ${componentType} not found`);
    }
    return entity;
  }
}
```

### Usage

```typescript
// In GameLoop or World
const singletons = new SingletonCache(world);

// In systems
const timeEntity = singletons.get(CT.Time);
const weatherEntity = singletons.get(CT.Weather);
```

### Files to Modify

1. Create `packages/core/src/ecs/SingletonCache.ts`
2. Export from `packages/core/src/ecs/index.ts`
3. Integrate into GameLoop or make available via World
4. Update 3-5 systems to use new pattern as examples

### Systems to Update (examples)

- `NeedsSystem.ts` - currently caches timeEntityId manually
- `PlantSystem.ts` - currently uses events instead of direct access
- `MovementSystem.ts` - caches timeEntityId

### Acceptance Criteria

1. SingletonCache class created and exported
2. At least 3 systems converted to use it
3. Query count reduced (measure before/after with metrics)

---

## 5. Split PlantSystem God Class

**Priority**: Medium
**Effort**: 1-2 days
**Risk**: Medium (refactoring)

### Problem

PlantSystem is 1,200+ lines handling 8 different concerns:

1. Plant lifecycle (growth stages, aging)
2. Seed production
3. Seed dispersal
4. Weather event handling
5. Genetics application
6. Disease integration
7. Environment calculations
8. Nutrition/hydration

### Solution

Extract into focused classes:

```
packages/core/src/systems/plants/
├── PlantSystem.ts           # Orchestrates, delegates to subsystems
├── PlantGrowthCalculator.ts # Environment, nutrition, growth rate
├── SeedProductionSystem.ts  # Seed generation and dispersal
├── PlantEventHandler.ts     # Weather, soil event subscriptions
└── PlantConstants.ts        # All magic numbers
```

### Extraction Plan

**Step 1**: Extract `PlantGrowthCalculator` (pure functions, no state)
```typescript
// PlantGrowthCalculator.ts
export function calculateEnvironment(plant: PlantComponent, weather: WeatherData, soil: SoilData): Environment { ... }
export function calculateGrowthRate(plant: PlantComponent, env: Environment): number { ... }
export function calculatePlantStats(plant: PlantComponent, species: PlantSpecies): PlantStats { ... }
```

**Step 2**: Extract `SeedProductionSystem` (separate ECS system)
```typescript
// SeedProductionSystem.ts - priority 21 (after PlantSystem)
export class SeedProductionSystem implements System {
  public readonly id = 'seed_production';
  public readonly priority = 21;
  public readonly requiredComponents = [CT.Plant];
  public readonly dependsOn = ['plant'] as const;

  update(world: World, entities: Entity[], deltaTime: number): void {
    // Seed production and dispersal logic
  }
}
```

**Step 3**: Extract `PlantEventHandler` (event subscription management)
```typescript
// PlantEventHandler.ts
export class PlantEventHandler {
  constructor(private eventBus: EventBus, private plantSystem: PlantSystem) {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.eventBus.subscribe('weather:rain', this.handleRain.bind(this));
    this.eventBus.subscribe('weather:frost', this.handleFrost.bind(this));
    // ...
  }
}
```

### Files to Create

1. `packages/core/src/systems/plants/PlantConstants.ts`
2. `packages/core/src/systems/plants/PlantGrowthCalculator.ts`
3. `packages/core/src/systems/plants/SeedProductionSystem.ts`
4. `packages/core/src/systems/plants/PlantEventHandler.ts`
5. `packages/core/src/systems/plants/index.ts`

### Files to Modify

1. `packages/core/src/systems/PlantSystem.ts` - Delegate to extracted classes
2. `packages/core/src/systems/index.ts` - Export new systems

### Acceptance Criteria

1. PlantSystem.ts under 400 lines
2. Each extracted class has single responsibility
3. All plant tests still pass
4. No behavior changes

---

## 6. Standardize Component Access Pattern

**Priority**: Low
**Effort**: 1 day
**Risk**: Low

### Problem

Components accessed two different ways in the same codebase:

```typescript
// Pattern 1: Using ComponentType enum (correct)
entity.getComponent(CT.Position);
entity.hasComponent(CT.Agent);

// Pattern 2: Using string literals (fragile)
entity.components.get('afterlife_memory');
entity.components.get('body');
```

### Solution

1. Ensure all component types are in `ComponentType` enum
2. Search and replace string literals with enum values
3. Add lint rule to prevent string literals

### Search Pattern

```bash
# Find all string literal component access
grep -rn "\.get(['\"][a-z_]*['\"])" packages/core/src/systems/
grep -rn "\.has(['\"][a-z_]*['\"])" packages/core/src/systems/
grep -rn "components\.get(['\"]" packages/core/src/systems/
```

### Files to Check

Known files using string literals:
- `AfterlifeMemoryFadingSystem.ts` - uses `'afterlife_memory'`
- `BodySystem.ts` - uses `'body'`
- `PlantSystem.ts` - uses `'realm_location'`

### Acceptance Criteria

1. All component access uses `CT.ComponentName` pattern
2. No string literals for component types in systems
3. ComponentType enum is complete

---

## 7. Clean Up Hidden State Maps

**Priority**: Low
**Effort**: 2-3 hours
**Risk**: Low

### Problem

30+ systems have Maps that cache entity state but never clean up when entities are deleted:

```typescript
private productionState: Map<string, ProductionState[]> = new Map();
private lastDecisionTime: Map<string, number> = new Map();
private bookstores: Map<EntityId, BookstoreData> = new Map();
```

### Solution

Subscribe to entity deletion events and clean up:

```typescript
export class BookstoreSystem implements System {
  private bookstores: Map<EntityId, BookstoreData> = new Map();

  initialize(world: World, eventBus: EventBus): void {
    // Clean up when entities are destroyed
    eventBus.subscribe('entity:destroyed', (event) => {
      this.bookstores.delete(event.data.entityId);
    });
  }
}
```

Or use WeakMap where appropriate:

```typescript
// If Entity objects are stable, use WeakMap for automatic cleanup
private entityCache: WeakMap<Entity, CachedData> = new WeakMap();
```

### Systems to Audit

Search for Map declarations without cleanup:

```bash
grep -rn "private.*Map<.*EntityId" packages/core/src/systems/
grep -rn "private.*Map<string," packages/core/src/systems/
```

### Acceptance Criteria

1. All Maps with EntityId keys have cleanup handlers
2. Or documented reason why cleanup isn't needed
3. Memory usage stable over long simulation runs

---

## 8. Event Chain Documentation

**Priority**: Low
**Effort**: 1 day
**Risk**: Low (documentation only)

### Problem

Events trigger handlers that emit more events, creating hard-to-trace chains:

```
magic:spell_cast_attempt
  → magic:spell_blocked
  → divinity:banned_spell_attempt
    → agent:punished
      → agent:status_changed
```

### Solution

Create event chain documentation:

```typescript
// In EventMap.ts or separate EVENT_CHAINS.md

/**
 * Event: magic:spell_cast_attempt
 *
 * Trigger: Agent attempts to cast a spell
 *
 * Chain:
 * 1. CreatorInterventionSystem checks if spell is banned
 *    - If banned: emits magic:spell_blocked, divinity:banned_spell_attempt
 *    - If trapped: emits magic:spell_suppressed
 * 2. MagicSystem processes the spell
 *    - On success: emits magic:spell_cast
 *    - On failure: emits magic:spell_failed
 * 3. SkillSystem may grant XP
 *    - emits agent:xp_gained
 */
```

### Files to Create

1. `packages/core/src/events/EVENT_CHAINS.md` - Document major event chains

### Major Chains to Document

- Spell casting chain (magic:spell_cast_attempt → ...)
- Death chain (agent:died → afterlife processing → ...)
- Building chain (building:placement:confirmed → ...)
- Reproduction chain (courtship → mating → pregnancy → birth → ...)
- Belief chain (prayer → deity response → ...)

### Acceptance Criteria

1. Top 10 event chains documented
2. Each chain shows all events in sequence
3. Each event shows which system emits it

---

## Priority Order

| # | Task | Priority | Effort | Risk |
|---|------|----------|--------|------|
| 1 | Add missing event types | Critical | 1-2 days | Low |
| 2 | Document system dependencies | High | 1 day | Low |
| 3 | Extract PlantSystem constants | Medium | 2-3 hours | Low |
| 4 | Singleton cache utility | Medium | 2-3 hours | Low |
| 5 | Split PlantSystem | Medium | 1-2 days | Medium |
| 6 | Standardize component access | Low | 1 day | Low |
| 7 | Clean up hidden state Maps | Low | 2-3 hours | Low |
| 8 | Event chain documentation | Low | 1 day | Low |

---

## Notes for Agents

- Run `npm run build` after changes to verify TypeScript compiles
- Run the game (`./start.sh`) to verify behavior unchanged
- Each section is independent - can be done in parallel
- Create a PR per section for easier review

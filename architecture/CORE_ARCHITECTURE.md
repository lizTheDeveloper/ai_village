# AI Village Core Architecture

> **Purpose**: Define stable interfaces and patterns that enable incremental feature development while maintaining backwards compatibility across all game versions.

## Design Principles

1. **Additive Only**: New features add new components/events/actions. Never remove, only deprecate.
2. **Explicit Versioning**: Every serialized structure has a version. Migrations are first-class.
3. **Loose Coupling**: Systems communicate via events, not direct references.
4. **Agents Express Intent**: The world decides what actually happens.
5. **Defaults Enable Evolution**: New fields always have sensible defaults so old saves just work.

---

## Part 1: Entity-Component-System (ECS)

### Core Types

```typescript
// Stable forever - never changes
type EntityId = string; // UUID v4
type ComponentType = string; // e.g., "position", "agent", "inventory"
type SystemId = string;
type Tick = number; // Monotonically increasing game tick

// The World is the single source of truth
interface World {
  readonly tick: Tick;
  readonly entities: ReadonlyMap<EntityId, Entity>;
  readonly systems: ReadonlyArray<System>;
  readonly eventBus: EventBus;
  readonly actionQueue: ActionQueue;
}

// Entities are just IDs with component bags
interface Entity {
  readonly id: EntityId;
  readonly components: ReadonlyMap<ComponentType, Component>;
  readonly createdAt: Tick;
  readonly version: number; // For optimistic updates / change detection
}

// Components are pure data - no methods, no logic
interface Component {
  readonly type: ComponentType;
  readonly version: number; // Schema version for this component type
  // ... component-specific fields
}

// Systems contain all logic - they read components and emit actions
interface System {
  readonly id: SystemId;
  readonly priority: number; // Lower runs first
  readonly requiredComponents: ReadonlyArray<ComponentType>;

  // Called every tick for entities with required components
  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void;

  // Handle events from other systems
  onEvent?(event: GameEvent): void;
}
```

### Component Registry

```typescript
// Central registry of all component types and their schemas
interface ComponentRegistry {
  // Register a new component type (called at startup)
  register<T extends Component>(
    type: ComponentType,
    schema: ComponentSchema<T>,
    defaultFactory: () => T
  ): void;

  // Get schema for validation/migration
  getSchema(type: ComponentType): ComponentSchema<unknown> | undefined;

  // Create component with defaults (for new entities or missing components)
  createDefault(type: ComponentType): Component;

  // Migrate old component data to current schema
  migrate(type: ComponentType, data: unknown, fromVersion: number): Component;
}

interface ComponentSchema<T> {
  readonly type: ComponentType;
  readonly version: number;
  readonly fields: ReadonlyArray<FieldSchema>;

  // Validate component data
  validate(data: unknown): data is T;

  // Migration from previous version (null if v1)
  migrateFrom?: (oldData: unknown, oldVersion: number) => T;
}

interface FieldSchema {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'entityRef';
  readonly required: boolean;
  readonly default?: unknown;
}
```

### Core Components (Minimal Stable Set)

These components are guaranteed stable. New components can be added freely.

```typescript
// Everything with a position in the world
interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
  chunkX: number; // Derived, for efficient lookup
  chunkY: number;
}

// Anything that can be named
interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
  species?: string; // Optional - added later
  pronouns?: string; // Optional - added later
}

// Anything that takes up space / blocks movement
interface PhysicsComponent extends Component {
  type: 'physics';
  solid: boolean;
  width: number; // In tiles
  height: number;
}

// Anything that can be rendered
interface RenderableComponent extends Component {
  type: 'renderable';
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
}

type RenderLayer = 'terrain' | 'floor' | 'object' | 'entity' | 'effect' | 'ui';

// Anything owned by another entity
interface OwnershipComponent extends Component {
  type: 'ownership';
  ownerId: EntityId | null;
}

// Container for other entities (inventory, chest, building contents)
interface ContainerComponent extends Component {
  type: 'container';
  slots: number;
  contents: EntityId[];
  acceptsTypes?: string[]; // Item categories this can hold
}

// Tags for categorization and queries
interface TagsComponent extends Component {
  type: 'tags';
  tags: Set<string>; // e.g., 'agent', 'item', 'building', 'crop', 'animal'
}
```

### Entity Archetypes

Factory functions that create entities with standard component sets:

```typescript
interface EntityArchetype {
  readonly name: string;
  readonly requiredComponents: ComponentType[];
  readonly optionalComponents: ComponentType[];

  create(world: World, overrides?: Partial<Record<ComponentType, Partial<Component>>>): EntityId;
}

// Examples - these define the "shape" of game objects
const AgentArchetype: EntityArchetype = {
  name: 'agent',
  requiredComponents: ['position', 'identity', 'physics', 'renderable', 'tags', 'agent', 'needs', 'memory', 'skills'],
  optionalComponents: ['inventory', 'relationships', 'culture'],
  // ...
};

const ItemArchetype: EntityArchetype = {
  name: 'item',
  requiredComponents: ['identity', 'renderable', 'tags', 'item'],
  optionalComponents: ['position', 'ownership', 'durability', 'quality'],
  // ...
};

const BuildingArchetype: EntityArchetype = {
  name: 'building',
  requiredComponents: ['position', 'identity', 'physics', 'renderable', 'tags', 'building'],
  optionalComponents: ['container', 'workstation', 'housing'],
  // ...
};
```

### Querying Entities

```typescript
interface WorldQuery {
  // Get entities with all specified components
  withComponents(...types: ComponentType[]): EntityId[];

  // Get entities with any of the specified tags
  withTags(...tags: string[]): EntityId[];

  // Get entities in a spatial region
  inRect(x: number, y: number, width: number, height: number): EntityId[];
  inChunk(chunkX: number, chunkY: number): EntityId[];

  // Get single entity by ID
  get(id: EntityId): Entity | undefined;

  // Compound queries
  query(): QueryBuilder;
}

interface QueryBuilder {
  with(...components: ComponentType[]): QueryBuilder;
  withTags(...tags: string[]): QueryBuilder;
  inRect(x: number, y: number, w: number, h: number): QueryBuilder;
  near(entityId: EntityId, radius: number): QueryBuilder;
  execute(): EntityId[];
}
```

---

## Part 2: Event System

### Event Bus

```typescript
type EventType = string;
type EventHandler = (event: GameEvent) => void;
type EventPriority = 'immediate' | 'high' | 'normal' | 'low' | 'deferred';

interface GameEvent {
  readonly type: EventType;
  readonly tick: Tick;
  readonly timestamp: number; // Real world timestamp for debugging
  readonly source: EntityId | SystemId | 'world';
  readonly data: Record<string, unknown>;
}

interface EventBus {
  // Subscribe to events
  subscribe(
    eventType: EventType | EventType[],
    handler: EventHandler,
    priority?: EventPriority
  ): Unsubscribe;

  // Emit an event (queued by default)
  emit(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

  // Emit immediately (use sparingly - breaks determinism if not careful)
  emitImmediate(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

  // Process all queued events (called once per tick)
  flush(): void;

  // For replay/debugging
  getHistory(since?: Tick): ReadonlyArray<GameEvent>;
}

type Unsubscribe = () => void;
```

### Event Categories

Events are namespaced for organization. Systems subscribe to what they care about.

```typescript
// Naming convention: domain:action:detail
// Examples:
// - entity:created
// - entity:destroyed
// - entity:component:added
// - entity:component:removed
// - agent:action:started
// - agent:action:completed
// - agent:action:failed
// - agent:decision:requested
// - agent:decision:received
// - world:tick:start
// - world:tick:end
// - world:time:hour
// - world:time:day
// - world:time:season
// - needs:critical (when any need hits danger zone)
// - memory:created
// - memory:consolidated
// - conversation:started
// - conversation:ended
// - relationship:formed
// - relationship:changed
// - economy:transaction
// - building:constructed
// - research:discovered
// - chronicle:written

interface EventTypeRegistry {
  // Self-documenting event catalog
  readonly eventTypes: Map<EventType, EventTypeDefinition>;

  register(type: EventType, definition: EventTypeDefinition): void;
}

interface EventTypeDefinition {
  readonly type: EventType;
  readonly description: string;
  readonly dataSchema: Record<string, 'string' | 'number' | 'boolean' | 'entityId' | 'object'>;
  readonly emittedBy: SystemId[];
  readonly consumedBy: SystemId[];
}
```

### Standard Events

```typescript
// Core events that most systems will need
interface EntityCreatedEvent extends GameEvent {
  type: 'entity:created';
  data: {
    entityId: EntityId;
    archetype: string;
    components: ComponentType[];
  };
}

interface EntityDestroyedEvent extends GameEvent {
  type: 'entity:destroyed';
  data: {
    entityId: EntityId;
    reason: string;
    finalState: Record<ComponentType, Component>; // Snapshot for history
  };
}

interface ComponentAddedEvent extends GameEvent {
  type: 'entity:component:added';
  data: {
    entityId: EntityId;
    componentType: ComponentType;
  };
}

interface ActionCompletedEvent extends GameEvent {
  type: 'agent:action:completed';
  data: {
    agentId: EntityId;
    actionType: string;
    result: 'success' | 'failure' | 'interrupted';
    details: Record<string, unknown>;
  };
}

interface TimeEvent extends GameEvent {
  type: 'world:time:hour' | 'world:time:day' | 'world:time:season' | 'world:time:year';
  data: {
    hour: number;
    day: number;
    season: string;
    year: number;
  };
}
```

---

## Part 3: Action System

### Agent Intent vs World Reality

Agents don't directly modify the world. They express **intent** through actions.
The world **validates** and **applies** (or rejects) these actions.

This separation is critical for:
- Deterministic replay
- Validation rules that can be added later
- Conflict resolution (two agents want the same resource)
- Debugging (see what agents tried to do vs what happened)

```typescript
type ActionType = string;
type ActionStatus = 'pending' | 'validated' | 'executing' | 'completed' | 'failed' | 'cancelled';

interface Action {
  readonly id: string; // UUID
  readonly type: ActionType;
  readonly actorId: EntityId;
  readonly targetId?: EntityId;
  readonly targetPosition?: { x: number; y: number };
  readonly parameters: Record<string, unknown>;
  readonly priority: number;
  readonly createdAt: Tick;

  // Filled in during execution
  status: ActionStatus;
  startedAt?: Tick;
  completedAt?: Tick;
  result?: ActionResult;
}

interface ActionResult {
  readonly success: boolean;
  readonly reason?: string; // Why it failed
  readonly effects: ActionEffect[]; // What changed
  readonly events: GameEvent[]; // Events to emit
}

interface ActionEffect {
  readonly type: 'component:set' | 'component:update' | 'entity:create' | 'entity:destroy';
  readonly target: EntityId;
  readonly data: unknown;
}
```

### Action Registry

```typescript
interface ActionRegistry {
  register(type: ActionType, handler: ActionHandler): void;
  get(type: ActionType): ActionHandler | undefined;
}

interface ActionHandler {
  readonly type: ActionType;
  readonly description: string;

  // How long this action takes (in ticks). 0 = instant
  getDuration(action: Action, world: World): number;

  // Can this action be performed? Called before execution.
  validate(action: Action, world: World): ValidationResult;

  // Execute the action. Returns effects to apply.
  execute(action: Action, world: World): ActionResult;

  // Can this action be interrupted?
  readonly interruptible: boolean;

  // Called if interrupted
  onInterrupt?(action: Action, world: World, reason: string): ActionEffect[];
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: ActionType[]; // Alternative actions if this one invalid
}
```

### Action Queue

```typescript
interface ActionQueue {
  // Submit a new action (from agent decision or system)
  submit(action: Omit<Action, 'id' | 'status' | 'createdAt'>): string; // Returns action ID

  // Get pending actions for an entity
  getPending(entityId: EntityId): Action[];

  // Get currently executing action for an entity
  getExecuting(entityId: EntityId): Action | undefined;

  // Cancel an action
  cancel(actionId: string, reason: string): boolean;

  // Process actions (called each tick)
  process(world: World): void;

  // History for debugging/replay
  getHistory(since?: Tick): ReadonlyArray<Action>;
}
```

### Core Actions (Minimal Stable Set)

```typescript
// Movement
interface MoveAction extends Action {
  type: 'move';
  parameters: {
    direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    // OR
    targetX: number;
    targetY: number;
  };
}

// Item manipulation
interface PickupAction extends Action {
  type: 'pickup';
  targetId: EntityId; // The item
}

interface DropAction extends Action {
  type: 'drop';
  parameters: {
    itemId: EntityId;
    position?: { x: number; y: number };
  };
}

interface GiveAction extends Action {
  type: 'give';
  targetId: EntityId; // The recipient
  parameters: {
    itemId: EntityId;
  };
}

// Interaction
interface UseAction extends Action {
  type: 'use';
  targetId: EntityId; // The thing to use (tool, workstation, etc.)
  parameters: {
    itemId?: EntityId; // Item to use it with
  };
}

interface TalkAction extends Action {
  type: 'talk';
  targetId: EntityId; // The agent to talk to
  parameters: {
    topic?: string;
    intent?: 'greet' | 'ask' | 'tell' | 'trade' | 'argue' | 'comfort';
  };
}

// Work
interface WorkAction extends Action {
  type: 'work';
  targetId: EntityId; // The workstation/field/etc
  parameters: {
    task: string; // e.g., 'till', 'plant', 'harvest', 'craft', 'build'
    recipe?: string; // For crafting
    materials?: EntityId[]; // Items to use
  };
}

// Rest
interface RestAction extends Action {
  type: 'rest';
  targetId?: EntityId; // Bed, chair, etc.
  parameters: {
    duration: number; // In ticks
  };
}

// Meta-action: Wait for something
interface WaitAction extends Action {
  type: 'wait';
  parameters: {
    duration: number;
    reason?: string;
    until?: {
      event: EventType;
      condition?: Record<string, unknown>;
    };
  };
}
```

---

## Part 4: State Schema & Serialization

### Save File Format

```typescript
interface SaveFile {
  // Header - always parsed first
  readonly header: SaveHeader;

  // World state
  readonly world: SerializedWorld;

  // Optional: Event history for replay (can be large)
  readonly eventHistory?: SerializedEvent[];

  // Optional: Action history
  readonly actionHistory?: SerializedAction[];
}

interface SaveHeader {
  // Version info for migrations
  readonly saveVersion: number; // Overall save format version
  readonly gameVersion: string; // Semantic version of game that created this
  readonly componentVersions: Record<ComponentType, number>; // Version of each component schema

  // Metadata
  readonly createdAt: string; // ISO timestamp
  readonly lastPlayedAt: string;
  readonly playTime: number; // Total seconds played
  readonly tick: Tick;

  // Feature flags - what systems are active in this save
  readonly features: FeatureFlags;

  // World info (for save selection UI)
  readonly worldName: string;
  readonly worldSeed: string;
  readonly agentCount: number;
  readonly villageName: string;
}

interface FeatureFlags {
  // Each feature that can be toggled
  [feature: string]: boolean | { enabled: boolean; version: number; config?: unknown };
}

// Examples:
// features: {
//   "farming": true,
//   "animals": { enabled: true, version: 2 },
//   "trade": { enabled: true, version: 1, config: { caravansEnabled: false } },
//   "chroniclers": false, // Not enabled in this save
//   "multiVillage": false,
// }
```

### Serialized World

```typescript
interface SerializedWorld {
  readonly tick: Tick;
  readonly gameTime: SerializedGameTime;
  readonly chunks: SerializedChunk[];
  readonly entities: SerializedEntity[];
  readonly globals: SerializedGlobals;
}

interface SerializedGameTime {
  readonly totalTicks: Tick;
  readonly hour: number; // 0-23
  readonly day: number; // 1-based
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
  readonly year: number;
}

interface SerializedChunk {
  readonly x: number;
  readonly y: number;
  readonly generated: boolean;
  readonly tiles: SerializedTile[]; // Flat array, row-major
  readonly entityIds: EntityId[]; // Entities in this chunk
}

interface SerializedTile {
  readonly terrain: string; // Terrain type ID
  readonly floor?: string; // Floor/path type ID
  readonly moisture: number;
  readonly fertility: number;
  // Additional tile data added by features:
  readonly [key: string]: unknown;
}

interface SerializedEntity {
  readonly id: EntityId;
  readonly archetype: string;
  readonly createdAt: Tick;
  readonly components: SerializedComponent[];
}

interface SerializedComponent {
  readonly type: ComponentType;
  readonly version: number;
  readonly data: Record<string, unknown>;
}

interface SerializedGlobals {
  // Global state not tied to entities
  readonly economyState?: unknown;
  readonly researchState?: unknown;
  readonly weatherState?: unknown;
  readonly [system: string]: unknown;
}
```

### Migration System

```typescript
interface MigrationRegistry {
  // Register a migration from one save version to the next
  registerSaveMigration(fromVersion: number, migration: SaveMigration): void;

  // Register a component schema migration
  registerComponentMigration(
    componentType: ComponentType,
    fromVersion: number,
    migration: ComponentMigration
  ): void;

  // Apply all necessary migrations to a save
  migrate(save: SaveFile): SaveFile;
}

interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  // Transform the entire save structure
  migrate(save: SaveFile): SaveFile;
}

interface ComponentMigration {
  readonly componentType: ComponentType;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  // Transform component data
  migrate(oldData: Record<string, unknown>): Record<string, unknown>;
}

// Example migrations:
const migrateNeedsV1toV2: ComponentMigration = {
  componentType: 'needs',
  fromVersion: 1,
  toVersion: 2,
  description: 'Split "energy" into "energy" and "rest" needs',
  migrate(old) {
    return {
      ...old,
      energy: old.energy,
      rest: old.energy, // New field, initialize from old energy
      restDecayRate: 0.1, // New field with default
    };
  },
};

const migrateSaveV3toV4: SaveMigration = {
  fromVersion: 3,
  toVersion: 4,
  description: 'Add chronicler system',
  migrate(save) {
    return {
      ...save,
      header: {
        ...save.header,
        saveVersion: 4,
        features: {
          ...save.header.features,
          chroniclers: { enabled: true, version: 1 },
        },
      },
      world: {
        ...save.world,
        globals: {
          ...save.world.globals,
          chroniclerState: {
            books: [],
            pendingEvents: [],
          },
        },
      },
    };
  },
};
```

### Serialization Utilities

```typescript
interface Serializer {
  // Save game to file
  save(world: World, path: string): Promise<void>;

  // Load game from file
  load(path: string): Promise<SaveFile>;

  // Validate a save file without fully loading
  validate(path: string): Promise<ValidationReport>;

  // Export to JSON (for debugging)
  toJSON(world: World): string;

  // Create a snapshot (for undo/autosave)
  snapshot(world: World): SaveFile;
}

interface ValidationReport {
  valid: boolean;
  saveVersion: number;
  currentVersion: number;
  migrationRequired: boolean;
  migrationsNeeded: number;
  errors: string[];
  warnings: string[];
}
```

---

## Part 5: System Execution Order

### The Game Loop

```typescript
interface GameLoop {
  // Fixed timestep: 20 TPS = 50ms per tick
  readonly tickRate: 20;
  readonly msPerTick: 50;

  // Systems execute in priority order each tick
  readonly systemPriorities: SystemPriority;

  tick(world: World): void;
}

interface SystemPriority {
  // Phase 1: Input & Time (priority 0-99)
  TIME: 0;
  INPUT: 10;

  // Phase 2: Agent Decisions (priority 100-199)
  AGENT_DECISION_REQUEST: 100;
  AGENT_DECISION_RECEIVE: 110;

  // Phase 3: Action Processing (priority 200-299)
  ACTION_VALIDATION: 200;
  ACTION_EXECUTION: 210;

  // Phase 4: World Simulation (priority 300-499)
  NEEDS: 300;
  MOVEMENT: 310;
  PHYSICS: 320;
  FARMING: 330;
  ANIMALS: 340;
  CONSTRUCTION: 350;
  CRAFTING: 360;
  ECONOMY: 370;

  // Phase 5: Social & Memory (priority 500-599)
  CONVERSATION: 500;
  RELATIONSHIPS: 510;
  MEMORY: 520;
  CHRONICLE: 530;

  // Phase 6: World Events (priority 600-699)
  WEATHER: 600;
  WORLD_EVENTS: 610;

  // Phase 7: Cleanup & Events (priority 900-999)
  ABSTRACTION: 900; // Handle multi-village simulation levels
  EVENT_FLUSH: 910;
  CLEANUP: 920;

  // Phase 8: Rendering (priority 1000+, separate from logic)
  RENDER: 1000;
}
```

### System Registration

```typescript
interface SystemRegistry {
  register(system: System): void;
  unregister(systemId: SystemId): void;

  // Get systems in execution order
  getSorted(): System[];

  // Enable/disable systems at runtime
  enable(systemId: SystemId): void;
  disable(systemId: SystemId): void;
  isEnabled(systemId: SystemId): boolean;

  // For debugging
  getStats(): Map<SystemId, SystemStats>;
}

interface SystemStats {
  readonly systemId: SystemId;
  readonly enabled: boolean;
  readonly avgTickTime: number; // ms
  readonly maxTickTime: number;
  readonly entityCount: number; // Entities processed last tick
  readonly eventCount: number; // Events emitted last tick
}
```

---

## Part 6: Feature Development Pattern

### How to Add a New Feature

Every new feature follows this pattern:

```typescript
// 1. Define new component(s)
interface MyFeatureComponent extends Component {
  type: 'myFeature';
  // ...fields with defaults
}

// 2. Register component schema
componentRegistry.register('myFeature', {
  type: 'myFeature',
  version: 1,
  fields: [
    { name: 'someField', type: 'number', required: false, default: 0 },
  ],
  validate: (data) => true,
});

// 3. Define new action(s) if needed
interface MyFeatureAction extends Action {
  type: 'myFeature:doThing';
  parameters: { /* ... */ };
}

// 4. Register action handler
actionRegistry.register('myFeature:doThing', {
  type: 'myFeature:doThing',
  description: 'Does the thing',
  getDuration: () => 10,
  validate: (action, world) => ({ valid: true }),
  execute: (action, world) => ({ success: true, effects: [], events: [] }),
  interruptible: true,
});

// 5. Define new event(s)
interface MyFeatureEvent extends GameEvent {
  type: 'myFeature:happened';
  data: { /* ... */ };
}

// 6. Create the system
const myFeatureSystem: System = {
  id: 'myFeature',
  priority: 400, // Choose appropriate phase
  requiredComponents: ['myFeature'],

  update(world, entities, dt) {
    for (const entity of entities) {
      // Process entities with this component
    }
  },

  onEvent(event) {
    // React to relevant events
  },
};

// 7. Register the system
systemRegistry.register(myFeatureSystem);

// 8. Add feature flag
// features: { "myFeature": { enabled: true, version: 1 } }

// 9. Add migration if adding to existing saves
migrationRegistry.registerSaveMigration(currentVersion, {
  fromVersion: currentVersion,
  toVersion: currentVersion + 1,
  description: 'Add myFeature system',
  migrate(save) {
    // Add component to relevant entities
    // Add feature flag
    // Initialize global state
  },
});
```

### Backwards Compatibility Checklist

For every feature:

- [ ] New components have `version: 1` and all fields have defaults
- [ ] New actions are registered, not hardcoded
- [ ] Events use namespaced types (`myFeature:action`)
- [ ] System checks feature flag before running
- [ ] Migration adds feature flag to old saves
- [ ] Migration adds default component values to existing entities
- [ ] Old saves without feature continue to work (feature just disabled)
- [ ] Can enable feature on old save via migration

---

## Part 7: Module Boundaries

### Package Structure

```
ai-village/
├── packages/
│   ├── core/              # ECS, Events, Actions, Serialization
│   │   ├── ecs/
│   │   ├── events/
│   │   ├── actions/
│   │   ├── serialization/
│   │   └── index.ts
│   │
│   ├── world/             # Chunks, Terrain, Time, Weather
│   │   ├── chunks/
│   │   ├── terrain/
│   │   ├── time/
│   │   └── index.ts
│   │
│   ├── agents/            # Agent components, decisions, LLM interface
│   │   ├── components/
│   │   ├── decisions/
│   │   ├── llm/
│   │   └── index.ts
│   │
│   ├── systems/           # All game systems
│   │   ├── needs/
│   │   ├── movement/
│   │   ├── farming/
│   │   ├── construction/
│   │   ├── crafting/
│   │   ├── economy/
│   │   ├── social/
│   │   ├── memory/
│   │   └── index.ts
│   │
│   ├── content/           # Items, buildings, recipes, species
│   │   ├── items/
│   │   ├── buildings/
│   │   ├── recipes/
│   │   ├── species/
│   │   └── index.ts
│   │
│   ├── renderer/          # Pixel art rendering, UI
│   │   ├── canvas/
│   │   ├── sprites/
│   │   ├── ui/
│   │   └── index.ts
│   │
│   └── game/              # Main game loop, save/load, config
│       ├── loop/
│       ├── saves/
│       ├── config/
│       └── index.ts
```

### Import Rules

```typescript
// core/ has no dependencies on other packages
// world/ depends only on core/
// agents/ depends on core/, world/
// systems/ depends on core/, world/, agents/
// content/ depends on core/
// renderer/ depends on core/, world/, agents/
// game/ depends on everything

// Within a package, use relative imports
// Across packages, import from package index:
import { Entity, Component, EventBus } from '@ai-village/core';
import { Chunk, TimeManager } from '@ai-village/world';
import { AgentComponent, DecisionEngine } from '@ai-village/agents';
```

---

## Summary: The Stability Contract

### Things That Never Change

1. `EntityId` is always a string UUID
2. `Component` always has `type` and `version`
3. `Action` always has `id`, `type`, `actorId`, `status`
4. `GameEvent` always has `type`, `tick`, `source`, `data`
5. `SaveFile` always has `header` with `saveVersion`
6. Systems always have `id`, `priority`, `update()`

### Things That Always Exist

1. Component registry with `createDefault()` for any type
2. Migration system that can upgrade any old save
3. Feature flags that indicate what's active
4. Event bus for decoupled communication

### Things You Can Always Add

1. New component types
2. New fields to existing components (with defaults)
3. New action types
4. New event types
5. New systems
6. New feature flags

### Things You Never Do

1. Remove a component type (deprecate instead)
2. Remove a field (keep with default, stop using)
3. Change the type of a field (add new field instead)
4. Change action/event type names (alias instead)
5. Skip save version numbers

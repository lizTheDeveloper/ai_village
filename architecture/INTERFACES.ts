/**
 * AI Village Core Interfaces
 *
 * These interfaces form the stability contract for the entire game.
 * They should be implemented exactly as defined here.
 *
 * RULES:
 * - Never remove a field, only deprecate
 * - New fields must have defaults
 * - Version numbers only increase
 */

// =============================================================================
// PRIMITIVES
// =============================================================================

/** Globally unique identifier for entities */
export type EntityId = string;

/** Identifies a component type (e.g., "position", "agent", "needs") */
export type ComponentType = string;

/** Identifies a system (e.g., "movement", "farming", "memory") */
export type SystemId = string;

/** Identifies an action type (e.g., "move", "talk", "craft") */
export type ActionType = string;

/** Identifies an event type (e.g., "entity:created", "agent:action:completed") */
export type EventType = string;

/** Game tick counter - monotonically increasing */
export type Tick = number;

/** Timestamp in milliseconds since epoch */
export type Timestamp = number;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Base interface for all components.
 * Components are pure data - no methods, no logic.
 */
export interface Component {
  /** Identifies the component type */
  readonly type: ComponentType;

  /** Schema version for migrations */
  readonly version: number;
}

/**
 * Schema definition for a component type.
 * Used for validation and migrations.
 */
export interface ComponentSchema<T extends Component = Component> {
  readonly type: ComponentType;
  readonly version: number;
  readonly fields: ReadonlyArray<FieldSchema>;

  /** Validate that data conforms to schema */
  validate(data: unknown): data is T;

  /** Create instance with all defaults */
  createDefault(): T;

  /** Migrate from previous version */
  migrateFrom?(data: unknown, fromVersion: number): T;
}

export interface FieldSchema {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'entityId'
  | 'entityIdArray'
  | 'stringArray'
  | 'numberArray'
  | 'object'
  | 'map';

/**
 * Registry for component schemas.
 * Central place for component type management.
 */
export interface ComponentRegistry {
  /** Register a new component schema */
  register<T extends Component>(schema: ComponentSchema<T>): void;

  /** Get schema for a component type */
  getSchema<T extends Component>(type: ComponentType): ComponentSchema<T> | undefined;

  /** Check if component type is registered */
  has(type: ComponentType): boolean;

  /** Create component with default values */
  createDefault<T extends Component>(type: ComponentType): T;

  /** Migrate component data from old version */
  migrate<T extends Component>(
    type: ComponentType,
    data: unknown,
    fromVersion: number
  ): T;

  /** Get all registered component types */
  getTypes(): ReadonlyArray<ComponentType>;
}

// =============================================================================
// ENTITIES
// =============================================================================

/**
 * An entity is an ID with a collection of components.
 * Entities don't have behavior - systems provide that.
 */
export interface Entity {
  /** Globally unique identifier */
  readonly id: EntityId;

  /** When this entity was created */
  readonly createdAt: Tick;

  /** Increments on any component change (for change detection) */
  readonly version: number;

  /** All components attached to this entity */
  readonly components: ReadonlyMap<ComponentType, Component>;
}

/**
 * Template for creating entities with a standard set of components.
 */
export interface EntityArchetype {
  /** Name of this archetype (e.g., "agent", "item", "building") */
  readonly name: string;

  /** Components that must exist on this entity type */
  readonly requiredComponents: ReadonlyArray<ComponentType>;

  /** Components that may exist on this entity type */
  readonly optionalComponents: ReadonlyArray<ComponentType>;

  /** Create entity from this archetype with optional overrides */
  create(
    world: WorldMutator,
    overrides?: Partial<Record<ComponentType, Partial<Component>>>
  ): EntityId;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events are immutable messages that systems use to communicate.
 */
export interface GameEvent {
  /** Event type identifier */
  readonly type: EventType;

  /** Game tick when event was emitted */
  readonly tick: Tick;

  /** Real-world timestamp for debugging */
  readonly timestamp: Timestamp;

  /** Who emitted this event */
  readonly source: EntityId | SystemId | 'world' | 'player';

  /** Event-specific payload */
  readonly data: Readonly<Record<string, unknown>>;
}

export type EventHandler = (event: GameEvent) => void;

export type EventPriority = 'immediate' | 'high' | 'normal' | 'low' | 'deferred';

export type Unsubscribe = () => void;

/**
 * Central event bus for system communication.
 */
export interface EventBus {
  /** Subscribe to one or more event types */
  subscribe(
    eventType: EventType | EventType[],
    handler: EventHandler,
    priority?: EventPriority
  ): Unsubscribe;

  /** Emit an event (queued for end of tick by default) */
  emit(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

  /** Emit immediately (use sparingly) */
  emitImmediate(event: Omit<GameEvent, 'tick' | 'timestamp'>): void;

  /** Process all queued events (called once per tick) */
  flush(): void;

  /** Get event history for replay/debugging */
  getHistory(since?: Tick): ReadonlyArray<GameEvent>;

  /** Clear history older than tick */
  pruneHistory(olderThan: Tick): void;
}

// =============================================================================
// ACTIONS
// =============================================================================

export type ActionStatus =
  | 'pending'
  | 'validated'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Actions represent agent intent. The world validates and applies them.
 */
export interface Action {
  /** Unique identifier for this action instance */
  readonly id: string;

  /** Type of action */
  readonly type: ActionType;

  /** Entity performing the action */
  readonly actorId: EntityId;

  /** Target entity (if applicable) */
  readonly targetId?: EntityId;

  /** Target position (if applicable) */
  readonly targetPosition?: Position;

  /** Action-specific parameters */
  readonly parameters: Readonly<Record<string, unknown>>;

  /** Priority for conflict resolution */
  readonly priority: number;

  /** When action was submitted */
  readonly createdAt: Tick;

  // Mutable fields (filled during execution)
  status: ActionStatus;
  startedAt?: Tick;
  completedAt?: Tick;
  result?: ActionResult;
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface ActionResult {
  readonly success: boolean;
  readonly reason?: string;
  readonly effects: ReadonlyArray<ActionEffect>;
  readonly events: ReadonlyArray<Omit<GameEvent, 'tick' | 'timestamp'>>;
}

export interface ActionEffect {
  readonly type: ActionEffectType;
  readonly target: EntityId;
  readonly data: unknown;
}

export type ActionEffectType =
  | 'component:set'
  | 'component:update'
  | 'component:remove'
  | 'entity:create'
  | 'entity:destroy';

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly suggestions?: ReadonlyArray<ActionType>;
}

/**
 * Handler for a specific action type.
 */
export interface ActionHandler {
  readonly type: ActionType;
  readonly description: string;
  readonly interruptible: boolean;

  /** Calculate action duration in ticks */
  getDuration(action: Action, world: World): number;

  /** Validate that action can be performed */
  validate(action: Action, world: World): ValidationResult;

  /** Execute the action and return effects */
  execute(action: Action, world: World): ActionResult;

  /** Called if action is interrupted */
  onInterrupt?(action: Action, world: World, reason: string): ActionEffect[];
}

/**
 * Queue and process actions.
 */
export interface ActionQueue {
  /** Submit a new action, returns action ID */
  submit(
    action: Omit<Action, 'id' | 'status' | 'createdAt'>
  ): string;

  /** Get pending actions for an entity */
  getPending(entityId: EntityId): ReadonlyArray<Action>;

  /** Get currently executing action for an entity */
  getExecuting(entityId: EntityId): Action | undefined;

  /** Cancel an action */
  cancel(actionId: string, reason: string): boolean;

  /** Process all actions (called each tick) */
  process(world: WorldMutator): void;

  /** Get action history */
  getHistory(since?: Tick): ReadonlyArray<Action>;
}

/**
 * Registry for action handlers.
 */
export interface ActionRegistry {
  register(handler: ActionHandler): void;
  get(type: ActionType): ActionHandler | undefined;
  has(type: ActionType): boolean;
  getTypes(): ReadonlyArray<ActionType>;
}

// =============================================================================
// SYSTEMS
// =============================================================================

/**
 * Systems contain game logic. They:
 * - Read component data
 * - Emit events
 * - Submit actions
 * - Never directly modify components
 */
export interface System {
  /** Unique identifier */
  readonly id: SystemId;

  /** Execution priority (lower = earlier) */
  readonly priority: number;

  /** Components required for this system to process an entity */
  readonly requiredComponents: ReadonlyArray<ComponentType>;

  /** Called once when system is registered */
  initialize?(world: World, eventBus: EventBus): void;

  /** Called each tick for entities with required components */
  update(
    world: World,
    entities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void;

  /** Handle events from other systems */
  onEvent?(event: GameEvent): void;

  /** Called when system is unregistered */
  cleanup?(): void;
}

/**
 * Registry for game systems.
 */
export interface SystemRegistry {
  register(system: System): void;
  unregister(systemId: SystemId): void;
  get(systemId: SystemId): System | undefined;

  /** Get systems sorted by priority */
  getSorted(): ReadonlyArray<System>;

  enable(systemId: SystemId): void;
  disable(systemId: SystemId): void;
  isEnabled(systemId: SystemId): boolean;

  /** Performance stats */
  getStats(): ReadonlyMap<SystemId, SystemStats>;
}

export interface SystemStats {
  readonly systemId: SystemId;
  readonly enabled: boolean;
  readonly avgTickTimeMs: number;
  readonly maxTickTimeMs: number;
  readonly lastEntityCount: number;
  readonly lastEventCount: number;
}

// =============================================================================
// WORLD (READ-ONLY)
// =============================================================================

/**
 * Read-only view of the world state.
 * Systems use this to query data.
 */
export interface World {
  /** Current game tick */
  readonly tick: Tick;

  /** Current game time */
  readonly gameTime: GameTime;

  /** All entities */
  readonly entities: ReadonlyMap<EntityId, Entity>;

  /** Event bus for communication */
  readonly eventBus: EventBus;

  /** Query entities */
  query(): QueryBuilder;

  /** Get single entity */
  getEntity(id: EntityId): Entity | undefined;

  /** Get component from entity */
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined;

  /** Check if entity has component */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean;

  /** Get entities in a chunk */
  getEntitiesInChunk(chunkX: number, chunkY: number): ReadonlyArray<EntityId>;

  /** Get entities in a rectangle */
  getEntitiesInRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): ReadonlyArray<EntityId>;

  /** Get feature flags */
  readonly features: FeatureFlags;

  /** Check if feature is enabled */
  isFeatureEnabled(feature: string): boolean;
}

export interface GameTime {
  readonly totalTicks: Tick;
  readonly ticksPerHour: number;
  readonly hour: number; // 0-23
  readonly day: number; // 1-based
  readonly season: Season;
  readonly year: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Query builder for finding entities.
 */
export interface QueryBuilder {
  /** Filter by required components */
  with(...components: ComponentType[]): QueryBuilder;

  /** Filter by tags (requires TagsComponent) */
  withTags(...tags: string[]): QueryBuilder;

  /** Filter by spatial bounds */
  inRect(x: number, y: number, width: number, height: number): QueryBuilder;

  /** Filter by chunk */
  inChunk(chunkX: number, chunkY: number): QueryBuilder;

  /** Filter by proximity to entity */
  near(entityId: EntityId, radius: number): QueryBuilder;

  /** Execute and return entity IDs */
  execute(): ReadonlyArray<EntityId>;

  /** Execute and return entities */
  executeEntities(): ReadonlyArray<Entity>;
}

// =============================================================================
// WORLD MUTATOR
// =============================================================================

/**
 * Mutable operations on the world.
 * Only the game loop should have access to this.
 */
export interface WorldMutator extends World {
  /** Create a new entity */
  createEntity(archetype: string): EntityId;

  /** Destroy an entity */
  destroyEntity(id: EntityId, reason: string): void;

  /** Add component to entity */
  addComponent(entityId: EntityId, component: Component): void;

  /** Update component on entity */
  updateComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType,
    updater: (current: T) => T
  ): void;

  /** Remove component from entity */
  removeComponent(entityId: EntityId, componentType: ComponentType): void;

  /** Advance game tick */
  advanceTick(): void;

  /** Apply action effects */
  applyEffects(effects: ReadonlyArray<ActionEffect>): void;

  /** Set feature flag */
  setFeature(feature: string, config: FeatureConfig): void;
}

// =============================================================================
// FEATURES
// =============================================================================

export interface FeatureFlags {
  readonly [feature: string]: FeatureConfig | boolean | undefined;
}

export interface FeatureConfig {
  readonly enabled: boolean;
  readonly version: number;
  readonly config?: Readonly<Record<string, unknown>>;
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Complete save file structure.
 */
export interface SaveFile {
  readonly header: SaveHeader;
  readonly world: SerializedWorld;
  readonly eventHistory?: ReadonlyArray<SerializedEvent>;
  readonly actionHistory?: ReadonlyArray<SerializedAction>;
}

export interface SaveHeader {
  /** Overall save format version */
  readonly saveVersion: number;

  /** Semantic version of game that created this save */
  readonly gameVersion: string;

  /** Version of each component schema at time of save */
  readonly componentVersions: Readonly<Record<ComponentType, number>>;

  /** When save was created */
  readonly createdAt: string;

  /** When save was last opened */
  readonly lastPlayedAt: string;

  /** Total play time in seconds */
  readonly playTime: number;

  /** Current game tick */
  readonly tick: Tick;

  /** Feature flags */
  readonly features: FeatureFlags;

  // UI metadata
  readonly worldName: string;
  readonly worldSeed: string;
  readonly agentCount: number;
  readonly villageName?: string;
}

export interface SerializedWorld {
  readonly tick: Tick;
  readonly gameTime: GameTime;
  readonly chunks: ReadonlyArray<SerializedChunk>;
  readonly entities: ReadonlyArray<SerializedEntity>;
  readonly globals: SerializedGlobals;
}

export interface SerializedChunk {
  readonly x: number;
  readonly y: number;
  readonly generated: boolean;
  readonly tiles: ReadonlyArray<SerializedTile>;
  readonly entityIds: ReadonlyArray<EntityId>;
}

export interface SerializedTile {
  readonly terrain: string;
  readonly floor?: string;
  readonly moisture: number;
  readonly fertility: number;
  readonly [key: string]: unknown;
}

export interface SerializedEntity {
  readonly id: EntityId;
  readonly archetype: string;
  readonly createdAt: Tick;
  readonly components: ReadonlyArray<SerializedComponent>;
}

export interface SerializedComponent {
  readonly type: ComponentType;
  readonly version: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SerializedGlobals {
  readonly [system: string]: unknown;
}

export interface SerializedEvent {
  readonly type: EventType;
  readonly tick: Tick;
  readonly source: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SerializedAction {
  readonly id: string;
  readonly type: ActionType;
  readonly actorId: EntityId;
  readonly status: ActionStatus;
  readonly createdAt: Tick;
  readonly completedAt?: Tick;
  readonly success?: boolean;
}

// =============================================================================
// MIGRATIONS
// =============================================================================

/**
 * Migrate save file between versions.
 */
export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  migrate(save: SaveFile): SaveFile;
}

/**
 * Migrate component data between schema versions.
 */
export interface ComponentMigration {
  readonly componentType: ComponentType;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  migrate(data: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

/**
 * Registry for migrations.
 */
export interface MigrationRegistry {
  registerSaveMigration(migration: SaveMigration): void;
  registerComponentMigration(migration: ComponentMigration): void;

  /** Get migrations needed for a save */
  getMigrationsNeeded(save: SaveFile): ReadonlyArray<SaveMigration>;

  /** Apply all needed migrations */
  migrate(save: SaveFile): SaveFile;

  /** Validate a save file */
  validate(save: SaveFile): ValidationReport;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly saveVersion: number;
  readonly currentVersion: number;
  readonly migrationRequired: boolean;
  readonly migrationsNeeded: number;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

// =============================================================================
// GAME LOOP
// =============================================================================

export interface GameLoop {
  /** Fixed tick rate */
  readonly ticksPerSecond: 20;
  readonly msPerTick: 50;

  /** Start the game loop */
  start(): void;

  /** Stop the game loop */
  stop(): void;

  /** Pause (stop ticking but keep state) */
  pause(): void;

  /** Resume from pause */
  resume(): void;

  /** Get current state */
  readonly state: GameLoopState;

  /** Get world reference */
  readonly world: World;

  /** Manually advance one tick (for debugging) */
  tick(): void;
}

export type GameLoopState = 'stopped' | 'running' | 'paused';

// =============================================================================
// SERIALIZER
// =============================================================================

export interface Serializer {
  /** Save game to storage */
  save(world: World, name: string): Promise<void>;

  /** Load game from storage */
  load(name: string): Promise<SaveFile>;

  /** List available saves */
  listSaves(): Promise<ReadonlyArray<SaveHeader>>;

  /** Delete a save */
  deleteSave(name: string): Promise<void>;

  /** Export to JSON string */
  toJSON(world: World): string;

  /** Create snapshot for undo/autosave */
  snapshot(world: World): SaveFile;

  /** Restore from snapshot */
  restore(snapshot: SaveFile): WorldMutator;
}

// =============================================================================
// LLM INTERFACE (for agent decisions)
// =============================================================================

export interface LLMProvider {
  readonly name: string;
  readonly model: string;

  /** Make a decision for an agent */
  decide(request: DecisionRequest): Promise<DecisionResponse>;

  /** Batch multiple decisions */
  decideBatch(requests: ReadonlyArray<DecisionRequest>): Promise<ReadonlyArray<DecisionResponse>>;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

export interface DecisionRequest {
  readonly agentId: EntityId;
  readonly prompt: string;
  readonly availableActions: ReadonlyArray<AvailableAction>;
  readonly context: DecisionContext;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface AvailableAction {
  readonly type: ActionType;
  readonly description: string;
  readonly parameters?: ReadonlyArray<{
    name: string;
    type: string;
    required: boolean;
    options?: ReadonlyArray<string>;
  }>;
}

export interface DecisionContext {
  readonly agentState: Readonly<Record<string, unknown>>;
  readonly visibleEntities: ReadonlyArray<VisibleEntity>;
  readonly recentMemories?: ReadonlyArray<string>;
  readonly currentAction?: string;
  readonly conversationHistory?: ReadonlyArray<string>;
}

export interface VisibleEntity {
  readonly id: EntityId;
  readonly type: string;
  readonly name?: string;
  readonly distance: number;
  readonly direction: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface DecisionResponse {
  readonly agentId: EntityId;
  readonly action: ActionType;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly reasoning?: string;
  readonly confidence?: number;
  readonly rawResponse?: string;
}

// =============================================================================
// CORE COMPONENTS (Stable - these never break)
// =============================================================================

export interface PositionComponent extends Component {
  readonly type: 'position';
  x: number;
  y: number;
  chunkX: number;
  chunkY: number;
}

export interface IdentityComponent extends Component {
  readonly type: 'identity';
  name: string;
  species?: string;
  pronouns?: string;
  description?: string;
}

export interface PhysicsComponent extends Component {
  readonly type: 'physics';
  solid: boolean;
  width: number;
  height: number;
}

export interface RenderableComponent extends Component {
  readonly type: 'renderable';
  spriteId: string;
  layer: RenderLayer;
  visible: boolean;
  animationState?: string;
  tint?: number;
}

export type RenderLayer =
  | 'terrain'
  | 'floor'
  | 'object'
  | 'entity'
  | 'effect'
  | 'ui';

export interface OwnershipComponent extends Component {
  readonly type: 'ownership';
  ownerId: EntityId | null;
  acquiredAt: Tick;
}

export interface ContainerComponent extends Component {
  readonly type: 'container';
  slots: number;
  contents: EntityId[];
  acceptsTypes?: string[];
  locked?: boolean;
}

export interface TagsComponent extends Component {
  readonly type: 'tags';
  tags: string[];
}

// =============================================================================
// VERSION CONSTANTS
// =============================================================================

export const CURRENT_SAVE_VERSION = 1;
export const GAME_VERSION = '0.1.0';
export const TICKS_PER_SECOND = 20;
export const MS_PER_TICK = 50;
export const CHUNK_SIZE = 32;

import type {
  EntityId,
  ComponentType,
  Tick,
  GameTime,
  FeatureFlags,
  Season,
} from '../types.js';
import type { UniverseDivineConfig } from '../divinity/UniverseConfig.js';
import type { Component } from './Component.js';
import type { Entity } from './Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { IQueryBuilder } from './QueryBuilder.js';
import { QueryBuilder } from './QueryBuilder.js';
import { EntityImpl, createEntityId } from './Entity.js';
import { createBuildingComponent, type BuildingType } from '../components/BuildingComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { PlacementValidator } from '../buildings/PlacementValidator.js';
import { resetUsedNames } from '../components/IdentityComponent.js';
import type { TerrainType, BiomeType } from '../types/TerrainTypes.js';
import { SimulationScheduler } from './SimulationScheduler.js';
import { diagnosticsHarness } from '../diagnostics/DiagnosticsHarness.js';
import { SpatialGrid } from './SpatialGrid.js';
import { QueryCache } from './QueryCache.js';
import { PositionSoA, VelocitySoA } from './SoAStorage.js';
import { DirtyTracker } from './DirtyTracker.js';
import { ChunkTickScheduler } from './ChunkTickScheduler.js';
import { UpdatePropagation } from './UpdatePropagation.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { createPhysicsComponent } from '../components/PhysicsComponent.js';

// Imports for test helper convenience methods
import { createDominanceRankComponent } from '../components/DominanceRankComponent.js';
import { createCombatStatsComponent } from '../components/CombatStatsComponent.js';
import { createConflictComponent } from '../components/ConflictComponent.js';
import { createGuardDutyComponent } from '../components/GuardDutyComponent.js';
import { createInjuryComponent } from '../components/InjuryComponent.js';
import { TrustNetworkComponent } from '../components/TrustNetworkComponent.js';
import { SocialGradientComponent } from '../components/SocialGradientComponent.js';
import { ExplorationStateComponent } from '../components/ExplorationStateComponent.js';
import { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { BeliefComponent } from '../components/BeliefComponent.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { NeedsComponent } from '../components/NeedsComponent.js';

// ChunkManager is defined via IChunkManager interface to avoid circular dependency

// Re-export for backwards compatibility
export type { TerrainType, BiomeType };

/**
 * Chunk interface from world package.
 * Defined here to avoid circular dependency.
 */
export interface IChunk {
  readonly x: number;
  readonly y: number;
  generated: boolean;
  tiles: unknown[];
  entities: Set<EntityId>;
}

/**
 * ChunkManager interface for tile access.
 * Defined here to avoid circular dependency with world package.
 */
export interface IChunkManager {
  getChunk(chunkX: number, chunkY: number): IChunk | undefined;
  hasChunk(chunkX: number, chunkY: number): boolean;
  getLoadedChunks?(): Array<{ x: number; y: number; tiles: any[] }>;
}

/**
 * TerrainGenerator interface for generating chunks on-demand.
 * Defined here to avoid circular dependency with world package.
 */
export interface ITerrainGenerator {
  generateChunk(chunk: IChunk, world: WorldMutator): void;
}

/**
 * BackgroundChunkGenerator interface for asynchronous chunk pre-generation.
 * Defined here to avoid circular dependency with world package.
 */
export interface IBackgroundChunkGenerator {
  queueChunk(request: {
    chunkX: number;
    chunkY: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    requestedBy: string;
  }): void;
  queueChunkGrid(
    centerX: number,
    centerY: number,
    radius: number,
    priority: 'HIGH' | 'MEDIUM' | 'LOW',
    requestedBy: string
  ): void;
  processQueue(world: World, currentTick: number): void;
}

/**
 * Planet interface for multi-planet support.
 * Defined here to avoid circular dependency with world package.
 *
 * Each planet has its own:
 * - ChunkManager for terrain storage
 * - TerrainGenerator with planet-specific parameters
 * - Named locations registry
 * - Entity tracking
 */
export interface IPlanet {
  /** Planet configuration */
  readonly config: {
    id: string;
    name: string;
    type: string;
    seed: string;
    gravity?: number;
    atmosphereDensity?: number;
    isTidallyLocked?: boolean;
    isStarless?: boolean;
    dayLengthHours?: number;
    skyColor?: string;
    description?: string;
  };

  /** Get chunk manager for this planet */
  readonly chunkManager: IChunkManager;

  /** Get a chunk, generating terrain if needed */
  getChunk(chunkX: number, chunkY: number, world?: WorldMutator): IChunk;

  /** Get tile at world coordinates */
  getTileAt(worldX: number, worldY: number): ITile | undefined;

  /** Planet ID shortcut */
  readonly id: string;

  /** Planet name shortcut */
  readonly name: string;

  /** Planet type shortcut */
  readonly type: string;

  /** Add entity to this planet's tracking */
  addEntity(entityId: string): void;

  /** Remove entity from this planet's tracking */
  removeEntity(entityId: string): void;

  /** Check if entity is on this planet */
  hasEntity(entityId: string): boolean;

  /** Get all entity IDs on this planet */
  readonly entities: ReadonlySet<string>;

  /** Get entity count on this planet */
  readonly entityCount: number;

  /** Name a location on this planet */
  nameLocation(
    chunkX: number,
    chunkY: number,
    name: string,
    namedBy: string,
    tick: number,
    description?: string
  ): void;

  /** Find a named location */
  findLocation(name: string): { chunkX: number; chunkY: number } | undefined;

  /** Get the name of a location */
  getLocationName(chunkX: number, chunkY: number): string | undefined;
}

/**
 * Wall tile structure for voxel buildings.
 */
export interface IWallTile {
  material: string;
  condition: number;
  insulation: number;
  constructionProgress?: number;
}

/**
 * Door tile structure for voxel buildings.
 */
export interface IDoorTile {
  material: string;
  state: 'open' | 'closed' | 'locked';
  lastOpened?: number;
  constructionProgress?: number;
}

/**
 * Window tile structure for voxel buildings.
 */
export interface IWindowTile {
  material: string;
  condition: number;
  lightsThrough: boolean;
  constructionProgress?: number;
}

/**
 * Archetype definition for entity pre-configuration
 */
interface ArchetypeDefinition {
  /** Human-readable description */
  description: string;
  /** Component factory function */
  apply: (entity: EntityImpl) => void;
}

/**
 * Registry of entity archetypes for pre-configured entity creation.
 *
 * Usage:
 * - 'agent': Minimal agent with just tags (use createWanderingAgent/createLLMAgent for full agents)
 * - 'building': Basic building entity with position, renderable, tags
 * - 'plant': Plant entity with position, renderable, tags, physics
 * - 'animal': Animal entity with position, renderable, tags, physics
 * - 'item': Item/resource entity with position, renderable, tags
 * - 'deity': Divine entity with tags
 *
 * Note: For full agent creation with all cognitive systems, use createWanderingAgent() or
 * createLLMAgent() from @ai-village/agents package. The 'agent' archetype here is minimal.
 */
const ENTITY_ARCHETYPES: Record<string, ArchetypeDefinition> = {
  agent: {
    description: 'Minimal agent entity (use createWanderingAgent/createLLMAgent for full agents)',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createTagsComponent('agent'));
    },
  },

  building: {
    description: 'Basic building entity with position, renderable, and tags',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('building', 'entity'));
      entity.addComponent(createTagsComponent('building'));
      entity.addComponent(createPhysicsComponent(true, 2, 2)); // Solid, 2x2 footprint
    },
  },

  plant: {
    description: 'Plant entity with position, renderable, tags, and plant component',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('plant', 'entity'));
      entity.addComponent(createTagsComponent('plant'));
      entity.addComponent(createPhysicsComponent(false, 1, 1)); // Non-solid
      // PlantComponent should be added separately with specific plant genetics
    },
  },

  animal: {
    description: 'Animal entity with position, renderable, tags, and physics (AnimalComponent should be added separately with full data)',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('animal', 'entity'));
      entity.addComponent(createTagsComponent('animal'));
      entity.addComponent(createPhysicsComponent(false, 1, 1)); // Non-solid
      // Note: AnimalComponent requires extensive data - add it separately after entity creation
    },
  },

  item: {
    description: 'Item/resource entity with position, renderable, and tags',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('item', 'entity'));
      entity.addComponent(createTagsComponent('item', 'resource'));
      entity.addComponent(createPhysicsComponent(false, 1, 1)); // Non-solid, can be picked up
    },
  },

  deity: {
    description: 'Divine entity with deity tags',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createTagsComponent('deity', 'divine', 'immortal'));
    },
  },

  companion: {
    description: 'Companion entity (use createOphanimimCompanion for full setup)',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createTagsComponent('companion', 'divine', 'immortal', 'conversational'));
    },
  },

  spaceship: {
    description: 'Spaceship entity with position, renderable, and tags',
    apply: (entity: EntityImpl) => {
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRenderableComponent('spaceship', 'entity'));
      entity.addComponent(createTagsComponent('spaceship', 'vehicle'));
      entity.addComponent(createPhysicsComponent(true, 3, 3)); // Solid, 3x3 footprint
    },
  },
};

/**
 * Tile interface for world coordinates.
 * Defined here to avoid circular dependency with world package.
 * Must match the Tile interface in @ai-village/world.
 */
export interface ITile {
  terrain: TerrainType;
  floor?: string;
  elevation?: number;
  moisture: number;
  fertility: number;
  biome?: BiomeType;
  tilled: boolean;
  plantability: number;
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  fertilized: boolean;
  fertilizerDuration: number;
  lastWatered: number;
  lastTilled: number;
  composted: boolean;
  plantId: string | null;

  // Tile-based voxel building support
  wall?: IWallTile;
  door?: IDoorTile;
  window?: IWindowTile;
}

/**
 * Read-only view of the world state.
 * Systems use this to query data.
 */
export interface World {
  /** Current game tick */
  readonly tick: Tick;

  /**
   * Archetype version counter.
   * Increments whenever entity/component structure changes.
   * Used by GameLoop for query caching.
   */
  readonly archetypeVersion: number;

  /** Current game time */
  readonly gameTime: GameTime;

  /** All entities */
  readonly entities: ReadonlyMap<EntityId, Entity>;

  /** Event bus for communication */
  readonly eventBus: EventBus;

  /** Get event bus (for backward compatibility) */
  getEventBus(): EventBus;

  /** Query entities */
  query(): IQueryBuilder;

  /** Get single entity */
  getEntity(id: EntityId): Entity | undefined;

  /** Get component from entity */
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined;

  /** Get singleton component (searches all entities for first match) */
  getComponent<T extends Component>(componentType: ComponentType): T | undefined;

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

  /** Simulation scheduler for performance optimization */
  readonly simulationScheduler: SimulationScheduler;

  /**
   * Spatial grid for high-performance proximity queries.
   * Grid-based spatial hashing for O(1) lookups instead of O(n) entity iteration.
   * Maintained by SpatialGridMaintenanceSystem.
   */
  readonly spatialGrid: SpatialGrid;

  /**
   * Query result cache for high-performance repeated queries.
   * Automatically invalidates when world structure changes.
   *
   * Performance:
   * - Cache hit: ~0.1ms (Map lookup)
   * - Cache miss: ~1-5ms (full query execution)
   * - Expected hit rate: 85-90%
   * - Memory overhead: ~10-50 KB (100 entries)
   */
  readonly queryCache: QueryCache;

  /**
   * Minecraft-style dirty tracker for incremental change detection.
   * Tracks which entities/components changed this tick.
   *
   * Performance:
   * - getDirtyByComponent: O(1) lookup for changed entities
   * - Enables incremental sync instead of full iteration
   *
   * Used by SoASyncSystem to only update changed entities.
   */
  readonly dirtyTracker: DirtyTracker;

  /**
   * Structure-of-Arrays storage for Position components.
   * Provides cache-efficient batch access for hot path systems.
   *
   * Performance benefits:
   * - Better cache locality (sequential memory access)
   * - SIMD potential (process 4-8 positions at once)
   * - 1.5-2x speedup for batch operations
   *
   * Maintained by SoASyncSystem - do not modify directly.
   */
  getPositionSoA(): PositionSoA;

  /**
   * Structure-of-Arrays storage for Velocity components.
   * Provides cache-efficient batch access for hot path systems.
   *
   * Performance benefits:
   * - Better cache locality (sequential memory access)
   * - SIMD potential (process 4-8 velocities at once)
   * - 1.3-1.5x speedup for batch operations
   *
   * Maintained by SoASyncSystem - do not modify directly.
   */
  getVelocitySoA(): VelocitySoA;

  /**
   * Spatial query service for finding nearby entities.
   * Uses chunk-based indexing for O(nearby) instead of O(all entities).
   *
   * Prefer using BehaviorContext.getEntitiesInRadius() or
   * SystemContext.getNearbyEntities() which wrap this service.
   */
  readonly spatialQuery: import('../services/SpatialQueryService.js').SpatialQueryService | null;

  /**
   * Query entities near a point using the spatial grid.
   * Convenience method that returns full Entity objects.
   *
   * Performance: O(cells_in_radius × entities_per_cell) instead of O(all_entities)
   *
   * Note: Caller should still check exact distance with squared distance comparison.
   */
  queryEntitiesNear(x: number, y: number, radius: number): Entity[];

  /**
   * Check if any entity in the world has the given component type.
   * O(1) lookup - used for system activation checks.
   */
  hasComponentType(componentType: ComponentType): boolean;

  /** Create entity from raw components (for testing) */
  createEntity(archetype?: string): Entity;

  /**
   * Add a pre-constructed entity to the world.
   * Use this instead of (world as any)._addEntity() for type safety.
   *
   * The entity will be:
   * - Added to the entity map
   * - Indexed in the spatial chunk index (if it has a position component)
   * - Tracked in component type counts
   *
   * @param entity - The entity to add (must have a unique ID)
   * @throws Error if an entity with the same ID already exists
   */
  addEntity(entity: Entity): void;

  /**
   * Crafting system for recipe access.
   * Exposed for automation systems (AssemblyMachineSystem) to look up recipes.
   */
  readonly craftingSystem?: import('../crafting/CraftingSystem.js').CraftingSystem;

  /**
   * Item instance registry for creating unique item instances.
   * Exposed for automation systems to generate items with quality/condition.
   */
  readonly itemInstanceRegistry?: import('../items/ItemInstanceRegistry.js').ItemInstanceRegistry;

  /**
   * Initiate construction of a building.
   * Validates placement, deducts resources, creates construction site.
   * @param builderId - Optional ID of the agent who initiated construction
   * @throws Error if validation fails or insufficient resources
   */
  initiateConstruction(
    position: { x: number; y: number },
    buildingType: string,
    inventory: Record<string, number>,
    builderId?: string
  ): Entity;

  /**
   * Get tile at world coordinates.
   * Used by action handlers (tilling, planting, etc.) to access tile data.
   * Returns undefined if tile doesn't exist or ChunkManager not set.
   */
  getTileAt?(x: number, y: number): ITile | undefined;

  /**
   * Get terrain type at world coordinates.
   * Returns 'grass', 'dirt', 'water', etc. or null if tile doesn't exist.
   */
  getTerrainAt?(x: number, y: number): string | null;

  /**
   * Get tile data (fertility, moisture) at world coordinates.
   * Returns null if tile doesn't exist.
   */
  getTileData?(x: number, y: number): { fertility?: number; moisture?: number } | null;

  /** Get a system by ID */
  getSystem(systemId: string): import('./System.js').System | undefined;

  /**
   * Get chunk manager for accessing terrain chunks.
   */
  getChunkManager(): IChunkManager | undefined;

  /**
   * Get background chunk generator for asynchronous chunk pre-generation.
   */
  getBackgroundChunkGenerator(): IBackgroundChunkGenerator | undefined;

  /**
   * Get or create chunk name registry for named locations.
   */
  getChunkNameRegistry(): import('@ai-village/world').ChunkNameRegistry;

  /**
   * Divine configuration for this universe.
   * Controls how divine powers, belief economy, avatars, angels, etc. work.
   * See UniverseConfig.ts for presets (high_fantasy, grimdark, deistic, etc.)
   */
  readonly divineConfig?: Partial<UniverseDivineConfig>;

  // ===========================================================================
  // Planet System
  // ===========================================================================

  /**
   * Get all planets in this world.
   * Returns a read-only map of planet ID to planet.
   */
  getPlanets(): ReadonlyMap<string, IPlanet>;

  /**
   * Get a specific planet by ID.
   */
  getPlanet(planetId: string): IPlanet | undefined;

  /**
   * Get the currently active planet (where the player/camera is).
   * Returns undefined if no planets are registered.
   */
  getActivePlanet(): IPlanet | undefined;

  /**
   * Get the ID of the currently active planet.
   */
  readonly activePlanetId: string | undefined;

  /**
   * Check if a planet exists.
   */
  hasPlanet(planetId: string): boolean;

  /**
   * Clear all entities from the world.
   * Used by save/load system to reset world state before deserialization.
   * WARNING: This is a destructive operation - use only during load operations.
   */
  clear(): void;
}

/**
 * Mutable operations on the world.
 * Only the game loop should have access to this.
 */
export interface WorldMutator extends World {
  /** Create a new entity */
  createEntity(archetype?: string): Entity;

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

  /** Set tick (only for deserialization/time travel) */
  setTick(tick: Tick): void;

  /** Set feature flag */
  setFeature(feature: string, enabled: boolean): void;

  /**
   * Set divine configuration for this universe.
   * Controls how divine powers, belief economy, avatars, angels, etc. work.
   */
  setDivineConfig(config: Partial<UniverseDivineConfig>): void;

  // ===========================================================================
  // Planet Mutation
  // ===========================================================================

  /**
   * Register a planet with this world.
   * The first registered planet becomes the active planet.
   */
  registerPlanet(planet: IPlanet): void;

  /**
   * Remove a planet from this world.
   * Cannot remove the active planet unless it's the only one.
   */
  unregisterPlanet(planetId: string): void;

  /**
   * Set the active planet (where gameplay happens).
   * This affects which ChunkManager is used for tile access.
   */
  setActivePlanet(planetId: string): void;
}

// ===========================================================================
// Test Helper Component Registry
// ===========================================================================

// Type for component factory functions
type ComponentFactory = (data?: Record<string, unknown>) => Component;

// Component registry mapping strings to factory functions or classes
const componentRegistry: Record<string, ComponentFactory> = {
  'agent': (data = {}) => ({
    type: 'agent' as const,
    version: 1,
    behavior: (data.behavior as string) || 'wander',
    behaviorState: (data.behaviorState as Record<string, unknown>) || {},
    thinkInterval: (data.thinkInterval as number) || 20,
    lastThinkTick: (data.lastThinkTick as number) || 0,
    useLLM: (data.useLLM as boolean) || false,
    llmCooldown: (data.llmCooldown as number) || 0,
    ...data,
  }),
  'position': (data = {}) => createPositionComponent((data.x as number) || 0, (data.y as number) || 0),
  'velocity': (data = {}) => ({
    type: 'velocity' as const,
    version: 1,
    vx: (data.vx as number) || 0,
    vy: (data.vy as number) || 0,
  }),
  'resource': (data = {}) => ({
    type: 'resource' as const,
    version: 1,
    resourceType: (data.type as string) || (data.resourceType as string),
    amount: (data.amount as number) || 0,
    regenerationRate: (data.regenerationRate as number) || 0,
  }),
  'building': (data = {}) => ({
    type: 'building' as const,
    version: 1,
    buildingType: data.buildingType as string,
    ...data,
  }),
  'collision': (data = {}) => ({
    type: 'collision' as const,
    version: 1,
    radius: (data.radius as number) || 1.0,
  }),
  'trust_network': (data = {}) => new TrustNetworkComponent(data),
  'social_gradient': () => new SocialGradientComponent(),
  'spatial_memory': (data = {}) => new SpatialMemoryComponent(data),
  'belief': () => new BeliefComponent(),
  'steering': (data = {}) => ({
    type: 'steering' as const,
    version: 1,
    ...data,
  }),
  'exploration_state': (data = {}) => {
    // Support both class-based and ad-hoc exploration_state
    // Tests use ad-hoc objects with Sets, production might use the class
    if (data && typeof data === 'object' && !data.type) {
      // Ad-hoc object from tests - preserve all fields including Sets
      return {
        type: 'exploration_state' as const,
        version: 1,
        ...data,
      };
    }
    // Otherwise create the class
    return new ExplorationStateComponent();
  },
  'episodic_memory': (data = {}) => new EpisodicMemoryComponent(data),
  'dominance_rank': (data = {}) => createDominanceRankComponent(data),
  'combat_stats': (data = {}) => createCombatStatsComponent(data),
  'conflict': (data = {}) => createConflictComponent(data),
  'guard_duty': (data = {}) => createGuardDutyComponent(data),
  'skills': (data = {}) => ({
    type: 'skills' as const,
    version: 1,
    ...data,
  }),
  'animal': (data = {}) => ({
    type: 'animal' as const,
    version: 1,
    ...data,
  }),
  'territory': (data = {}) => ({
    type: 'territory' as const,
    version: 1,
    ...data,
  }),
  'injury': (data = {}) => createInjuryComponent(data),
  'inventory': (data = {}) => ({
    type: 'inventory' as const,
    version: 1,
    items: (data.items as Array<{type: string; quantity: number}>) || [],
    ...data,
  }),
  'relationship': (data = {}) => ({
    type: 'relationship' as const,
    version: 1,
    relationships: (data.relationships as Record<string, {opinion: number}>) || {},
    ...data,
  }),
  'reputation': (data = {}) => ({
    type: 'reputation' as const,
    version: 1,
    honor: (data.honor as number) || 0,
    violence: (data.violence as number) || 0,
    ...data,
  }),
  'needs': (data = {}) => new NeedsComponent(data),
  'movement': (data = {}) => ({
    type: 'movement' as const,
    version: 1,
    baseSpeed: (data.baseSpeed as number) || 1.0,
    currentSpeed: (data.currentSpeed as number) || 1.0,
    ...data,
  }),
  'environment': (data = {}) => ({
    type: 'environment' as const,
    version: 1,
    terrain: (data.terrain as string) || 'plains',
    weather: (data.weather as string) || 'clear',
    timeOfDay: (data.timeOfDay as string) || 'noon',
    ...data,
  }),
  'laws': (data = {}) => ({
    type: 'laws' as const,
    version: 1,
    murderIllegal: (data.murderIllegal as boolean) || false,
    assaultIllegal: (data.assaultIllegal as boolean) || false,
    selfDefenseLegal: (data.selfDefenseLegal as boolean) || true,
    ...data,
  }),
  'dead': (data = {}) => ({
    type: 'dead' as const,
    version: 1,
    cause: (data.cause as string) || 'unknown',
    time: (data.time as number) || 0,
    ...data,
  }),
  'pack_member': (data = {}) => ({
    type: 'pack_member' as const,
    version: 1,
    packId: (data.packId as string),
    ...data,
  }),
  'pack_combat': (data = {}) => ({
    type: 'pack_combat' as const,
    version: 1,
    coherence: (data.coherence as number) || 1.0,
    bodiesInPack: (data.bodiesInPack as string[]) || [],
    ...data,
  }),
  'hive_queen': (data = {}) => ({
    type: 'hive_queen' as const,
    version: 1,
    hiveId: (data.hiveId as string),
    ...data,
  }),
  'hive_combat': (data = {}) => ({
    type: 'hive_combat' as const,
    version: 1,
    queenDead: (data.queenDead as boolean) || false,
    collapseTriggered: (data.collapseTriggered as boolean) || false,
    ...data,
  }),

  // Backwards compatibility aliases (PascalCase → lowercase_with_underscores)
  'Velocity': (data) => componentRegistry['velocity']!(data),
  'Steering': (data) => componentRegistry['steering']!(data),
  'ExplorationState': (data) => componentRegistry['exploration_state']!(data),
  'SpatialMemory': (data) => componentRegistry['spatial_memory']!(data),
  'EpisodicMemory': (data) => componentRegistry['episodic_memory']!(data),
  'TrustNetwork': (data) => componentRegistry['trust_network']!(data),
  'SocialGradient': () => componentRegistry['social_gradient']!(),
  'Belief': () => componentRegistry['belief']!(),
  'Position': (data) => componentRegistry['position']!(data),
  'Resource': (data) => componentRegistry['resource']!(data),
  'Building': (data) => componentRegistry['building']!(data),
  'Collision': (data) => componentRegistry['collision']!(data),
  'Agent': (data) => componentRegistry['agent']!(data),
};

// Type for component class or string identifier
type ComponentClassOrString = string | { new(data?: unknown): Component } | { prototype: Component };

// Extended Entity interface with test convenience methods
interface TestEntity extends Entity {
  addComponent(ComponentClass: ComponentClassOrString, data?: Record<string, unknown>): Component;
  getComponent<T extends Component = Component>(ComponentClass: ComponentClassOrString): T | undefined;
}

/**
 * World implementation - ECS world with entity management and queries.
 * Also includes convenience test helper methods for component creation.
 */
export class WorldImpl implements WorldMutator {
  private _tick: Tick = 0;
  private _gameTime: GameTime;
  private _entities = new Map<EntityId, Entity>();
  private _features: Map<string, boolean> = new Map();
  private _featuresCache: FeatureFlags | null = null;
  private _eventBus: EventBus;

  /**
   * Archetype version - increments on entity create/destroy and component add/remove.
   * Used by GameLoop to invalidate query cache.
   */
  private _archetypeVersion = 0;
  private _chunkManager?: IChunkManager;
  private _terrainGenerator?: ITerrainGenerator;
  private _backgroundChunkGenerator?: IBackgroundChunkGenerator;
  private buildingRegistry?: BuildingBlueprintRegistry;
  private _craftingSystem?: import('../crafting/CraftingSystem.js').CraftingSystem;
  private _itemInstanceRegistry?: import('../items/ItemInstanceRegistry.js').ItemInstanceRegistry;
  private _systemRegistry?: import('./SystemRegistry.js').ISystemRegistry;
  private _divineConfig?: Partial<UniverseDivineConfig>;

  // Chunk naming registry for named locations
  private _chunkNameRegistry?: import('@ai-village/world').ChunkNameRegistry;

  // Simulation scheduling for performance optimization
  private _simulationScheduler = new SimulationScheduler();

  // Spatial grid for high-performance proximity queries
  private _spatialGrid = new SpatialGrid(10);

  // Query cache for high-performance repeated queries
  private _queryCache = new QueryCache(100);

  // SoA storage for hot path components
  private _positionSoA = new PositionSoA(1000);
  private _velocitySoA = new VelocitySoA(1000);

  // Minecraft-style optimization systems
  private _dirtyTracker = new DirtyTracker();
  private _chunkTickScheduler = new ChunkTickScheduler();
  private _updatePropagation = new UpdatePropagation();

  // Spatial indices (will be populated as needed)
  private chunkIndex = new Map<string, Set<EntityId>>();

  // Track count of entities with each component type (for O(1) hasComponentType checks)
  private _componentTypeCounts = new Map<ComponentType, number>();

  // Spatial query service for chunk-based spatial queries
  private _spatialQuery: import('../services/SpatialQueryService.js').SpatialQueryService | null = null;

  // Door location cache for fast lookups (updated when doors are built/destroyed)
  private doorLocationsCache: Array<{ x: number; y: number }> | null = null;

  // Planet system - multi-planet support
  private _planets = new Map<string, IPlanet>();
  private _activePlanetId?: string;

  constructor(eventBus: EventBus, chunkManager?: IChunkManager, systemRegistry?: import('./SystemRegistry.js').ISystemRegistry) {
    this._eventBus = eventBus;
    this._chunkManager = chunkManager;
    this._systemRegistry = systemRegistry;
    this._gameTime = {
      totalTicks: 0,
      ticksPerHour: 1200, // 1 hour = 1 minute real time at 20 TPS
      hour: 6, // Start at dawn
      day: 1,
      season: 'spring',
      year: 1,
    };
    // Reset used names when starting a new world to ensure unique names
    resetUsedNames();
  }

  get tick(): Tick {
    return this._tick;
  }

  get archetypeVersion(): number {
    return this._archetypeVersion;
  }

  get gameTime(): GameTime {
    return this._gameTime;
  }

  get entities(): ReadonlyMap<EntityId, Entity> {
    return this._entities;
  }

  get eventBus(): EventBus {
    return this._eventBus;
  }

  getEventBus(): EventBus {
    return this._eventBus;
  }

  get simulationScheduler(): SimulationScheduler {
    return this._simulationScheduler;
  }

  get spatialGrid(): SpatialGrid {
    return this._spatialGrid;
  }

  /** Minecraft-style dirty tracker for change detection */
  get dirtyTracker(): DirtyTracker {
    return this._dirtyTracker;
  }

  /** Minecraft-style chunk tick scheduler for budgeted updates */
  get chunkTickScheduler(): ChunkTickScheduler {
    return this._chunkTickScheduler;
  }

  /** Minecraft-style update propagation (redstone-like signals) */
  get updatePropagation(): UpdatePropagation {
    return this._updatePropagation;
  }

  get queryCache(): QueryCache {
    return this._queryCache;
  }

  getPositionSoA(): PositionSoA {
    return this._positionSoA;
  }

  getVelocitySoA(): VelocitySoA {
    return this._velocitySoA;
  }

  get spatialQuery(): import('../services/SpatialQueryService.js').SpatialQueryService | null {
    return this._spatialQuery;
  }

  setSpatialQuery(service: import('../services/SpatialQueryService.js').SpatialQueryService): void {
    this._spatialQuery = service;
  }

  get craftingSystem(): import('../crafting/CraftingSystem.js').CraftingSystem | undefined {
    return this._craftingSystem;
  }

  get itemInstanceRegistry(): import('../items/ItemInstanceRegistry.js').ItemInstanceRegistry | undefined {
    return this._itemInstanceRegistry;
  }

  get divineConfig(): Partial<UniverseDivineConfig> | undefined {
    return this._divineConfig;
  }

  get activePlanetId(): string | undefined {
    return this._activePlanetId;
  }

  get features(): FeatureFlags {
    if (!this._featuresCache) {
      const flags: Record<string, boolean> = {};
      for (const [key, value] of this._features) {
        flags[key] = value;
      }
      this._featuresCache = flags;
    }
    return this._featuresCache;
  }

  query(): IQueryBuilder {
    return new QueryBuilder(this);
  }

  getEntity(id: EntityId): Entity | undefined {
    return this._entities.get(id);
  }

  getComponent<T extends Component>(
    entityTypeOrEntityId: EntityId | ComponentType,
    componentType?: ComponentType
  ): T | undefined {
    // Overload: getComponent(componentType) - singleton lookup
    if (componentType === undefined) {
      const singletonComponentType = entityTypeOrEntityId as ComponentType;
      for (const entity of this._entities.values()) {
        const component = entity.components.get(singletonComponentType);
        if (component) {
          return component as T;
        }
      }
      return undefined;
    }

    // Original: getComponent(entityId, componentType)
    const entity = this._entities.get(entityTypeOrEntityId as EntityId);
    if (!entity) return undefined;
    return entity.components.get(componentType) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const entity = this._entities.get(entityId);
    return entity?.components.has(componentType) ?? false;
  }

  hasComponentType(componentType: ComponentType): boolean {
    return (this._componentTypeCounts.get(componentType) ?? 0) > 0;
  }

  getEntitiesInChunk(chunkX: number, chunkY: number): ReadonlyArray<EntityId> {
    const key = `${chunkX},${chunkY}`;
    return Array.from(this.chunkIndex.get(key) ?? []);
  }

  getEntitiesInRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): ReadonlyArray<EntityId> {
    return this.query().inRect(x, y, width, height).execute();
  }

  isFeatureEnabled(feature: string): boolean {
    return this._features.get(feature) ?? false;
  }

  // Mutator methods

  createEntity(archetype?: string): Entity {
    const id = createEntityId();
    const entity = new EntityImpl(id, this._tick);

    // Apply archetype configuration if specified
    if (archetype) {
      const archetypeDef = ENTITY_ARCHETYPES[archetype];
      if (!archetypeDef) {
        throw new Error(
          `Unknown archetype '${archetype}'. Valid archetypes: ${Object.keys(ENTITY_ARCHETYPES).join(', ')}`
        );
      }
      archetypeDef.apply(entity);
    }

    // Add test helper methods to entity
    // Type-safe: We're adding methods to EntityImpl, which is the concrete type
    const entityImpl = entity as EntityImpl;

    // Store original addComponent from EntityImpl
    const originalAddComponent = entityImpl.addComponent.bind(entity);

    // Create the enhanced addComponent function
    const enhancedAddComponent = (ComponentClassOrInstance: ComponentClassOrString, data?: Record<string, unknown>): Component => {
      // If it's already a component instance, use it directly
      if (typeof ComponentClassOrInstance === 'object' && ComponentClassOrInstance !== null && 'type' in ComponentClassOrInstance && 'version' in ComponentClassOrInstance) {
        // Type guard: checked that it has 'type' and 'version' properties, so it's a Component
        const component = ComponentClassOrInstance as Component;
        originalAddComponent(component);
        return component;
      }

      // If it's a string, look up in registry
      if (typeof ComponentClassOrInstance === 'string') {
        const factory = componentRegistry[ComponentClassOrInstance];
        if (!factory) {
          throw new Error(`Unknown component type: ${ComponentClassOrInstance}. Add it to the component registry in World.ts`);
        }
        const component = factory(data || {});
        originalAddComponent(component);
        return component;
      }

      // Otherwise, try to instantiate as a class
      try {
        const ComponentClass = ComponentClassOrInstance as { new(data?: unknown): Component };
        const component = new ComponentClass(data);
        originalAddComponent(component);
        return component;
      } catch (error) {
        throw new Error(`Failed to create component from ${ComponentClassOrInstance}: ${error}`);
      }
    };

    // Create the enhanced getComponent function
    const originalGetComponent = entity.getComponent.bind(entity);
    const enhancedGetComponent = <T extends Component = Component>(ComponentClass: ComponentClassOrString): T | undefined => {
      // If it's a string, try as-is first, then try snake_case conversion
      if (typeof ComponentClass === 'string') {
        // Try the string as-is first (for lowercase_with_underscores like 'steering', 'position')
        const direct = originalGetComponent<T>(ComponentClass);
        if (direct) return direct;

        // Fallback: Convert PascalCase to snake_case for backwards compatibility (e.g., 'TrustNetwork' -> 'trust_network')
        const typeString = ComponentClass
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, ''); // Remove leading underscore
        return originalGetComponent<T>(typeString);
      }

      // If it's a class with a prototype, get the type from an instance
      if ('prototype' in ComponentClass && ComponentClass.prototype) {
        // Create temporary instance to get type
        try {
          const ComponentConstructor = ComponentClass as { new(data?: unknown): Component };
          const temp = new ComponentConstructor({});
          return originalGetComponent<T>(temp.type);
        } catch {
          // Fallback: assume ComponentClass is the type string (shouldn't happen but be safe)
          return originalGetComponent<T>(String(ComponentClass));
        }
      }

      // Otherwise assume it's a type string
      return originalGetComponent<T>(String(ComponentClass));
    };

    // Use Object.defineProperty to bypass TypeScript's signature checking
    // This is safe because we're augmenting the object with compatible behavior
    Object.defineProperty(entityImpl, 'addComponent', {
      value: enhancedAddComponent,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(entityImpl, 'getComponent', {
      value: enhancedGetComponent,
      writable: true,
      configurable: true,
    });

    this._entities.set(id, entity);
    this._archetypeVersion++; // Invalidate query cache

    // Emit entity:created event for persistence streaming
    this._eventBus.emit({
      type: 'entity:created',
      source: 'world',
      data: { entityId: id, archetype: archetype || null },
    });

    // Return the entity with augmented methods (type-safe cast)
    return entity as Entity;
  }

  /**
   * Helper method for tests to call system.update with the right signature.
   * Converts entities Map to Array.
   */
  getAllEntities(): ReadonlyArray<Entity> {
    return Array.from(this._entities.values());
  }

  destroyEntity(id: EntityId, reason: string): void {
    const entity = this._entities.get(id);
    if (!entity) {
      throw new Error(`Entity ${id} does not exist`);
    }

    // Remove from spatial grid
    const posRaw = entity.components.get('position');
    // Type guard: check that position has required fields
    if (posRaw && typeof posRaw === 'object' && 'x' in posRaw && 'y' in posRaw && 'chunkX' in posRaw && 'chunkY' in posRaw) {
      const pos = posRaw as { x: number; y: number; chunkX: number; chunkY: number };

      this._spatialGrid.remove(id);

      // Also remove from chunk index
      const key = `${pos.chunkX},${pos.chunkY}`;
      this.chunkIndex.get(key)?.delete(id);
    } else if (posRaw) {
      // Fallback: position component exists but missing chunk coordinates
      this._spatialGrid.remove(id);
    }

    // Decrement component type counts for all components this entity has
    for (const componentType of entity.components.keys()) {
      const currentCount = this._componentTypeCounts.get(componentType) ?? 0;
      if (currentCount > 0) {
        this._componentTypeCounts.set(componentType, currentCount - 1);
      }
    }

    this._entities.delete(id);
    this._archetypeVersion++; // Invalidate query cache

    // Emit event
    this._eventBus.emit({
      type: 'entity:destroyed',
      source: 'world',
      data: {
        entityId: id,
        reason,
        finalState: Object.fromEntries(entity.components),
      },
    });
  }

  addComponent(entityId: EntityId, component: Component): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Check if entity already has this component type (for count tracking)
    const hadComponent = entity.components.has(component.type);

    // Cast to internal implementation to mutate
    const entityImpl = entity as EntityImpl;
    entityImpl.addComponent(component);
    this._archetypeVersion++; // Invalidate query cache

    // Update component type count (only if this is a new component type for this entity)
    if (!hadComponent) {
      const currentCount = this._componentTypeCounts.get(component.type) ?? 0;
      this._componentTypeCounts.set(component.type, currentCount + 1);
    }

    // Update spatial index if position component
    if (component.type === 'position') {
      // Type guard: check that position has chunk coordinates
      if ('chunkX' in component && 'chunkY' in component && typeof component.chunkX === 'number' && typeof component.chunkY === 'number') {
        const pos = component as { chunkX: number; chunkY: number };
        const key = `${pos.chunkX},${pos.chunkY}`;
        if (!this.chunkIndex.has(key)) {
          this.chunkIndex.set(key, new Set());
        }
        this.chunkIndex.get(key)!.add(entityId);
      }
    }

    // Mark entity as dirty for change tracking
    this._dirtyTracker.markDirty(entityId, component.type, 'add');

    this._eventBus.emit({
      type: 'entity:component:added',
      source: 'world',
      data: { entityId, componentType: component.type },
    });
  }

  updateComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType,
    updater: (current: T) => T
  ): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    const entityImpl = entity as EntityImpl;
    entityImpl.updateComponent(componentType, updater);

    // Mark entity as dirty for change tracking
    this._dirtyTracker.markDirty(entityId, componentType, 'update');
  }

  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Check if entity actually has this component (for count tracking)
    const hadComponent = entity.components.has(componentType);

    // Update spatial index if removing position
    if (componentType === 'position') {
      const posRaw = entity.components.get('position');
      // Type guard: check that position has chunk coordinates
      if (posRaw && typeof posRaw === 'object' && 'chunkX' in posRaw && 'chunkY' in posRaw) {
        const pos = posRaw as { chunkX: number; chunkY: number };
        const key = `${pos.chunkX},${pos.chunkY}`;
        this.chunkIndex.get(key)?.delete(entityId);
      }
    }

    const entityImpl = entity as EntityImpl;
    entityImpl.removeComponent(componentType);
    this._archetypeVersion++; // Invalidate query cache

    // Update component type count
    if (hadComponent) {
      const currentCount = this._componentTypeCounts.get(componentType) ?? 0;
      if (currentCount > 0) {
        this._componentTypeCounts.set(componentType, currentCount - 1);
      }
    }

    // Mark entity as dirty for change tracking
    this._dirtyTracker.markDirty(entityId, componentType, 'remove');

    this._eventBus.emit({
      type: 'entity:component:removed',
      source: 'world',
      data: { entityId, componentType },
    });
  }

  advanceTick(): void {
    this._tick++;
    this._gameTime = this.calculateGameTime(this._tick);
    diagnosticsHarness.setCurrentTick(this._tick);
  }

  /**
   * Set tick to a specific value (only for deserialization/time travel).
   * This also updates gameTime to match.
   */
  setTick(tick: Tick): void {
    this._tick = tick;
    this._gameTime = this.calculateGameTime(tick);
    diagnosticsHarness.setCurrentTick(tick);
  }

  setFeature(feature: string, enabled: boolean): void {
    this._features.set(feature, enabled);
    this._featuresCache = null;
  }

  getSystem(systemId: string): import('./System.js').System | undefined {
    if (!this._systemRegistry) {
      console.warn('[World.getSystem] No systemRegistry!');
      return undefined;
    }
    const system = this._systemRegistry.get(systemId);
    return system;
  }

  private calculateGameTime(tick: Tick): GameTime {
    const totalTicks = tick;
    const ticksPerHour = this._gameTime.ticksPerHour;
    const totalHours = Math.floor(totalTicks / ticksPerHour);

    const hour = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);
    const day = (totalDays % 28) + 1; // 28 days per season
    const totalSeasons = Math.floor(totalDays / 28);
    const seasonIndex = totalSeasons % 4;
    const year = Math.floor(totalSeasons / 4) + 1;

    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

    return {
      totalTicks,
      ticksPerHour,
      hour,
      day,
      season: seasons[seasonIndex]!,
      year,
    };
  }

  /**
   * Add a pre-constructed entity to the world.
   * This is the public API - use this instead of _addEntity.
   *
   * @param entity - The entity to add
   * @throws Error if an entity with the same ID already exists
   */
  addEntity(entity: Entity): void {
    if (this._entities.has(entity.id)) {
      throw new Error(`Entity ${entity.id} already exists in the world`);
    }

    this._entities.set(entity.id, entity);
    this._archetypeVersion++; // Invalidate query cache

    // Update spatial chunk index if entity has position component
    const posRaw = entity.components.get('position');
    // Type guard: check that position has x and y coordinates
    if (posRaw && typeof posRaw === 'object' && 'x' in posRaw && 'y' in posRaw) {
      const pos = posRaw as { x: number; y: number; chunkX?: number; chunkY?: number };
      // Calculate chunk coordinates if not present (migration for old saves)
      const CHUNK_SIZE = 32;
      const chunkX = pos.chunkX ?? Math.floor(pos.x / CHUNK_SIZE);
      const chunkY = pos.chunkY ?? Math.floor(pos.y / CHUNK_SIZE);
      const key = `${chunkX},${chunkY}`;

      if (!this.chunkIndex.has(key)) {
        this.chunkIndex.set(key, new Set());
      }
      this.chunkIndex.get(key)!.add(entity.id);
    }

    // Update component type counts for all components this entity has
    for (const componentType of entity.components.keys()) {
      const currentCount = this._componentTypeCounts.get(componentType) ?? 0;
      this._componentTypeCounts.set(componentType, currentCount + 1);
    }

    // Emit entity:created event for persistence streaming
    this._eventBus.emit({
      type: 'entity:created',
      source: 'world',
      data: { entityId: entity.id, archetype: null },
    });
  }

  /**
   * @deprecated Use addEntity() instead. This will be removed in a future version.
   */
  _addEntity(entity: Entity): void {
    // Delegate to public API but skip duplicate check for backwards compatibility
    if (!this._entities.has(entity.id)) {
      this.addEntity(entity);
    } else {
      // Legacy behavior: silently overwrite
      this._entities.set(entity.id, entity);
    }
  }

  /**
   * Get tile at world coordinates.
   * Returns undefined if ChunkManager not set or tile doesn't exist.
   * Per CLAUDE.md: No silent fallbacks - returns undefined if data unavailable.
   *
   * CRITICAL FIX: Generates chunks on-demand if they haven't been generated yet.
   * This ensures biome data exists for all tiles accessed by action handlers.
   */
  getTileAt(x: number, y: number): ITile | undefined {
    if (!this._chunkManager) {
      return undefined;
    }

    // Convert world coordinates to chunk coordinates
    const CHUNK_SIZE = 32; // Must match value in world package
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    // Optimize modulo for common case (positive coordinates)
    let localX = x % CHUNK_SIZE;
    if (localX < 0) localX += CHUNK_SIZE;
    let localY = y % CHUNK_SIZE;
    if (localY < 0) localY += CHUNK_SIZE;

    // Get chunk (creates if doesn't exist)
    const chunk = this._chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.tiles) {
      return undefined;
    }

    // CRITICAL FIX: Generate chunk if not already generated
    // This prevents "No tile found" errors in ActionQueue validation
    // The TileInspectorPanel does this, but ActionQueue validation also needs it
    if (!chunk.generated && this._terrainGenerator) {
      this._terrainGenerator.generateChunk(chunk, this);
    }

    // Get tile from chunk (row-major order)
    const tileIndex = localY * CHUNK_SIZE + localX;
    return chunk.tiles[tileIndex] as ITile | undefined;
  }

  /**
   * Set ChunkManager for tile access.
   * Called by game initialization after ChunkManager is created.
   */
  setChunkManager(chunkManager: IChunkManager): void {
    this._chunkManager = chunkManager;
  }

  /**
   * Get ChunkManager for serialization/terrain access.
   * Returns the ChunkManager if set, otherwise undefined.
   * Used by WorldSerializer to serialize terrain data.
   */
  getChunkManager(): IChunkManager | undefined {
    return this._chunkManager;
  }

  /**
   * Get or create ChunkNameRegistry for named locations.
   * Used by systems to name chunks and navigate to named places.
   */
  getChunkNameRegistry(): import('@ai-village/world').ChunkNameRegistry {
    if (!this._chunkNameRegistry) {
      // Lazy initialization
      const { ChunkNameRegistry } = require('@ai-village/world');
      this._chunkNameRegistry = new ChunkNameRegistry();
    }
    return this._chunkNameRegistry!;
  }

  /**
   * Set ChunkNameRegistry (used for deserialization).
   */
  setChunkNameRegistry(registry: import('@ai-village/world').ChunkNameRegistry): void {
    this._chunkNameRegistry = registry;
  }

  /**
   * Set TerrainGenerator for on-demand chunk generation.
   * Called by game initialization after TerrainGenerator is created.
   * This enables World.getTileAt() to generate chunks that haven't been generated yet,
   * preventing "No tile found" errors in action validation.
   */
  setTerrainGenerator(terrainGenerator: ITerrainGenerator): void {
    this._terrainGenerator = terrainGenerator;
  }

  /**
   * Set BackgroundChunkGenerator for asynchronous chunk pre-generation.
   * Called by game initialization after BackgroundChunkGenerator is created.
   * This enables systems to pre-generate chunks during soul creation, agent spawning, etc.
   */
  setBackgroundChunkGenerator(generator: IBackgroundChunkGenerator): void {
    this._backgroundChunkGenerator = generator;
  }

  /**
   * Get BackgroundChunkGenerator for chunk pre-generation.
   * Returns the BackgroundChunkGenerator if set, otherwise undefined.
   * Used by systems to queue chunks for background generation.
   */
  getBackgroundChunkGenerator(): IBackgroundChunkGenerator | undefined {
    return this._backgroundChunkGenerator;
  }

  /**
   * Set CraftingSystem for recipe access.
   * Called by game initialization after CraftingSystem is registered.
   * This enables automation systems (AssemblyMachineSystem) to look up recipes.
   */
  setCraftingSystem(craftingSystem: import('../crafting/CraftingSystem.js').CraftingSystem): void {
    this._craftingSystem = craftingSystem;
  }

  /**
   * Set ItemInstanceRegistry for item creation.
   * Called by game initialization after ItemInstanceRegistry is created.
   * This enables automation systems to create item instances with quality/condition.
   */
  setItemInstanceRegistry(registry: import('../items/ItemInstanceRegistry.js').ItemInstanceRegistry): void {
    this._itemInstanceRegistry = registry;
  }

  /**
   * Set divine configuration for this universe.
   * Controls how divine powers, belief economy, avatars, angels, etc. work.
   * Called by game initialization with a preset (high_fantasy, grimdark, etc.)
   *
   * Example:
   *   const config = createUniverseConfig('universe-1', 'My World', 'high_fantasy');
   *   world.setDivineConfig(config);
   */
  setDivineConfig(config: Partial<UniverseDivineConfig>): void {
    this._divineConfig = config;
  }

  // ===========================================================================
  // Planet System Implementation
  // ===========================================================================

  /**
   * Get all planets registered with this world.
   */
  getPlanets(): ReadonlyMap<string, IPlanet> {
    return this._planets;
  }

  /**
   * Get a specific planet by ID.
   */
  getPlanet(planetId: string): IPlanet | undefined {
    return this._planets.get(planetId);
  }

  /**
   * Get the currently active planet.
   * Returns undefined if no planets are registered.
   */
  getActivePlanet(): IPlanet | undefined {
    if (!this._activePlanetId) return undefined;
    return this._planets.get(this._activePlanetId);
  }

  /**
   * Check if a planet exists.
   */
  hasPlanet(planetId: string): boolean {
    return this._planets.has(planetId);
  }

  /**
   * Register a planet with this world.
   * The first registered planet becomes the active planet automatically.
   *
   * @param planet - The planet to register
   */
  registerPlanet(planet: IPlanet): void {
    if (this._planets.has(planet.id)) {
      throw new Error(`Planet ${planet.id} is already registered`);
    }

    this._planets.set(planet.id, planet);

    // First planet becomes active automatically
    if (!this._activePlanetId) {
      this._activePlanetId = planet.id;
      // Also set the chunk manager to the active planet's chunk manager
      this._chunkManager = planet.chunkManager;
    }

    // Emit event
    this._eventBus.emit({
      type: 'planet:registered',
      source: 'world',
      data: {
        planetId: planet.id,
        planetName: planet.name,
        planetType: planet.type,
        isActive: this._activePlanetId === planet.id,
      },
    });
  }

  /**
   * Remove a planet from this world.
   * Cannot remove the active planet unless it's the only one.
   *
   * @param planetId - ID of the planet to remove
   */
  unregisterPlanet(planetId: string): void {
    if (!this._planets.has(planetId)) {
      throw new Error(`Planet ${planetId} is not registered`);
    }

    // Cannot remove active planet if there are others
    if (this._activePlanetId === planetId && this._planets.size > 1) {
      throw new Error(`Cannot remove active planet ${planetId}. Set another planet as active first.`);
    }

    this._planets.delete(planetId);

    // If this was the active planet and it's the last one, clear active
    if (this._activePlanetId === planetId) {
      this._activePlanetId = undefined;
      this._chunkManager = undefined;
    }

    // Emit event
    this._eventBus.emit({
      type: 'planet:unregistered',
      source: 'world',
      data: { planetId },
    });
  }

  /**
   * Set the active planet (where gameplay happens).
   * This switches the chunk manager used for tile access.
   *
   * @param planetId - ID of the planet to activate
   */
  setActivePlanet(planetId: string): void {
    const planet = this._planets.get(planetId);
    if (!planet) {
      throw new Error(`Planet ${planetId} is not registered`);
    }

    const previousPlanetId = this._activePlanetId;
    this._activePlanetId = planetId;
    this._chunkManager = planet.chunkManager;

    // Emit event
    this._eventBus.emit({
      type: 'planet:activated',
      source: 'world',
      data: {
        planetId,
        previousPlanetId,
        planetName: planet.name,
        planetType: planet.type,
      },
    });
  }

  /**
   * Get terrain type at world coordinates.
   * Convenience method for PlacementScorer and BuildBehavior.
   * Returns the terrain string ('grass', 'dirt', etc.) or null if tile doesn't exist.
   */
  getTerrainAt(x: number, y: number): string | null {
    const tile = this.getTileAt(x, y);
    return tile?.terrain ?? null;
  }

  /**
   * Get tile data (fertility, moisture, etc.) at world coordinates.
   * Convenience method for PlacementScorer utility calculations.
   */
  getTileData(x: number, y: number): { fertility?: number; moisture?: number } | null {
    const tile = this.getTileAt(x, y);
    if (!tile) return null;
    return {
      fertility: tile.fertility,
      moisture: tile.moisture,
    };
  }

  /**
   * Get all door locations in the world (cached for performance).
   * Cache is invalidated when invalidateDoorCache() is called.
   * Systems should call this instead of scanning all tiles.
   */
  getDoorLocations(): ReadonlyArray<{ x: number; y: number }> {
    if (this.doorLocationsCache === null) {
      this.rebuildDoorCache();
    }
    return this.doorLocationsCache!;
  }

  /**
   * Invalidate the door location cache.
   * Call this when doors are built or destroyed.
   * Next call to getDoorLocations() will rebuild the cache.
   */
  invalidateDoorCache(): void {
    this.doorLocationsCache = null;
  }

  /**
   * Rebuild the door location cache by scanning all tiles.
   * This is expensive - only call when cache is invalidated.
   */
  private rebuildDoorCache(): void {
    this.doorLocationsCache = [];

    if (!this._chunkManager) {
      return;
    }

    // Iterate through all chunks to find door tiles
    // Type guard: Check if ChunkManager has getLoadedChunks method (from @ai-village/world)
    if ('getLoadedChunks' in this._chunkManager && typeof this._chunkManager.getLoadedChunks === 'function') {
      const chunks = this._chunkManager.getLoadedChunks();
      for (const chunkData of chunks) {
        // Type guard: Check if chunk has generated property (IChunk vs limited type)
        if ('generated' in chunkData && !chunkData.generated) continue;

        // Scan all tiles in this chunk
        const chunkSize = 32; // Standard chunk size (must match world package CHUNK_SIZE)
        for (let localX = 0; localX < chunkSize; localX++) {
          for (let localY = 0; localY < chunkSize; localY++) {
            const worldX = chunkData.x * chunkSize + localX;
            const worldY = chunkData.y * chunkSize + localY;
            const tile = this.getTileAt(worldX, worldY);

            if (tile?.door) {
              this.doorLocationsCache.push({ x: worldX, y: worldY });
            }
          }
        }
      }
    }
  }

  /**
   * Query entities near a point using the spatial grid.
   * Convenience method that returns full Entity objects.
   *
   * Performance: O(cells_in_radius × entities_per_cell) instead of O(all_entities)
   *
   * Note: Caller should still check exact distance with squared distance comparison.
   */
  queryEntitiesNear(x: number, y: number, radius: number): Entity[] {
    const entityIds = this._spatialGrid.getEntitiesNear(x, y, radius);
    const entities: Entity[] = [];

    for (const entityId of entityIds) {
      const entity = this._entities.get(entityId);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Clear all entities from the world.
   * Used by save/load system to reset world state before deserialization.
   * WARNING: This is a destructive operation - use only during load operations.
   */
  clear(): void {
    this._entities.clear();
    this.chunkIndex.clear();
    this._spatialGrid.clear();
    this._queryCache.clear();
    this._positionSoA.clear();
    this._velocitySoA.clear();
    this.doorLocationsCache = null;
    this._archetypeVersion++; // Invalidate query cache
  }

  /**
   * Initiate construction of a building.
   * Creates a construction site entity with progress=0.
   * Per CLAUDE.md: No silent fallbacks - throws on validation failure.
   * @param builderId - Optional ID of the agent who initiated construction
   */
  initiateConstruction(
    position: { x: number; y: number },
    buildingType: string,
    inventory: Record<string, number>,
    builderId?: string
  ): Entity {
    // Validate inputs
    if (!buildingType || buildingType.trim() === '') {
      throw new Error('Building type is required');
    }
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new Error('Position must have valid x and y coordinates');
    }
    if (!inventory) {
      throw new Error('Inventory is required');
    }

    // Get blueprint from world's registry if available, otherwise create and cache
    // This prevents duplicate registration issues
    if (!this.buildingRegistry) {
      this.buildingRegistry = new BuildingBlueprintRegistry();
      // registerDefaults() internally calls all tier registration methods
      this.buildingRegistry.registerDefaults();
    }
    const blueprint = this.buildingRegistry.get(buildingType);

    // Validate placement
    const validator = new PlacementValidator();
    const validation = validator.validate(position, blueprint, this, inventory, 0);

    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ');
      throw new Error(`Construction validation failed: ${errorMessages}`);
    }

    // Deduct resources from inventory (mutate the passed-in object)
    const consumedResources: Array<{ resourceId: string; amount: number }> = [];
    for (const cost of blueprint.resourceCost) {
      const available = inventory[cost.resourceId];
      if (available === undefined || available < cost.amountRequired) {
        throw new Error(
          `Not enough ${cost.resourceId}. Need ${cost.amountRequired}, have ${available ?? 0}.`
        );
      }
      inventory[cost.resourceId] = available - cost.amountRequired;
      consumedResources.push({ resourceId: cost.resourceId, amount: cost.amountRequired });
    }


    // Create construction site entity
    const entity = this.createEntity();

    // Add building component with progress=0 (under construction)
    const buildingComponent = createBuildingComponent(buildingType as BuildingType, 1, 0);
    const entityImpl = entity as EntityImpl;
    entityImpl.addComponent(buildingComponent);

    // Add position component using the helper function
    const positionComponent = createPositionComponent(position.x, position.y);
    entityImpl.addComponent(positionComponent);

    // Add renderable component so the building is visible
    // Uses buildingType as spriteId (e.g., 'workbench', 'storage-chest')
    const renderableComponent = createRenderableComponent(buildingType, 'building');
    entityImpl.addComponent(renderableComponent);

    // Emit construction started event
    this._eventBus.emit({
      type: 'construction:started',
      source: builderId ?? 'world',
      data: {
        buildingId: entity.id,
        blueprintId: buildingType,
        buildingType,
        position,
        builderId,
      },
    });

    return entity;
  }
}

// World value alias for backwards compatibility: allows `new World()` syntax
// This creates a value export that can be used as a constructor.
// The interface World (above) provides the type, and this const provides the runtime value.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const World = WorldImpl;

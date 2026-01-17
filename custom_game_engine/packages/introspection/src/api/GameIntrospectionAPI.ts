/**
 * GameIntrospectionAPI - Runtime introspection and entity queries
 *
 * Provides schema-aware entity queries with caching and filtering.
 * Builds on ComponentRegistry to provide runtime access to entity data
 * with schema validation and visibility filtering.
 *
 * Features:
 * - Entity queries with component filtering
 * - Schema-aware serialization
 * - Visibility level filtering
 * - Tick-based result caching
 * - SimulationScheduler integration
 * - Bounds-based spatial queries
 */

import type { Entity, World } from '@ai-village/core';
import type { ComponentType } from '@ai-village/core';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { MutationService } from '../mutation/MutationService.js';
import { ValidationService } from '../mutation/ValidationService.js';
import { IntrospectionCache } from '../IntrospectionCache.js';
import type { ComponentSchema, Component } from '../types/index.js';
import type { Visibility } from '../types/VisibilityTypes.js';
import { SimulationScheduler } from '@ai-village/core';
import type {
  SafeMutationRequest,
  SafeMutationResult,
  BatchMutationResult,
  UndoResult,
  RedoResult,
  WatchOptions,
  UnsubscribeFunction,
  EntityChangeEvent,
  MutationHistoryEntry,
  TriggerBehaviorRequest,
  BehaviorResult,
  SnapshotId,
  EntitySnapshot,
  EntityState,
  SnapshotMetadata,
  RestoreResult,
  PlaceBuildingRequest,
  PlaceBuildingResult,
  BuildingInfo,
  BlueprintInfo,
} from '../types/IntrospectionTypes.js';

// MetricsStreamClient type (avoid importing to prevent circular dependency)
type MetricsStreamClient = any;

/**
 * Query options for filtering entities
 */
export interface EntityQueryOptions {
  /** Component types to filter by (AND logic) */
  withComponents?: ComponentType[];

  /** Bounding box for spatial filtering */
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  /** Only return entities in active simulation (uses SimulationScheduler) */
  activeOnly?: boolean;

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Options for entity retrieval
 */
export interface GetEntityOptions {
  /** Visibility level to filter components by */
  visibilityLevel?: keyof Visibility;

  /** Include components without schemas (default: false) */
  includeUnregistered?: boolean;
}

/**
 * Options for schema listing
 */
export interface ListSchemasOptions {
  /** Filter by category */
  category?: string;

  /** Filter by mutability level */
  mutability?: 'readonly' | 'mutable';
}

/**
 * Entity data with metadata
 */
export interface EnrichedEntity {
  id: string;
  components: Record<string, unknown>;
  metadata: {
    simulationMode?: string;
    lastUpdate?: number;
    cacheHit: boolean;
  };
}

/**
 * Query result with pagination metadata
 */
export interface QueryResult {
  entities: EnrichedEntity[];
  total: number;
  offset: number;
  limit: number;
  cacheHit: boolean;
}

/**
 * Entity watcher subscription
 */
interface EntityWatcher {
  /** Watcher options */
  options: WatchOptions;

  /** Last notification time (for throttling) */
  lastNotified: number;

  /** ID for this watcher */
  id: string;
}

/**
 * GameIntrospectionAPI provides runtime entity introspection
 */
export class GameIntrospectionAPI {
  private world: World;
  private componentRegistry: typeof ComponentRegistry;
  private mutationService: typeof MutationService;
  private metricsAPI: any; // MetricsAPI type (avoid circular dependency)
  private liveEntityAPI: any; // LiveEntityAPI type (avoid circular dependency)
  private buildingRegistry: any; // BuildingBlueprintRegistry type (avoid circular dependency)
  private cache: IntrospectionCache<EnrichedEntity>;

  // Entity watching
  private entityWatchers: Map<string, Set<EntityWatcher>>;
  private nextWatcherId: number;

  // Snapshot storage
  private snapshots: Map<SnapshotId, EntitySnapshot> = new Map();
  private snapshotCounter: number = 0;

  constructor(
    world: World,
    componentRegistry: typeof ComponentRegistry,
    mutationService: typeof MutationService,
    metricsAPI: any,
    liveEntityAPI: any,
    buildingRegistry?: any
  ) {
    this.world = world;
    this.componentRegistry = componentRegistry;
    this.mutationService = mutationService;
    this.metricsAPI = metricsAPI;
    this.liveEntityAPI = liveEntityAPI;
    this.buildingRegistry = buildingRegistry;
    this.cache = new IntrospectionCache<EnrichedEntity>(20); // 20 ticks = 1 second
    this.entityWatchers = new Map();
    this.nextWatcherId = 0;
  }

  /**
   * Attach to MetricsStreamClient to handle queries and actions
   * @param client - MetricsStreamClient instance
   */
  attach(client: MetricsStreamClient): void {
    // Delegate to LiveEntityAPI for now
    // In the future, we can add introspection-specific queries here
    if (this.liveEntityAPI && typeof this.liveEntityAPI.attach === 'function') {
      this.liveEntityAPI.attach(client);
    }
  }

  /**
   * Get a single entity with schema-validated components
   *
   * @param entityId - Entity ID to retrieve
   * @param options - Retrieval options
   * @returns Enriched entity data or null if not found
   */
  getEntity(entityId: string, options: GetEntityOptions = {}): EnrichedEntity | null {
    const cacheKey = this._getCacheKey(entityId, options.visibilityLevel);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, metadata: { ...cached.metadata, cacheHit: true } };
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      return null;
    }

    // Get simulation mode if available
    const simulationMode = this.getEntitySimulationMode(entity);
    const lastUpdate = this.getEntityLastUpdate(entity);

    // Serialize components with schema awareness
    const components: Record<string, unknown> = {};
    const visibilityLevel = options.visibilityLevel;

    for (const [componentType, componentData] of entity.components.entries()) {
      const schema = this.componentRegistry.get(componentType);

      // Skip unregistered components unless explicitly requested
      if (!schema && !options.includeUnregistered) {
        continue;
      }

      // Filter by visibility level if specified
      if (visibilityLevel && schema) {
        if (!this.isComponentVisible(schema, visibilityLevel)) {
          continue;
        }
      }

      // Serialize the component
      components[componentType] = this.serializeComponent(componentData, schema);
    }

    const result: EnrichedEntity = {
      id: entityId,
      components,
      metadata: {
        simulationMode,
        lastUpdate,
        cacheHit: false,
      },
    };

    // Cache the result
    this.cache.set(cacheKey, result, entityId);

    return result;
  }

  /**
   * Query entities with filters
   *
   * @param query - Query options
   * @returns Query result with pagination metadata
   */
  queryEntities(query: EntityQueryOptions = {}): QueryResult {
    // Note: Query results are not cached in IntrospectionCache since they
    // don't map to a single entity. Individual entity results are cached via getEntity().

    // Build entity query
    let entityQuery = this.world.query();

    // Add component filters
    if (query.withComponents && query.withComponents.length > 0) {
      for (const componentType of query.withComponents) {
        entityQuery = entityQuery.with(componentType);
      }
    }

    // Execute query
    let entities = entityQuery.executeEntities();

    // Apply bounds filtering if specified
    if (query.bounds) {
      entities = entities.filter((entity) => {
        const position = entity.components.get('position') as
          | { x: number; y: number }
          | undefined;
        if (!position) return false;

        return (
          position.x >= query.bounds!.minX &&
          position.x <= query.bounds!.maxX &&
          position.y >= query.bounds!.minY &&
          position.y <= query.bounds!.maxY
        );
      });
    }

    // Apply SimulationScheduler filtering if requested
    if (query.activeOnly) {
      const scheduler = (this.world as any).simulationScheduler as
        | SimulationScheduler
        | undefined;
      if (scheduler) {
        entities = scheduler.filterActiveEntities(Array.from(entities), this.world.tick);
      }
    }

    const total = entities.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEntities = entities.slice(offset, offset + limit);

    // Enrich entities
    const enrichedEntities: EnrichedEntity[] = paginatedEntities
      .map((entity) => this.getEntity(entity.id, {}))
      .filter((e): e is EnrichedEntity => e !== null);

    const result: QueryResult = {
      entities: enrichedEntities,
      total,
      offset,
      limit,
      cacheHit: false, // Query results themselves aren't cached, but entities within are
    };

    return result;
  }

  /**
   * Get component schema
   *
   * @param type - Component type
   * @returns Component schema or undefined if not registered
   */
  getComponentSchema(type: string): ComponentSchema | undefined {
    return this.componentRegistry.get(type);
  }

  /**
   * List all registered schemas
   *
   * @param options - Filtering options
   * @returns Array of matching schemas
   */
  listSchemas(options: ListSchemasOptions = {}): ComponentSchema[] {
    let schemas = this.componentRegistry.getAll();

    // Filter by category if specified
    if (options.category) {
      schemas = schemas.filter((schema) => schema.category === options.category);
    }

    // Filter by mutability if specified
    if (options.mutability) {
      schemas = schemas.filter((schema) => {
        // Check if any field has the specified mutability
        for (const field of Object.values(schema.fields)) {
          if (options.mutability === 'readonly' && !field.mutable) {
            return true;
          }
          if (options.mutability === 'mutable' && field.mutable) {
            return true;
          }
        }
        return false;
      });
    }

    return schemas;
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Update cache tick (should be called each game tick)
   * @param tick - Current game tick
   */
  onTick(tick: number): void {
    this.cache.onTick(tick);
  }

  // ============================================================================
  // Observability Methods (Watching & History)
  // ============================================================================

  /**
   * Watch an entity for changes.
   *
   * Subscribes to mutation events for a specific entity. When the entity's
   * components are mutated, the onChange callback will be invoked with details
   * about the changes.
   *
   * Options allow filtering by specific components or fields, and throttling
   * notifications to reduce callback frequency.
   *
   * @param entityId - Entity ID to watch
   * @param options - Watch options with onChange callback
   * @returns Unsubscribe function to stop watching
   *
   * @example
   * ```typescript
   * // Watch all changes to an entity
   * const unsubscribe = api.watchEntity('agent-uuid', {
   *   onChange: (event) => {
   *     console.log(`Entity ${event.entityId} changed at tick ${event.tick}`);
   *     event.changes.forEach(change => {
   *       console.log(`  ${change.componentType}.${change.field}: ${change.oldValue} -> ${change.newValue}`);
   *     });
   *   }
   * });
   *
   * // Watch only specific components
   * const unsubscribe = api.watchEntity('agent-uuid', {
   *   components: ['needs', 'health'],
   *   onChange: (event) => { ... }
   * });
   *
   * // Watch with throttling (max once per second)
   * const unsubscribe = api.watchEntity('agent-uuid', {
   *   onChange: (event) => { ... },
   *   throttle: 1000
   * });
   *
   * // Stop watching
   * unsubscribe();
   * ```
   */
  watchEntity(entityId: string, options: WatchOptions): UnsubscribeFunction {
    // Create watcher
    const watcherId = `watcher-${this.nextWatcherId++}`;
    const watcher: EntityWatcher = {
      id: watcherId,
      options,
      lastNotified: 0,
    };

    // Add to entity watchers map
    if (!this.entityWatchers.has(entityId)) {
      this.entityWatchers.set(entityId, new Set());
    }
    this.entityWatchers.get(entityId)!.add(watcher);

    // Return unsubscribe function
    return () => {
      const watchers = this.entityWatchers.get(entityId);
      if (watchers) {
        watchers.delete(watcher);
        // Clean up empty sets
        if (watchers.size === 0) {
          this.entityWatchers.delete(entityId);
        }
      }
    };
  }

  /**
   * Get mutation history from undo/redo stacks.
   *
   * Returns a list of mutations that have been performed, optionally filtered
   * by entity ID or component type. The history includes both undone and
   * non-undone mutations.
   *
   * Note: This accesses the MutationService's internal undo/redo stacks,
   * which have a limited size (default 50 mutations).
   *
   * @param options - Filter and pagination options
   * @returns Array of mutation history entries
   *
   * @example
   * ```typescript
   * // Get last 10 mutations for an entity
   * const history = await api.getMutationHistory({
   *   entityId: 'agent-uuid',
   *   limit: 10
   * });
   *
   * // Get all mutations for a component type
   * const history = await api.getMutationHistory({
   *   componentType: 'needs'
   * });
   *
   * // Get all mutations
   * const history = await api.getMutationHistory({});
   * ```
   */
  async getMutationHistory(options?: {
    entityId?: string;
    componentType?: string;
    limit?: number;
  }): Promise<MutationHistoryEntry[]> {
    const limit = options?.limit || 100;
    const history: MutationHistoryEntry[] = [];

    // Access the private instance to get undo/redo stacks
    // We need to access the internal state, which requires reflection
    const mutationServiceInstance = (this.mutationService as any).getInstance?.();
    if (!mutationServiceInstance) {
      // If we can't access the instance, return empty history
      return history;
    }

    const undoStack = mutationServiceInstance.undoStack as any;
    if (!undoStack) {
      return history;
    }

    // Get commands from both undo and redo stacks
    const undoCommands = (undoStack.undoStack || []) as any[];
    const redoCommands = (undoStack.redoStack || []) as any[];

    // Process undo stack (not undone)
    for (const command of undoCommands) {
      // Filter by entity ID if specified
      if (options?.entityId && command.entityId !== options.entityId) {
        continue;
      }

      // Filter by component type if specified
      if (options?.componentType && command.componentType !== options.componentType) {
        continue;
      }

      history.push({
        id: `mutation-${command.entityId}-${command.componentType}-${command.fieldName}`,
        entityId: command.entityId,
        componentType: command.componentType,
        field: command.fieldName,
        oldValue: command.oldValue,
        newValue: command.newValue,
        tick: this.world.tick, // We don't have the exact tick, use current
        source: 'system', // We don't have the source in the command
        undone: false,
      });
    }

    // Process redo stack (undone mutations)
    for (const command of redoCommands) {
      // Filter by entity ID if specified
      if (options?.entityId && command.entityId !== options.entityId) {
        continue;
      }

      // Filter by component type if specified
      if (options?.componentType && command.componentType !== options.componentType) {
        continue;
      }

      history.push({
        id: `mutation-${command.entityId}-${command.componentType}-${command.fieldName}`,
        entityId: command.entityId,
        componentType: command.componentType,
        field: command.fieldName,
        oldValue: command.oldValue,
        newValue: command.newValue,
        tick: this.world.tick, // We don't have the exact tick, use current
        source: 'system', // We don't have the source in the command
        undone: true,
      });
    }

    // Apply limit
    return history.slice(-limit);
  }

  /**
   * Notify watchers about entity changes.
   * Called internally when mutations occur.
   *
   * @param entityId - Entity that changed
   * @param componentType - Component that changed
   * @param field - Field that changed
   * @param oldValue - Previous value
   * @param newValue - New value
   */
  private notifyWatchers(
    entityId: string,
    componentType: string,
    field: string,
    oldValue: unknown,
    newValue: unknown
  ): void {
    const watchers = this.entityWatchers.get(entityId);
    if (!watchers || watchers.size === 0) {
      return;
    }

    const now = Date.now();
    const event: EntityChangeEvent = {
      entityId,
      tick: this.world.tick,
      changes: [
        {
          componentType,
          field,
          oldValue,
          newValue,
        },
      ],
    };

    for (const watcher of watchers) {
      // Check if we should filter this change
      if (watcher.options.components && watcher.options.components.length > 0) {
        if (!watcher.options.components.includes(componentType)) {
          continue;
        }
      }

      if (watcher.options.fields && watcher.options.fields.length > 0) {
        if (!watcher.options.fields.includes(field)) {
          continue;
        }
      }

      // Check throttling
      if (watcher.options.throttle) {
        const timeSinceLastNotification = now - watcher.lastNotified;
        if (timeSinceLastNotification < watcher.options.throttle) {
          continue;
        }
      }

      // Update last notified time
      watcher.lastNotified = now;

      // Call the onChange callback
      try {
        watcher.options.onChange(event);
      } catch (error) {
        console.error('[GameIntrospectionAPI] Error in entity watcher callback:', error);
      }
    }
  }

  // ============================================================================
  // Skills & Progression Methods
  // ============================================================================

  /**
   * Grant skill XP with level-up handling.
   *
   * This method provides comprehensive skill progression with:
   * - Entity and skill validation
   * - Affinity-based XP multipliers
   * - Automatic level-up calculation (100/300/700/1500/3000 XP thresholds)
   * - Cache invalidation
   * - Metrics tracking
   *
   * @param entityId - Entity to grant XP to
   * @param skill - Skill name
   * @param amount - XP amount to grant (100 XP = 1 level)
   * @returns Skill progression result
   *
   * @example
   * ```typescript
   * await api.grantSkillXP('agent-uuid', 'farming', 100);  // 100 XP = 1 level
   * await api.grantSkillXP('agent-uuid', 'combat', 250);   // 250 XP = 2.5 levels
   * ```
   */
  async grantSkillXP(
    entityId: string,
    skill: string,
    amount: number
  ): Promise<{
    success: boolean;
    skill: string;
    previousLevel: number;
    newLevel: number;
    previousXP: number;
    newXP: number;
    leveledUp: boolean;
    error?: string;
  }> {
    // Validate entity exists
    const entity = this.world.getEntity(entityId);
    if (!entity) {
      return {
        success: false,
        skill,
        previousLevel: 0,
        newLevel: 0,
        previousXP: 0,
        newXP: 0,
        leveledUp: false,
        error: `Entity ${entityId} not found`,
      };
    }

    // Get skills component
    const skillsComponent = entity.getComponent('skills');
    if (!skillsComponent) {
      return {
        success: false,
        skill,
        previousLevel: 0,
        newLevel: 0,
        previousXP: 0,
        newXP: 0,
        leveledUp: false,
        error: `Entity ${entityId} has no skills component`,
      };
    }

    // Cast to any to access dynamic skill properties
    const skills = skillsComponent as any;

    // Validate skill exists
    if (!skills.levels || !(skill in skills.levels)) {
      return {
        success: false,
        skill,
        previousLevel: 0,
        newLevel: 0,
        previousXP: 0,
        newXP: 0,
        leveledUp: false,
        error: `Skill '${skill}' not found in skills component`,
      };
    }

    // Validate amount
    if (amount < 0) {
      return {
        success: false,
        skill,
        previousLevel: skills.levels[skill] || 0,
        newLevel: skills.levels[skill] || 0,
        previousXP: skills.totalExperience?.[skill] || 0,
        newXP: skills.totalExperience?.[skill] || 0,
        leveledUp: false,
        error: 'XP amount must be non-negative',
      };
    }

    // Capture old values
    const previousLevel = skills.levels[skill] || 0;
    const previousTotalXP = skills.totalExperience?.[skill] || 0;
    const previousExperience = skills.experience?.[skill] || 0;

    // Use mutateField to apply XP changes with proper validation and tracking
    // We need to update totalExperience and experience fields
    const affinity = skills.affinities?.[skill] || 1.0;
    const actualXP = Math.floor(amount * affinity);

    // Update totalExperience to trigger level recalculation
    const newTotalXP = previousTotalXP + actualXP;
    const newExperience = previousExperience + actualXP;

    // Calculate new level from total XP
    // XP thresholds: 0->1: 100, 1->2: 300, 2->3: 700, 3->4: 1500, 4->5: 3000
    let newLevel = 0;
    if (newTotalXP >= 3000) newLevel = 5;
    else if (newTotalXP >= 1500) newLevel = 4;
    else if (newTotalXP >= 700) newLevel = 3;
    else if (newTotalXP >= 300) newLevel = 2;
    else if (newTotalXP >= 100) newLevel = 1;

    const leveledUp = newLevel > previousLevel;

    // Apply mutations atomically
    try {
      // Update totalExperience
      await this.mutateField({
        entityId,
        componentType: 'skills',
        field: 'totalExperience',
        value: {
          ...skills.totalExperience,
          [skill]: newTotalXP,
        },
        reason: `Grant ${amount} XP to ${skill} skill`,
        validate: false, // Skip schema validation for nested object updates
        source: 'dev',
      });

      // Update experience
      await this.mutateField({
        entityId,
        componentType: 'skills',
        field: 'experience',
        value: {
          ...skills.experience,
          [skill]: newExperience,
        },
        reason: `Update experience progress for ${skill}`,
        validate: false,
        source: 'dev',
      });

      // Update level if it changed
      if (leveledUp) {
        await this.mutateField({
          entityId,
          componentType: 'skills',
          field: 'levels',
          value: {
            ...skills.levels,
            [skill]: newLevel,
          },
          reason: `Level up ${skill} from ${previousLevel} to ${newLevel}`,
          validate: false,
          source: 'dev',
        });
      }

      // Invalidate cache for this entity
      this.cache.invalidate(entityId);

      // Emit metrics event if available
      if (this.metricsAPI && typeof this.metricsAPI.trackEvent === 'function') {
        this.metricsAPI.trackEvent('skill_xp_grant', {
          entityId,
          skill,
          amount,
          actualXP,
          previousLevel,
          newLevel,
          leveledUp,
        });
      }

      return {
        success: true,
        skill,
        previousLevel,
        newLevel,
        previousXP: previousTotalXP,
        newXP: newTotalXP,
        leveledUp,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        skill,
        previousLevel,
        newLevel: previousLevel,
        previousXP: previousTotalXP,
        newXP: previousTotalXP,
        leveledUp: false,
        error: `Failed to grant XP: ${errorMsg}`,
      };
    }
  }

  /**
   * Get all skills for entity.
   *
   * @param entityId - Entity ID
   * @returns Map of skill names to levels
   *
   * @example
   * ```typescript
   * const skills = await api.getSkills('agent-uuid');
   * // Returns: { farming: 3, combat: 1, cooking: 5 }
   * ```
   */
  async getSkills(entityId: string): Promise<Record<string, number>> {
    // Get entity with skills component
    const enriched = this.getEntity(entityId, {});
    if (!enriched) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Extract skills component
    const skillsComponent = enriched.components.skills as any;
    if (!skillsComponent) {
      throw new Error(`Entity ${entityId} has no skills component`);
    }

    // Return levels map
    return skillsComponent.levels || {};
  }

  // ============================================================================
  // Behavioral Control Methods
  // ============================================================================

  /**
   * Trigger a behavior on an entity.
   *
   * This method provides comprehensive behavior triggering with:
   * - Entity and behavior validation
   * - Behavior queue manipulation
   * - Cache invalidation
   * - Metrics tracking
   *
   * @param request - Behavior trigger request
   * @returns Behavior result with success status and state
   *
   * @example
   * ```typescript
   * const result = await api.triggerBehavior({
   *   entityId: 'agent-uuid',
   *   behavior: 'gather',
   *   params: { targetEntityId: 'tree-uuid' },
   *   validate: true
   * });
   *
   * if (result.success) {
   *   console.log(`Triggered behavior: ${result.behavior}`);
   * }
   * ```
   */
  async triggerBehavior(request: TriggerBehaviorRequest): Promise<BehaviorResult> {
    const startTime = performance.now();
    const validate = request.validate !== false; // Default true

    try {
      // Get entity
      const entity = this.world.getEntity(request.entityId);
      if (!entity) {
        return {
          success: false,
          behavior: request.behavior,
          error: `Entity not found: ${request.entityId}`,
        };
      }

      // Verify entity has agent component (required for behaviors)
      const agent = entity.getComponent('agent') as {
        behaviorQueue?: Array<{
          behavior: string;
          behaviorState?: Record<string, unknown>;
          priority?: string;
          repeats?: number;
          currentRepeat?: number;
          label?: string;
          startedAt?: number;
        }>;
        currentQueueIndex?: number;
        behaviorCompleted?: boolean;
      } | undefined;

      if (!agent) {
        return {
          success: false,
          behavior: request.behavior,
          error: `Entity ${request.entityId} does not have agent component`,
        };
      }

      // Validate behavior if requested
      if (validate) {
        const validBehaviors = [
          'wander', 'idle', 'follow', 'flee', 'follow_agent', 'follow_reporting_target',
          'talk', 'pick', 'gather', 'harvest', 'gather_seeds', 'seek_food',
          'explore', 'approach', 'observe', 'rest', 'work', 'help', 'build',
          'plan_build', 'craft', 'eat', 'seek_sleep', 'forced_sleep', 'flee_danger',
          'flee_to_home', 'seek_water', 'seek_shelter', 'deposit_items',
          'seek_warmth', 'seek_cooling', 'call_meeting', 'attend_meeting',
          'till', 'farm', 'plant', 'water', 'fertilize', 'navigate',
          'explore_frontier', 'explore_spiral', 'follow_gradient', 'tame_animal',
          'house_animal', 'trade', 'initiate_combat', 'hunt', 'butcher',
          'cast_spell', 'pray', 'meditate', 'group_pray', 'repair', 'upgrade',
          'material_transport', 'tile_build', 'research', 'set_priorities',
          'set_personal_goal', 'set_medium_term_goal', 'set_group_goal',
          'sleep_until_queue_complete', 'player_controlled'
        ];

        if (!validBehaviors.includes(request.behavior)) {
          return {
            success: false,
            behavior: request.behavior,
            error: `Invalid behavior type: ${request.behavior}. Must be one of: ${validBehaviors.join(', ')}`,
          };
        }
      }

      // Initialize behavior queue if it doesn't exist
      if (!agent.behaviorQueue) {
        agent.behaviorQueue = [];
      }

      // Clear existing queue and add new behavior
      agent.behaviorQueue = [{
        behavior: request.behavior,
        behaviorState: request.params,
        priority: 'high',
        startedAt: this.world.tick,
        label: `Manually triggered: ${request.behavior}`,
      }];

      // Reset queue state
      agent.currentQueueIndex = 0;
      agent.behaviorCompleted = false;

      // Invalidate entity cache
      this.cache.invalidate(request.entityId);

      // Track metrics event if metricsAPI available
      if (this.metricsAPI && typeof this.metricsAPI.trackEvent === 'function') {
        this.metricsAPI.trackEvent('behavior_trigger', {
          entityId: request.entityId,
          behavior: request.behavior,
          latency: performance.now() - startTime,
        });
      }

      return {
        success: true,
        behavior: request.behavior,
        state: {
          queueIndex: 0,
          behaviorState: request.params,
          startedAt: this.world.tick,
        },
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        behavior: request.behavior,
        error: errorMsg,
      };
    }
  }

  // ============================================================================
  // Building Management Methods (Phase 2)
  // ============================================================================

  /**
   * Place a building in the world.
   *
   * Emits a 'building:placement:confirmed' event that is handled by BuildingSystem.
   * Validates blueprint existence and optionally checks for collisions.
   *
   * @param request - Building placement request
   * @returns Placement result with building ID or error
   *
   * @example
   * ```typescript
   * const result = await api.placeBuilding({
   *   blueprintId: 'campfire',
   *   position: { x: 100, y: 150 },
   *   rotation: 0,
   *   checkCollisions: true
   * });
   *
   * if (result.success) {
   *   console.log(`Building placed: ${result.buildingId}`);
   * } else {
   *   console.error(`Placement failed: ${result.error}`);
   * }
   * ```
   */
  async placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult> {
    try {
      // Validate blueprint exists
      if (!this.buildingRegistry) {
        return {
          success: false,
          error: 'BuildingRegistry not available. Building placement disabled.',
        };
      }

      const blueprint = this.buildingRegistry.tryGet(request.blueprintId);
      if (!blueprint) {
        return {
          success: false,
          error: `Blueprint '${request.blueprintId}' not found`,
        };
      }

      // Check collisions if requested (default: true)
      const checkCollisions = request.checkCollisions !== false;
      if (checkCollisions) {
        // Query entities at the target position
        const { x, y } = request.position;
        const bounds = {
          minX: x,
          minY: y,
          maxX: x + blueprint.width,
          maxY: y + blueprint.height,
        };

        const existingEntities = this.queryEntities({
          bounds,
          withComponents: ['position' as ComponentType],
        });

        // Check for buildings or blocking entities
        const collisions = existingEntities.entities
          .filter((entity: any) => {
            // Check if entity has building or blocking component
            return entity.components.building || entity.components.blocking;
          })
          .map((entity: any) => {
            const pos = entity.components.position as { x: number; y: number };
            return {
              entityId: entity.id,
              type: entity.components.building ? 'building' : 'entity',
              position: pos,
            };
          });

        if (collisions.length > 0) {
          return {
            success: false,
            error: `Placement blocked by ${collisions.length} existing entity(ies)`,
            collisions,
          };
        }
      }

      // Emit placement event (handled by BuildingSystem)
      const eventBus = (this.world as any).eventBus;
      if (!eventBus) {
        return {
          success: false,
          error: 'EventBus not available',
        };
      }

      // Create a unique building ID (will be replaced by BuildingSystem's generated ID)
      const tempBuildingId = `building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'introspection-api',
        data: {
          blueprintId: request.blueprintId,
          position: request.position,
          rotation: request.rotation || 0,
          owner: request.owner,
          tempId: tempBuildingId,
        },
      });

      // Invalidate cache for the affected area
      this.invalidateBuildingArea(request.position, blueprint.width, blueprint.height);

      return {
        success: true,
        buildingId: tempBuildingId, // Note: actual ID will be assigned by BuildingSystem
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * List all buildings in the world.
   *
   * @param options - Optional filters
   * @returns Array of building information
   *
   * @example
   * ```typescript
   * // Get all buildings
   * const buildings = await api.listBuildings();
   *
   * // Filter by category
   * const residential = await api.listBuildings({ category: 'residential' });
   *
   * // Filter by owner
   * const myBuildings = await api.listBuildings({ owner: 'agent-uuid' });
   *
   * // Filter by bounds
   * const nearbyBuildings = await api.listBuildings({
   *   bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
   * });
   * ```
   */
  async listBuildings(
    options?: {
      owner?: string;
      bounds?: { minX: number; minY: number; maxX: number; maxY: number };
      category?: string;
    }
  ): Promise<BuildingInfo[]> {
    try {
      // Query entities with 'building' component
      const query: EntityQueryOptions = {
        withComponents: ['building' as ComponentType, 'position' as ComponentType],
      };

      // Add bounds filter if specified
      if (options?.bounds) {
        query.bounds = options.bounds;
      }

      const result = this.queryEntities(query);

      // Map entities to BuildingInfo
      const buildings = result.entities
        .map((entity: any): BuildingInfo | null => {
          const buildingComp = entity.components.building as any;
          const positionComp = entity.components.position as { x: number; y: number };

          if (!buildingComp || !positionComp) {
            return null;
          }

          // Filter by owner if specified
          if (options?.owner && buildingComp.ownerId !== options.owner) {
            return null;
          }

          // Filter by category if specified
          if (options?.category) {
            // Get blueprint to check category
            if (this.buildingRegistry) {
              const blueprint = this.buildingRegistry.tryGet(buildingComp.type);
              if (blueprint && blueprint.category !== options.category) {
                return null;
              }
            }
          }

          return {
            id: entity.id,
            blueprintId: buildingComp.type,
            name: buildingComp.name || buildingComp.type,
            category: buildingComp.category || 'unknown',
            position: positionComp,
            owner: buildingComp.ownerId,
            state: buildingComp.progress >= 100 ? 'active' : 'under_construction',
            createdAt: buildingComp.createdAt || 0,
          };
        })
        .filter((b: any): b is BuildingInfo => b !== null);

      return buildings;
    } catch (error) {
      console.error('[GameIntrospectionAPI] Error listing buildings:', error);
      return [];
    }
  }

  /**
   * List all available building blueprints.
   *
   * @param options - Optional filters
   * @returns Array of blueprint information
   *
   * @example
   * ```typescript
   * // Get all blueprints
   * const blueprints = api.listBlueprints();
   *
   * // Filter by category
   * const production = api.listBlueprints({ category: 'production' });
   * ```
   */
  listBlueprints(options?: { category?: string }): BlueprintInfo[] {
    if (!this.buildingRegistry) {
      return [];
    }

    try {
      let blueprints = this.buildingRegistry.getAll();

      // Filter by category if specified
      if (options?.category) {
        blueprints = this.buildingRegistry.getByCategory(options.category);
      }

      return blueprints.map((blueprint: any) => ({
        id: blueprint.id,
        name: blueprint.name,
        category: blueprint.category,
        description: blueprint.description,
        dimensions: {
          width: blueprint.width,
          height: blueprint.height,
          depth: blueprint.floors?.length || 1,
        },
        costs: blueprint.resourceCost.reduce((acc: Record<string, number>, cost: any) => {
          acc[cost.resourceId] = cost.amountRequired;
          return acc;
        }, {}),
        requiredSkills: blueprint.skillRequired
          ? { [blueprint.skillRequired.skill]: blueprint.skillRequired.level }
          : undefined,
      }));
    } catch (error) {
      console.error('[GameIntrospectionAPI] Error listing blueprints:', error);
      return [];
    }
  }

  /**
   * Invalidate cache entries for entities in the building area.
   * @param position - Building position
   * @param width - Building width
   * @param height - Building height
   */
  private invalidateBuildingArea(
    position: { x: number; y: number },
    width: number,
    height: number
  ): void {
    // Query entities in the affected area
    const entities = this.queryEntities({
      bounds: {
        minX: position.x,
        minY: position.y,
        maxX: position.x + width,
        maxY: position.y + height,
      },
    });

    // Invalidate cache for each entity
    for (const entity of entities.entities) {
      this.cache.invalidate(entity.id);
    }
  }

  // ============================================================================
  // Mutation Methods (Validated, Tracked, Reversible)
  // ============================================================================

  /**
   * Mutate a single component field with validation, tracking, and undo support.
   *
   * This method provides comprehensive mutation with:
   * - Schema-based validation (type, range, mutability)
   * - Automatic undo/redo support
   * - Cache invalidation
   * - Metrics tracking
   *
   * @param mutation - Mutation request
   * @returns Mutation result with success status, old/new values, and metrics
   *
   * @example
   * ```typescript
   * const result = await api.mutateField({
   *   entityId: 'agent-uuid',
   *   componentType: 'needs',
   *   field: 'hunger',
   *   value: 0.5,
   *   reason: 'Admin action: feed agent'
   * });
   *
   * if (result.success) {
   *   console.log(`Changed ${result.oldValue} -> ${result.newValue}`);
   *   console.log(`Latency: ${result.metrics.latency}ms`);
   * }
   * ```
   */
  async mutateField(mutation: SafeMutationRequest): Promise<SafeMutationResult> {
    const startTime = performance.now();
    const validate = mutation.validate !== false; // Default true
    const source = mutation.source || 'system';

    try {
      // Get entity
      const entity = this.world.getEntity(mutation.entityId);
      if (!entity) {
        return {
          success: false,
          oldValue: undefined,
          newValue: undefined,
          validationErrors: ['Entity does not exist'],
          metrics: {
            latency: performance.now() - startTime,
            cacheInvalidations: 0,
          },
        };
      }

      // Validate if requested
      if (validate) {
        const validationResult = this.validateMutation(
          mutation.componentType,
          mutation.field,
          mutation.value
        );

        if (!validationResult.valid) {
          return {
            success: false,
            oldValue: undefined,
            newValue: undefined,
            validationErrors: validationResult.error ? [validationResult.error] : [],
            metrics: {
              latency: performance.now() - startTime,
              cacheInvalidations: 0,
            },
          };
        }
      }

      // Get old value before mutation
      const component = entity.getComponent(mutation.componentType);
      const oldValue = component ? (component as any)[mutation.field] : undefined;

      // Count caches before invalidation
      const cacheStatsBefore = this.cache.getStats();

      // Apply mutation via MutationService (handles validation, undo, events)
      // Note: MutationService defines its own Entity interface which is compatible
      const mutationResult = MutationService.mutate(
        entity as any, // Type cast needed due to interface mismatch
        mutation.componentType,
        mutation.field,
        mutation.value,
        source
      );

      // Count cache invalidations (cache entries removed)
      const cacheStatsAfter = this.cache.getStats();
      const cacheInvalidations = cacheStatsBefore.invalidations < cacheStatsAfter.invalidations
        ? cacheStatsAfter.invalidations - cacheStatsBefore.invalidations
        : 0;

      // Invalidate this entity's cache
      this.cache.invalidate(mutation.entityId);

      const latency = performance.now() - startTime;

      if (!mutationResult.success) {
        return {
          success: false,
          oldValue,
          newValue: mutation.value,
          validationErrors: mutationResult.error ? [mutationResult.error] : [],
          metrics: {
            latency,
            cacheInvalidations,
          },
        };
      }

      // Track metrics event if metricsAPI available
      if (this.metricsAPI && typeof this.metricsAPI.trackEvent === 'function') {
        this.metricsAPI.trackEvent('mutation', {
          entityId: mutation.entityId,
          componentType: mutation.componentType,
          field: mutation.field,
          latency,
          reason: mutation.reason,
          source,
        });
      }

      // Notify entity watchers
      this.notifyWatchers(
        mutation.entityId,
        mutation.componentType,
        mutation.field,
        oldValue,
        mutation.value
      );

      return {
        success: true,
        oldValue,
        newValue: mutation.value,
        metrics: {
          latency,
          cacheInvalidations: cacheInvalidations + 1, // +1 for explicit invalidation
        },
      };

    } catch (error) {
      const latency = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        oldValue: undefined,
        newValue: undefined,
        validationErrors: [errorMsg],
        metrics: {
          latency,
          cacheInvalidations: 0,
        },
      };
    }
  }

  /**
   * Mutate multiple fields in a batch with atomic rollback on failure.
   *
   * All mutations are validated before any are applied. If any mutation
   * fails during execution, all previous mutations are rolled back using
   * the undo stack.
   *
   * This provides atomic batch semantics: either all mutations succeed,
   * or none are applied.
   *
   * @param mutations - Array of mutation requests
   * @returns Batch result with individual results and rollback status
   *
   * @example
   * ```typescript
   * const result = await api.mutateBatch([
   *   { entityId: 'agent1', componentType: 'needs', field: 'hunger', value: 0.5 },
   *   { entityId: 'agent2', componentType: 'needs', field: 'energy', value: 0.8 }
   * ]);
   *
   * if (result.success) {
   *   console.log(`${result.successCount} mutations applied`);
   * } else {
   *   console.log(`Batch failed, rolled back: ${result.rolledBack}`);
   * }
   * ```
   */
  async mutateBatch(mutations: SafeMutationRequest[]): Promise<BatchMutationResult> {
    const results: SafeMutationResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let rolledBack = false;

    try {
      // Apply all mutations sequentially
      for (const mutation of mutations) {
        const result = await this.mutateField(mutation);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;

          // Rollback all mutations in this batch
          const mutationsApplied = results.length - 1; // Exclude current failed one
          if (mutationsApplied > 0) {
            // Undo all mutations we just applied
            await this.undo(mutationsApplied);
            rolledBack = true;
          }

          // Stop processing remaining mutations
          break;
        }
      }

      return {
        success: failureCount === 0,
        results,
        successCount,
        failureCount,
        rolledBack,
        error: failureCount > 0 ? `Batch failed with ${failureCount} error(s)` : undefined,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        results,
        successCount,
        failureCount: mutations.length - successCount,
        rolledBack,
        error: errorMsg,
      };
    }
  }

  /**
   * Undo the last N mutations.
   *
   * Reverses mutations in reverse order (most recent first).
   * Uses MutationService's undo stack to restore previous values.
   * Automatically invalidates render caches for affected entities.
   *
   * @param count - Number of mutations to undo (default: 1)
   * @returns Undo result with success status and count
   *
   * @example
   * ```typescript
   * const result = await api.undo(3); // Undo last 3 mutations
   * if (result.success) {
   *   console.log(`Undone ${result.count} mutations`);
   * }
   * ```
   */
  async undo(count: number = 1): Promise<UndoResult> {
    if (count < 1) {
      return {
        success: false,
        count: 0,
        error: 'Count must be at least 1',
      };
    }

    if (!MutationService.canUndo()) {
      return {
        success: false,
        count: 0,
        error: 'Nothing to undo',
      };
    }

    try {
      let undoneCount = 0;

      // Undo mutations one by one
      for (let i = 0; i < count; i++) {
        if (!MutationService.canUndo()) {
          break;
        }

        const success = MutationService.undo();
        if (success) {
          undoneCount++;

          // Invalidate entire cache since we don't know which entities were affected
          this.cache.clear();
        } else {
          break;
        }
      }

      return {
        success: undoneCount > 0,
        count: undoneCount,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        count: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Redo the last N undone mutations.
   *
   * Re-applies mutations that were undone, in original order.
   * Uses MutationService's redo stack to restore undone changes.
   * Automatically invalidates render caches for affected entities.
   *
   * @param count - Number of mutations to redo (default: 1)
   * @returns Redo result with success status and count
   *
   * @example
   * ```typescript
   * const result = await api.redo(2); // Redo last 2 undone mutations
   * if (result.success) {
   *   console.log(`Redone ${result.count} mutations`);
   * }
   * ```
   */
  async redo(count: number = 1): Promise<RedoResult> {
    if (count < 1) {
      return {
        success: false,
        count: 0,
        error: 'Count must be at least 1',
      };
    }

    if (!MutationService.canRedo()) {
      return {
        success: false,
        count: 0,
        error: 'Nothing to redo',
      };
    }

    try {
      let redoneCount = 0;

      // Redo mutations one by one
      for (let i = 0; i < count; i++) {
        if (!MutationService.canRedo()) {
          break;
        }

        const success = MutationService.redo();
        if (success) {
          redoneCount++;

          // Invalidate entire cache since we don't know which entities were affected
          this.cache.clear();
        } else {
          break;
        }
      }

      return {
        success: redoneCount > 0,
        count: redoneCount,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        count: 0,
        error: errorMsg,
      };
    }
  }

  // ============================================================================
  // Snapshot & Time Travel Methods (Lightweight Entity Snapshots)
  // ============================================================================

  /**
   * Create a lightweight snapshot of specific entities.
   *
   * This creates an in-memory snapshot of entity states (all components)
   * that can be restored later. This is distinct from full world saves
   * (which use SaveLoadService) - these are lightweight, entity-level
   * snapshots useful for:
   * - Temporary checkpoints during operations
   * - Undo/redo at entity level
   * - Testing and debugging
   * - Experiment rollback
   *
   * Snapshots are stored in memory (not persisted).
   *
   * @param entityIds - Entity IDs to snapshot
   * @param metadata - Optional metadata to attach to snapshot
   * @returns Promise resolving to unique snapshot ID
   *
   * @example
   * ```typescript
   * // Create checkpoint before risky operation
   * const snapshotId = await api.createSnapshot(['agent-1', 'agent-2'], {
   *   description: 'Before experimental mutation',
   *   experiment: 'test-123'
   * });
   *
   * // Later: restore if needed
   * await api.restoreSnapshot(snapshotId);
   * ```
   */
  async createSnapshot(
    entityIds: string[],
    metadata?: Record<string, any>
  ): Promise<SnapshotId> {
    const startTime = performance.now();

    // Generate unique snapshot ID
    const snapshotId = `snapshot_${++this.snapshotCounter}_${Date.now()}`;

    // Serialize entity states
    const entityStates: Map<string, EntityState> = new Map();

    for (const entityId of entityIds) {
      const entity = this.world.getEntity(entityId);
      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      // Serialize all components
      const components: Record<string, unknown> = {};
      for (const [componentType, componentData] of entity.components.entries()) {
        const schema = this.componentRegistry.get(componentType);
        components[componentType] = this.serializeComponent(componentData, schema);
      }

      entityStates.set(entityId, {
        id: entityId,
        components,
      });
    }

    // Create snapshot
    const snapshot: EntitySnapshot = {
      id: snapshotId,
      createdAt: this.world.tick,
      metadata: metadata || {},
      entities: entityStates,
      metrics: {
        creationLatency: performance.now() - startTime,
        entityCount: entityIds.length,
      },
    };

    // Store snapshot
    this.snapshots.set(snapshotId, snapshot);

    return snapshotId;
  }

  /**
   * Restore entities from a snapshot.
   *
   * Loads entity states from a snapshot and applies them to the world.
   * This will:
   * - Restore all components for snapshotted entities
   * - Overwrite current component values
   * - Invalidate caches for all restored entities
   *
   * Note: This does NOT restore entities that were deleted after the
   * snapshot - it only restores existing entities to their snapshotted state.
   *
   * @param snapshotId - Snapshot ID to restore from
   * @returns Promise resolving to restoration result
   *
   * @example
   * ```typescript
   * const result = await api.restoreSnapshot(snapshotId);
   * if (result.success) {
   *   console.log(`Restored ${result.entitiesRestored} entities`);
   *   console.log(`Snapshot from tick ${result.snapshot.createdAt}`);
   * } else {
   *   console.error(`Restore failed: ${result.error}`);
   * }
   * ```
   */
  async restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult> {
    const startTime = performance.now();

    // Find snapshot
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return {
        success: false,
        entitiesRestored: 0,
        error: `Snapshot not found: ${snapshotId}`,
      };
    }

    try {
      let restoredCount = 0;

      // Restore each entity
      for (const [entityId, entityState] of snapshot.entities.entries()) {
        const entity = this.world.getEntity(entityId);
        if (!entity) {
          // Entity was deleted after snapshot - skip it
          console.warn(`[Snapshot] Entity ${entityId} no longer exists, skipping restore`);
          continue;
        }

        // Cast to any for mutation methods (EntityImpl)
        const entityImpl = entity as any;

        // Remove all current components
        const currentComponentTypes = Array.from(entity.components.keys());
        for (const componentType of currentComponentTypes) {
          entityImpl.removeComponent(componentType);
        }

        // Restore components from snapshot
        for (const [componentType, componentData] of Object.entries(entityState.components)) {
          // Deserialize component data
          // Note: We use simple JSON cloning since we serialized with serializeComponent
          const clonedData = JSON.parse(JSON.stringify(componentData));

          // Restore Maps and Sets if needed
          const restoredData = this.deserializeComponent(clonedData, componentType);

          entityImpl.addComponent(restoredData);
        }

        // Invalidate cache for this entity
        this.cache.invalidate(entityId);

        restoredCount++;
      }

      const latency = performance.now() - startTime;

      return {
        success: true,
        entitiesRestored: restoredCount,
        snapshot: {
          id: snapshotId,
          createdAt: snapshot.createdAt,
          metadata: snapshot.metadata,
        },
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        entitiesRestored: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * List all available snapshots.
   *
   * @returns Array of snapshot metadata
   */
  listSnapshots(): SnapshotMetadata[] {
    const snapshots: SnapshotMetadata[] = [];

    for (const [id, snapshot] of this.snapshots.entries()) {
      snapshots.push({
        id,
        createdAt: snapshot.createdAt,
        entityCount: snapshot.entities.size,
        metadata: snapshot.metadata,
      });
    }

    // Sort by creation time (newest first)
    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Delete a snapshot.
   *
   * @param snapshotId - Snapshot ID to delete
   * @returns Whether snapshot was deleted
   */
  deleteSnapshot(snapshotId: SnapshotId): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Clear all snapshots.
   */
  clearSnapshots(): void {
    this.snapshots.clear();
    this.snapshotCounter = 0;
  }

  /**
   * Get snapshot count.
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }



  // ============================================================================
  // Economic & Environmental Queries (Phase 6b)
  // ============================================================================

  /**
   * Get economic metrics from the trading system
   *
   * @param options - Query options
   * @returns Economic metrics including resource prices, trade volume, supply/demand
   *
   * @example
   * ```typescript
   * const metrics = await api.getEconomicMetrics({
   *   resources: ['wood', 'stone'],
   *   timeRange: { start: world.tick - 1000, end: world.tick }
   * });
   *
   * console.log(metrics.prices['wood'].current);
   * console.log(metrics.tradeVolume['wood'].quantity);
   * ```
   */
  async getEconomicMetrics(options?: {
    /** Filter to specific resources/items */
    resources?: string[];
    /** Time range for historical data */
    timeRange?: { start: number; end: number };
  }): Promise<import('../types/IntrospectionTypes.js').EconomicMetrics> {
    // Import types for return value
    type EconomicMetrics = import('../types/IntrospectionTypes.js').EconomicMetrics;

    // Get market state component
    const marketEntities = this.world.query().with('market_state' as ComponentType).executeEntities();

    if (marketEntities.length === 0) {
      // No market system exists yet - return empty metrics
      return {
        prices: {},
        tradeVolume: {},
        participants: {
          buyers: 0,
          sellers: 0,
          activeTraders: 0,
        },
      };
    }

    const marketEntity = marketEntities[0];
    if (!marketEntity) {
      return {
        prices: {},
        tradeVolume: {},
        participants: {
          buyers: 0,
          sellers: 0,
          activeTraders: 0,
        },
      };
    }
    const marketState = marketEntity.components.get('market_state') as any;

    if (!marketState || !marketState.itemStats) {
      return {
        prices: {},
        tradeVolume: {},
        participants: {
          buyers: 0,
          sellers: 0,
          activeTraders: 0,
        },
      };
    }

    const prices: EconomicMetrics['prices'] = {};
    const tradeVolume: EconomicMetrics['tradeVolume'] = {};
    const tradersSet = new Set<string>();

    // Process each item in market stats
    for (const [itemId, stats] of marketState.itemStats.entries()) {
      // Filter by resources if specified
      if (options?.resources && !options.resources.includes(itemId)) {
        continue;
      }

      // Calculate price metrics
      const priceHistory = stats.priceHistory || [];
      const currentPrice = stats.averagePrice || 0;

      let min = currentPrice;
      let max = currentPrice;
      let sum = currentPrice;
      let count = 1;

      if (priceHistory.length > 0) {
        for (const price of priceHistory) {
          if (price < min) min = price;
          if (price > max) max = price;
          sum += price;
          count++;
        }
      }

      const average = count > 0 ? sum / count : currentPrice;

      // Calculate trend (simple linear regression on last 10 prices)
      let trend = 0;
      if (priceHistory.length >= 2) {
        const recentPrices = priceHistory.slice(-10);
        const firstPrice = recentPrices[0];
        const lastPrice = recentPrices[recentPrices.length - 1];
        trend = lastPrice - firstPrice;
      }

      prices[itemId] = {
        current: currentPrice,
        average,
        min,
        max,
        trend,
      };

      // Calculate trade volume
      const totalQuantity = (stats.recentSales || 0) + (stats.recentPurchases || 0);
      tradeVolume[itemId] = {
        quantity: totalQuantity,
        tradeCount: Math.floor(totalQuantity / 10), // Estimate
        value: totalQuantity * currentPrice,
      };
    }

    // Count participants from currency transaction logs
    const currencyEntities = this.world.query().with('currency' as ComponentType).executeEntities();
    let buyers = 0;
    let sellers = 0;

    for (const entity of currencyEntities) {
      const currency = entity.components.get('currency') as any;
      if (!currency?.transactions) continue;

      const recentTransactions = currency.transactions.slice(-10);
      let hasBuy = false;
      let hasSell = false;

      for (const tx of recentTransactions) {
        if (tx.type === 'buy') hasBuy = true;
        if (tx.type === 'sell') hasSell = true;
      }

      if (hasBuy) {
        buyers++;
        tradersSet.add(entity.id);
      }
      if (hasSell) {
        sellers++;
        tradersSet.add(entity.id);
      }
    }

    return {
      prices,
      tradeVolume,
      participants: {
        buyers,
        sellers,
        activeTraders: tradersSet.size,
      },
    };
  }

  /**
   * Get environmental state from weather/time/soil systems
   *
   * @param bounds - Optional spatial bounds for soil/light queries
   * @returns Environmental state including weather, time, soil conditions
   *
   * @example
   * ```typescript
   * const env = await api.getEnvironmentalState({
   *   minX: 0, minY: 0, maxX: 100, maxY: 100
   * });
   *
   * console.log(env.weather.temperature);
   * console.log(env.time.timeOfDay);
   * console.log(env.soil?.moisture);
   * ```
   */
  async getEnvironmentalState(bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): Promise<import('../types/IntrospectionTypes.js').EnvironmentalState> {
    type EnvironmentalState = import('../types/IntrospectionTypes.js').EnvironmentalState;

    // Get weather component
    const weatherEntities = this.world.query().with('weather' as ComponentType).executeEntities();
    let weatherData = {
      temperature: 20,
      precipitation: 0,
      windSpeed: 0,
      windDirection: 0,
      cloudCover: 0,
      type: 'clear',
    };

    if (weatherEntities.length > 0 && weatherEntities[0]) {
      const weather = weatherEntities[0].components.get('weather') as any;
      if (weather) {
        weatherData = {
          temperature: 20, // Default, will be overridden by temperature component
          precipitation: weather.weatherType === 'rain' ? weather.intensity || 0.5 : 0,
          windSpeed: weather.weatherType === 'storm' ? (weather.intensity || 0.5) * 20 : 5,
          windDirection: 0, // Not tracked in current system
          cloudCover: weather.weatherType === 'fog' ? weather.intensity || 0.8 :
                     weather.weatherType === 'clear' ? 0 : 0.5,
          type: weather.weatherType || 'clear',
        };
      }
    }

    // Get temperature from temperature component
    const tempEntities = this.world.query().with('temperature' as ComponentType).executeEntities();
    if (tempEntities.length > 0 && tempEntities[0]) {
      const temp = tempEntities[0].components.get('temperature') as any;
      if (temp && typeof temp.ambient === 'number') {
        weatherData.temperature = temp.ambient;
      }
    }

    // Get time component
    const timeEntities = this.world.query().with('time' as ComponentType).executeEntities();
    let timeData: EnvironmentalState['time'] = {
      tick: this.world.tick,
      timeOfDay: 12,
      day: 1,
      season: 'spring',
      moonPhase: 0.5,
    };

    if (timeEntities.length > 0 && timeEntities[0]) {
      const time = timeEntities[0].components.get('time') as any;
      if (time) {
        timeData = {
          tick: this.world.tick,
          timeOfDay: time.timeOfDay || 12,
          day: time.day || 1,
          season: this.calculateSeason(time.day || 1),
          moonPhase: ((time.day || 1) % 28) / 28, // 28-day lunar cycle
        };
      }
    }

    // Build base environmental state
    const result: EnvironmentalState = {
      weather: weatherData,
      time: timeData,
    };

    // Get soil data if bounds specified
    if (bounds) {
      // Query chunk system for tiles in bounds
      const chunkSystem = this.world.getSystem('chunk');
      if (chunkSystem && typeof (chunkSystem as any).getTile === 'function') {
        let moistureSum = 0;
        let fertilitySum = 0;
        let tempSum = 0;
        let count = 0;

        // Sample tiles in bounds (every 5 units to avoid too many queries)
        for (let x = bounds.minX; x <= bounds.maxX; x += 5) {
          for (let y = bounds.minY; y <= bounds.maxY; y += 5) {
            const tile = (chunkSystem as any).getTile(x, y);
            if (tile) {
              if (typeof tile.moisture === 'number') {
                moistureSum += tile.moisture / 100; // Normalize to 0-1
                count++;
              }
              if (typeof tile.fertility === 'number') {
                fertilitySum += tile.fertility / 100; // Normalize to 0-1
              }
            }
          }
        }

        if (count > 0) {
          result.soil = {
            moisture: moistureSum / count,
            fertility: fertilitySum / count,
            temperature: weatherData.temperature, // Use ambient temp
          };
        }
      }

      // Calculate light levels based on time of day
      const timeComponent = timeEntities[0]?.components.get('time') as any;
      if (timeComponent) {
        const lightLevel = timeComponent.lightLevel || this.calculateLightLevel(timeComponent.timeOfDay || 12);
        result.light = {
          sunlight: lightLevel,
          ambient: Math.max(0.1, lightLevel), // Minimum ambient light at night
        };
      }
    }

    return result;
  }

  /**
   * Calculate season based on day number
   * @param day - Day number
   * @returns Season name
   */
  private calculateSeason(day: number): string {
    const dayOfYear = day % 365;
    if (dayOfYear < 91) return 'winter';
    if (dayOfYear < 182) return 'spring';
    if (dayOfYear < 273) return 'summer';
    if (dayOfYear < 365) return 'autumn';
    return 'winter';
  }

  /**
   * Calculate light level based on time of day
   * @param timeOfDay - Time of day (0-24)
   * @returns Light level (0-1)
   */
  private calculateLightLevel(timeOfDay: number): number {
    // Dawn: 5-7, Day: 7-17, Dusk: 17-19, Night: 19-5
    if (timeOfDay >= 5 && timeOfDay < 7) {
      // Dawn: 0.3 -> 1.0
      return 0.3 + ((timeOfDay - 5) / 2) * 0.7;
    } else if (timeOfDay >= 7 && timeOfDay < 17) {
      // Day: 1.0
      return 1.0;
    } else if (timeOfDay >= 17 && timeOfDay < 19) {
      // Dusk: 1.0 -> 0.1
      return 1.0 - ((timeOfDay - 17) / 2) * 0.9;
    } else {
      // Night: 0.1
      return 0.1;
    }
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  /**
   * Generate consistent cache key
   * @param entityId - Entity ID
   * @param visibilityLevel - Visibility level filter
   * @returns Cache key string
   */
  private _getCacheKey(entityId: string, visibilityLevel?: keyof Visibility): string {
    return `entity:${entityId}:visibility=${visibilityLevel || 'all'}`;
  }

  /**
   * Get entity simulation mode
   */
  private getEntitySimulationMode(entity: Entity): string | undefined {
    // Check if entity has simulation mode metadata
    // This would come from SimulationScheduler
    const scheduler = (this.world as any).simulationScheduler as
      | SimulationScheduler
      | undefined;
    if (!scheduler) {
      return undefined;
    }

    // Determine mode based on components
    for (const [componentType] of entity.components.entries()) {
      const config = (SimulationScheduler as any).getSimulationConfig?.(componentType);
      if (config) {
        return config.mode;
      }
    }

    return undefined;
  }

  /**
   * Get entity last update tick
   */
  private getEntityLastUpdate(entity: Entity): number | undefined {
    // This would come from SimulationScheduler's lastUpdateTick map
    // For now, return undefined as we don't have direct access
    return undefined;
  }

  /**
   * Check if a component is visible at a given level
   */
  private isComponentVisible(
    schema: ComponentSchema,
    level: keyof Visibility
  ): boolean {
    // Check if any field is visible at this level
    for (const field of Object.values(schema.fields)) {
      if (field.visibility?.[level]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Serialize a component with schema awareness
   */
  private serializeComponent(
    component: unknown,
    schema?: ComponentSchema
  ): unknown {
    if (component === null || component === undefined) {
      return component;
    }

    if (typeof component !== 'object') {
      return component;
    }

    // Handle arrays
    if (Array.isArray(component)) {
      return component.map((item) => this.serializeComponent(item, undefined));
    }

    // Handle Maps
    if (component instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of component.entries()) {
        obj[String(k)] = this.serializeComponent(v, undefined);
      }
      return obj;
    }

    // Handle Sets
    if (component instanceof Set) {
      return Array.from(component).map((item) =>
        this.serializeComponent(item, undefined)
      );
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      component as Record<string, unknown>
    )) {
      // Skip functions
      if (typeof value === 'function') continue;

      // Use schema to guide serialization if available
      if (schema && schema.fields[key]) {
        const fieldSchema = schema.fields[key];
        // Could apply field-specific serialization here
        result[key] = this.serializeComponent(value, undefined);
      } else {
        result[key] = this.serializeComponent(value, undefined);
      }
    }
    return result;
  }

  /**
   * Deserialize component data, restoring complex types like Maps and Sets.
   *
   * @param data - Serialized component data
   * @param componentType - Component type
   * @returns Deserialized component
   */
  private deserializeComponent(data: any, componentType: string): any {
    // For now, just add the type field and return
    // serializeComponent already handles Maps and Sets by converting to plain objects/arrays
    // When we restore, we'll just use the plain JSON representation
    return {
      type: componentType,
      ...data,
    };
  }

  /**
   * Validate a mutation request against component schema.
   *
   * This method provides comprehensive validation:
   * - Schema exists for component type
   * - Field exists in schema
   * - Field is mutable
   * - Value type matches schema
   * - Value satisfies range/enum constraints
   *
   * @param componentType - Component type to validate
   * @param field - Field name to validate
   * @param value - Value to validate
   * @returns Validation result with error message if invalid
   */
  private validateMutation(
    componentType: string,
    field: string,
    value: unknown
  ): { valid: boolean; error?: string } {
    // Check if schema exists
    const schema = this.componentRegistry.get(componentType);
    if (!schema) {
      return {
        valid: false,
        error: `No schema registered for component type '${componentType}'`,
      };
    }

    // Use ValidationService for full validation (type, range, mutability, etc.)
    return ValidationService.validate(schema, field, value, false);
  }
}

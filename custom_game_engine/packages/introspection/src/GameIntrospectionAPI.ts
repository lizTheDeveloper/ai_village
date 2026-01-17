/**
 * GameIntrospectionAPI: Unified "Pit of Success" Introspection System
 *
 * Combines LiveEntityAPI, ComponentRegistry, MutationService, and MetricsAPI
 * into a single, type-safe, validated, cached, and reversible API.
 *
 * Design principles:
 * - Pre-validated: Type-checked, range-checked, permission-checked
 * - Auto-tracked: All operations emit metrics events
 * - Cached: Query results cached with scheduler-aware invalidation
 * - Reversible: Mutations support undo/redo with snapshots
 * - Observable: Subscribe to entity/component changes
 *
 * @see INTROSPECTION_API_DESIGN.md
 */

import type { ComponentRegistry } from './registry/ComponentRegistry.js';
import type { MutationService } from './mutation/MutationService.js';
import type { ComponentSchema } from './types/ComponentSchema.js';
import type { ComponentCategory } from './types/CategoryTypes.js';
import type {
  EntityIntrospectionResult,
  SafeMutationRequest,
  SafeMutationResult,
  BatchMutationResult,
  UndoResult,
  RedoResult,
  WatchOptions,
  EntityChangeEvent,
  PlaceBuildingRequest,
  PlaceBuildingResult,
  BuildingInfo,
  BlueprintInfo,
  SkillProgressionResult,
  TriggerBehaviorRequest,
  BehaviorResult,
  MutationHistoryEntry,
  CacheStats,
  SnapshotId,
  RestoreResult,
  EconomicMetrics,
  EnvironmentalState,
  EntityQuery,
  Bounds,
  TimeRange,
  UnsubscribeFunction,
} from './types/IntrospectionTypes.js';

/**
 * Minimal World interface for dependency injection
 * (Actual World type from @ai-village/core has more methods)
 */
interface World {
  readonly tick: number;
  query(): any;
  getEntity(id: string): any;
  // Additional methods will be accessed as needed
}

/**
 * Minimal MetricsAPI interface
 */
interface MetricsAPI {
  trackEvent(event: string, data: Record<string, any>): void;
  // Additional methods as needed
}

/**
 * Minimal LiveEntityAPI interface
 */
interface LiveEntityAPI {
  getEntity(id: string): any;
  queryEntities(query: any): any[];
  // Additional methods as needed
}

/**
 * Cache interface for render caching
 */
interface IntrospectionCache {
  get(key: string): any;
  set(key: string, value: any): void;
  invalidate(key: string): void;
  invalidateEntity(entityId: string): void;
  getStats(): CacheStats;
  clear(): void;
}

/**
 * Unified "pit of success" API for game introspection and manipulation.
 *
 * @example
 * ```typescript
 * const api = new GameIntrospectionAPI(world, registry, mutations, metrics, liveAPI);
 *
 * // Get entity with schema metadata
 * const agent = await api.getEntity('uuid', { visibility: 'full' });
 *
 * // Mutate field with validation and undo support
 * await api.mutateField({
 *   entityId: 'uuid',
 *   componentType: 'needs',
 *   field: 'hunger',
 *   value: 0.5,
 *   reason: 'Admin action: feed agent'
 * });
 *
 * // Watch for changes
 * const unsubscribe = api.watchEntity('uuid', {
 *   components: ['needs', 'position'],
 *   onChange: (changes) => console.log('Changed:', changes)
 * });
 * ```
 */
/**
 * Entity watcher subscription
 */
interface EntityWatcher {
  id: string;
  options: WatchOptions;
  lastNotified: number;
}

export class GameIntrospectionAPI {
  private world: World;
  private registry: ComponentRegistry;
  private mutations: MutationService;
  private metrics: MetricsAPI;
  private liveAPI: LiveEntityAPI;
  private cache: IntrospectionCache;

  // Entity watching state
  private entityWatchers: Map<string, Set<EntityWatcher>>;
  private nextWatcherId: number;

  /**
   * Create a new GameIntrospectionAPI instance
   *
   * @param world - World instance
   * @param registry - ComponentRegistry instance
   * @param mutations - MutationService instance
   * @param metrics - MetricsAPI instance
   * @param liveAPI - LiveEntityAPI instance
   * @param cache - Optional cache instance (creates default if not provided)
   */
  constructor(
    world: World,
    registry: ComponentRegistry,
    mutations: MutationService,
    metrics: MetricsAPI,
    liveAPI: LiveEntityAPI,
    cache?: IntrospectionCache
  ) {
    this.world = world;
    this.registry = registry;
    this.mutations = mutations;
    this.metrics = metrics;
    this.liveAPI = liveAPI;
    this.cache = cache || this.createDefaultCache();
    this.entityWatchers = new Map();
    this.nextWatcherId = 0;
  }

  /**
   * Create default cache implementation
   */
  private createDefaultCache(): IntrospectionCache {
    // Placeholder - will be implemented by another agent
    throw new Error('Default cache creation not yet implemented');
  }

  // ============================================================================
  // Entity Queries (Optimized, Cached)
  // ============================================================================

  /**
   * Get entity with schema-validated components.
   * Returns strongly-typed object with component metadata.
   *
   * @param entityId - Entity ID to retrieve
   * @param options - Query options
   * @returns Entity data with schemas and metadata
   *
   * @example
   * ```typescript
   * const agent = await api.getEntity('uuid', {
   *   components: ['agent', 'needs'],
   *   visibility: 'llm'
   * });
   * // Returns: { id, components: { agent: {...}, needs: {...} }, schemas: {...}, metadata: {...} }
   * ```
   */
  async getEntity(
    entityId: string,
    options?: {
      /** Filter to specific components */
      components?: string[];
      /** Schema visibility level */
      visibility?: 'full' | 'llm' | 'player';
      /** Include schema metadata */
      includeMetadata?: boolean;
    }
  ): Promise<EntityIntrospectionResult> {
    // Implementation will be added by another agent
    throw new Error('getEntity not yet implemented');
  }

  /**
   * Query entities with filters and pagination.
   * Uses SimulationScheduler to optimize for active entities.
   *
   * @param query - Query parameters
   * @returns Array of entity introspection results
   *
   * @example
   * ```typescript
   * const agents = await api.queryEntities({
   *   componentFilters: ['agent', 'conscious'],
   *   bounds: { x: 0, y: 0, width: 100, height: 100 },
   *   limit: 50
   * });
   * ```
   */
  async queryEntities(query: EntityQuery): Promise<EntityIntrospectionResult[]> {
    // Implementation will be added by another agent
    throw new Error('queryEntities not yet implemented');
  }

  // ============================================================================
  // Component Introspection
  // ============================================================================

  /**
   * Get component schema with metadata.
   *
   * @param type - Component type string
   * @returns Component schema
   *
   * @example
   * ```typescript
   * const schema = api.getComponentSchema('agent');
   * // Returns: { type, fields, visibility, mutability, category }
   * ```
   */
  getComponentSchema(type: string): ComponentSchema {
    // Implementation will be added by another agent
    throw new Error('getComponentSchema not yet implemented');
  }

  /**
   * List all registered schemas with filtering.
   *
   * @param options - Filter options
   * @returns Array of component schemas
   *
   * @example
   * ```typescript
   * const cognitiveSchemas = api.listSchemas({ category: 'cognitive' });
   * const mutableSchemas = api.listSchemas({ mutable: true });
   * ```
   */
  listSchemas(options?: {
    /** Filter by category */
    category?: ComponentCategory;
    /** Filter by mutability */
    mutable?: boolean;
  }): ComponentSchema[] {
    // Implementation will be added by another agent
    throw new Error('listSchemas not yet implemented');
  }

  // ============================================================================
  // Safe Mutations (Validated, Tracked, Reversible)
  // ============================================================================

  /**
   * Mutate component field with validation, tracking, and undo support.
   *
   * Automatically:
   * - Validates type and range
   * - Tracks in metrics
   * - Adds to undo stack
   * - Invalidates caches
   * - Emits change events
   *
   * @param mutation - Mutation request
   * @returns Mutation result with old/new values and undo ID
   *
   * @example
   * ```typescript
   * const result = await api.mutateField({
   *   entityId: 'uuid',
   *   componentType: 'needs',
   *   field: 'hunger',
   *   value: 0.5,
   *   reason: 'Admin action: feed agent'
   * });
   * // Automatically: validates range, tracks in metrics, adds to undo stack
   * ```
   */
  async mutateField(mutation: SafeMutationRequest): Promise<SafeMutationResult> {
    // Implementation will be added by another agent
    throw new Error('mutateField not yet implemented');
  }

  /**
   * Batch mutations with atomic rollback on failure.
   *
   * If any mutation fails, all mutations in the batch are rolled back.
   *
   * @param mutations - Array of mutation requests
   * @returns Batch mutation result
   *
   * @example
   * ```typescript
   * const result = await api.mutateBatch([
   *   { entityId: 'uuid1', componentType: 'needs', field: 'hunger', value: 0.5 },
   *   { entityId: 'uuid2', componentType: 'needs', field: 'energy', value: 0.8 }
   * ]);
   * // If any fail, all rollback automatically
   * ```
   */
  async mutateBatch(mutations: SafeMutationRequest[]): Promise<BatchMutationResult> {
    // Implementation will be added by another agent
    throw new Error('mutateBatch not yet implemented');
  }

  /**
   * Undo last N mutations.
   *
   * @param count - Number of mutations to undo (default: 1)
   * @returns Undo result
   *
   * @example
   * ```typescript
   * await api.undo();     // Undo last mutation
   * await api.undo(5);    // Undo last 5 mutations
   * ```
   */
  async undo(count: number = 1): Promise<UndoResult> {
    // Implementation will be added by another agent
    throw new Error('undo not yet implemented');
  }

  /**
   * Redo last N undone mutations.
   *
   * @param count - Number of mutations to redo (default: 1)
   * @returns Redo result
   *
   * @example
   * ```typescript
   * await api.redo();     // Redo last undone mutation
   * await api.redo(5);    // Redo last 5 undone mutations
   * ```
   */
  async redo(count: number = 1): Promise<RedoResult> {
    // Implementation will be added by another agent
    throw new Error('redo not yet implemented');
  }

  // ============================================================================
  // Building Management
  // ============================================================================

  /**
   * Place building with validation and collision detection.
   *
   * @param request - Building placement request
   * @returns Placement result with building ID or collision info
   *
   * @example
   * ```typescript
   * const result = await api.placeBuilding({
   *   blueprintId: 'small_house',
   *   position: { x: 10, y: 20 },
   *   owner: 'agent-uuid',
   *   checkCollisions: true
   * });
   * ```
   */
  async placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult> {
    // Implementation will be added by another agent
    throw new Error('placeBuilding not yet implemented');
  }

  /**
   * List buildings with filters.
   *
   * @param options - Filter options
   * @returns Array of building info
   *
   * @example
   * ```typescript
   * const agentBuildings = await api.listBuildings({ owner: 'agent-uuid' });
   * const nearbyBuildings = await api.listBuildings({
   *   bounds: { x: 0, y: 0, width: 100, height: 100 }
   * });
   * ```
   */
  async listBuildings(options?: {
    /** Filter by owner entity ID */
    owner?: string;
    /** Filter by spatial bounds */
    bounds?: Bounds;
    /** Filter by building category */
    category?: string;
  }): Promise<BuildingInfo[]> {
    // Implementation will be added by another agent
    throw new Error('listBuildings not yet implemented');
  }

  /**
   * Get building blueprints.
   *
   * @param options - Filter options
   * @returns Array of blueprint info
   *
   * @example
   * ```typescript
   * const allBlueprints = api.listBlueprints();
   * const houses = api.listBlueprints({ category: 'residential' });
   * ```
   */
  listBlueprints(options?: {
    /** Filter by category */
    category?: string;
  }): BlueprintInfo[] {
    // Implementation will be added by another agent
    throw new Error('listBlueprints not yet implemented');
  }

  // ============================================================================
  // Skills & Progression
  // ============================================================================

  /**
   * Grant skill XP with level-up handling.
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
  ): Promise<SkillProgressionResult> {
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
      if (this.metrics && typeof this.metrics.trackEvent === 'function') {
        this.metrics.trackEvent('skill_xp_grant', {
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
    const enriched = await this.getEntity(entityId, {});
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
  // Behavioral Control
  // ============================================================================

  /**
   * Trigger behavior with validation.
   *
   * @param request - Behavior trigger request
   * @returns Behavior result
   *
   * @example
   * ```typescript
   * await api.triggerBehavior({
   *   entityId: 'agent-uuid',
   *   behavior: 'hunt',
   *   params: { targetId: 'deer-uuid' }
   * });
   * ```
   */
  async triggerBehavior(request: TriggerBehaviorRequest): Promise<BehaviorResult> {
    // Implementation will be added by another agent
    throw new Error('triggerBehavior not yet implemented');
  }

  // ============================================================================
  // Observability & Metrics
  // ============================================================================

  /**
   * Subscribe to entity changes with filters.
   *
   * Returns unsubscribe function to stop watching.
   *
   * @param entityId - Entity ID to watch
   * @param options - Watch options with filters and callback
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = api.watchEntity('agent-uuid', {
   *   components: ['needs', 'position'],
   *   onChange: (changes) => console.log('Changed:', changes)
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  watchEntity(
    entityId: string,
    options: WatchOptions
  ): UnsubscribeFunction {
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
   * Get mutation history for entity/component.
   *
   * @param options - Query options
   * @returns Array of mutation history entries
   *
   * @example
   * ```typescript
   * // Get all mutations for entity
   * const history = await api.getMutationHistory({ entityId: 'uuid' });
   *
   * // Get mutations for specific component
   * const needsHistory = await api.getMutationHistory({
   *   entityId: 'uuid',
   *   componentType: 'needs'
   * });
   * ```
   */
  async getMutationHistory(options: {
    /** Filter by entity ID */
    entityId?: string;
    /** Filter by component type */
    componentType?: string;
    /** Limit number of results */
    limit?: number;
  }): Promise<MutationHistoryEntry[]> {
    const limit = options?.limit || 100;
    const history: MutationHistoryEntry[] = [];

    // Access the private instance to get undo/redo stacks
    const mutationServiceInstance = (this.mutations as any).getInstance?.();
    if (!mutationServiceInstance) {
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
      if (options?.entityId && command.entityId !== options.entityId) {
        continue;
      }
      if (options?.componentType && command.componentType !== options.componentType) {
        continue;
      }

      history.push({
        id: `mutation-${command.entityId}-${command.componentType}-${command.fieldName}-${Date.now()}`,
        entityId: command.entityId,
        componentType: command.componentType,
        field: command.fieldName,
        oldValue: command.oldValue,
        newValue: command.newValue,
        tick: this.world.tick,
        source: 'system',
        undone: false,
      });
    }

    // Process redo stack (undone mutations)
    for (const command of redoCommands) {
      if (options?.entityId && command.entityId !== options.entityId) {
        continue;
      }
      if (options?.componentType && command.componentType !== options.componentType) {
        continue;
      }

      history.push({
        id: `mutation-${command.entityId}-${command.componentType}-${command.fieldName}-${Date.now()}`,
        entityId: command.entityId,
        componentType: command.componentType,
        field: command.fieldName,
        oldValue: command.oldValue,
        newValue: command.newValue,
        tick: this.world.tick,
        source: 'system',
        undone: true,
      });
    }

    // Apply limit (return most recent)
    return history.slice(-limit);
  }

  /**
   * Get render cache statistics.
   *
   * @returns Cache statistics
   *
   * @example
   * ```typescript
   * const stats = api.getCacheStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   * ```
   */
  getCacheStats(): CacheStats {
    // Implementation will be added by another agent
    throw new Error('getCacheStats not yet implemented');
  }

  // ============================================================================
  // Snapshots & Time Travel
  // ============================================================================

  /**
   * Create snapshot of entity state for rollback.
   *
   * @param entityIds - Array of entity IDs to snapshot
   * @param metadata - Optional metadata to attach to snapshot
   * @returns Snapshot ID
   *
   * @example
   * ```typescript
   * const snapshotId = await api.createSnapshot(
   *   ['agent1', 'agent2'],
   *   { reason: 'Before dangerous experiment' }
   * );
   * ```
   */
  async createSnapshot(
    entityIds: string[],
    metadata?: Record<string, any>
  ): Promise<SnapshotId> {
    // Implementation will be added by another agent
    throw new Error('createSnapshot not yet implemented');
  }

  /**
   * Restore entities from snapshot.
   *
   * @param snapshotId - Snapshot ID to restore
   * @returns Restore result
   *
   * @example
   * ```typescript
   * const result = await api.restoreSnapshot(snapshotId);
   * console.log(`Restored ${result.entitiesRestored} entities`);
   * ```
   */
  async restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult> {
    // Implementation will be added by another agent
    throw new Error('restoreSnapshot not yet implemented');
  }

  // ============================================================================
  // Economic & Environmental
  // ============================================================================

  /**
   * Get resource prices and trade history.
   *
   * @param options - Query options
   * @returns Economic metrics
   *
   * @example
   * ```typescript
   * const metrics = await api.getEconomicMetrics({
   *   resources: ['wood', 'stone'],
   *   timeRange: { start: 0, end: 1000 }
   * });
   * ```
   */
  async getEconomicMetrics(options?: {
    /** Filter to specific resources */
    resources?: string[];
    /** Time range for historical data */
    timeRange?: TimeRange;
  }): Promise<EconomicMetrics> {
    // Implementation will be added by another agent
    throw new Error('getEconomicMetrics not yet implemented');
  }

  /**
   * Get weather and environmental state.
   *
   * @param bounds - Optional spatial bounds (returns average if specified)
   * @returns Environmental state
   *
   * @example
   * ```typescript
   * // Global weather
   * const env = await api.getEnvironmentalState();
   *
   * // Regional weather with soil/light data
   * const localEnv = await api.getEnvironmentalState({
   *   x: 0, y: 0, width: 100, height: 100
   * });
   * ```
   */
  async getEnvironmentalState(bounds?: Bounds): Promise<EnvironmentalState> {
    // Implementation will be added by another agent
    throw new Error('getEnvironmentalState not yet implemented');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Notify watchers about entity changes.
   * Should be called after successful mutations.
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
      // Filter by components if specified
      if (watcher.options.components && watcher.options.components.length > 0) {
        if (!watcher.options.components.includes(componentType)) {
          continue;
        }
      }

      // Filter by fields if specified
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

      // Call onChange callback
      try {
        watcher.options.onChange(event);
      } catch (error) {
        console.error('[GameIntrospectionAPI] Error in entity watcher callback:', error);
      }
    }
  }
}

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { ResourceType } from '../components/ResourceComponent.js';
import type { SpatialMemoryComponent, ResourceLocationMemory } from '../components/SpatialMemoryComponent.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { getPosition, getSpatialMemory, getEpisodicMemory } from '../utils/componentHelpers.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * SpatialMemoryQuerySystem synchronizes between EpisodicMemory and SpatialMemory
 * Extracts resource location memories and indexes them for spatial queries
 *
 * PERFORMANCE OPTIMIZATIONS (2026-01-18):
 * - Map-based component caching for O(1) lookups
 * - Zero allocations in hot path (reusable working objects)
 * - Early exit for entities with no new memories
 * - Lookup table for valid resource types
 * - Cache synchronization with periodic rebuilds
 */
export class SpatialMemoryQuerySystem extends BaseSystem {
  public readonly id: SystemId = 'spatial_memory_query';
  public readonly priority: number = 105; // After MemoryFormation, before BeliefFormation
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Only run when spatial_memory components exist (O(1) activation check)
  public readonly activationComponents = ['spatial_memory'] as const;
  protected readonly throttleInterval = THROTTLE.NORMAL; // Every 1 second - memory indexing can be batched

  // Track processed memory counts to avoid reprocessing
  private lastProcessedMemoryCount = new Map<string, number>();

  // MAP-BASED CACHING: O(1) component lookups instead of O(n) iteration
  private spatialMemoryCache = new Map<string, SpatialMemoryComponent>();
  private episodicMemoryCache = new Map<string, readonly EpisodicMemory[]>();

  // LOOKUP TABLE: Precomputed valid resource types (Set for O(1) checks)
  private readonly validResourceTypes = new Set<ResourceType>(['food', 'wood', 'stone', 'water']);

  // LOOKUP TABLE: Valid event types for resource location memories
  private readonly validEventTypes = new Set<string>([
    'resource:gathered',
    'resource:seen',
    'resource_location',
    'vision:resource'
  ]);

  // Cache synchronization
  private cacheRebuildCounter = 0;
  private readonly CACHE_REBUILD_INTERVAL = 1000; // Rebuild every 50 seconds

  // ZERO ALLOCATIONS: Reusable working object for position extraction
  private readonly workingPosition = { x: 0, y: 0 };

  protected onUpdate(ctx: SystemContext): void {
    // EARLY EXIT: No entities with spatial memory (activationComponents handles this)
    if (ctx.activeEntities.length === 0) {
      return;
    }

    // Periodic cache rebuild for correctness
    this.cacheRebuildCounter++;
    if (this.cacheRebuildCounter >= this.CACHE_REBUILD_INTERVAL) {
      this._rebuildCaches(ctx.activeEntities);
      this.cacheRebuildCounter = 0;
    }

    // Get entities with both spatial and episodic memory
    const memoryEntities = ctx.activeEntities.filter(e =>
      e.components.has(CT.SpatialMemory) &&
      e.components.has(CT.EpisodicMemory)
    );

    // EARLY EXIT: No entities with both memory types
    if (memoryEntities.length === 0) {
      return;
    }

    // Sync caches for new entities
    this._syncCaches(memoryEntities);

    for (const entity of memoryEntities) {
      try {
        this._syncMemoriesOptimized(entity, ctx.tick);
      } catch (error) {
        throw new Error(`SpatialMemoryQuerySystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  /**
   * CACHE OPTIMIZATION: Rebuild component caches from entities
   */
  private _rebuildCaches(entities: ReadonlyArray<Entity>): void {
    this.spatialMemoryCache.clear();
    this.episodicMemoryCache.clear();
    this.lastProcessedMemoryCount.clear();

    for (const entity of entities) {
      const spatial = getSpatialMemory(entity);
      const episodic = getEpisodicMemory(entity);

      if (spatial) {
        this.spatialMemoryCache.set(entity.id, spatial);
      }
      if (episodic) {
        this.episodicMemoryCache.set(entity.id, episodic.episodicMemories);
      }
    }
  }

  /**
   * CACHE OPTIMIZATION: Sync caches with new entities (incremental update)
   */
  private _syncCaches(entities: ReadonlyArray<Entity>): void {
    for (const entity of entities) {
      // Add new entities to caches
      if (!this.spatialMemoryCache.has(entity.id)) {
        const spatial = getSpatialMemory(entity);
        if (spatial) {
          this.spatialMemoryCache.set(entity.id, spatial);
        }
      }

      if (!this.episodicMemoryCache.has(entity.id)) {
        const episodic = getEpisodicMemory(entity);
        if (episodic) {
          this.episodicMemoryCache.set(entity.id, episodic.episodicMemories);
        }
      }
    }
  }

  /**
   * OPTIMIZED: Synchronize episodic memories with spatial memory index using cached components
   */
  private _syncMemoriesOptimized(entity: Entity, currentTick: number): void {
    // O(1) Map lookup instead of O(n) component iteration
    const spatialMemory = this.spatialMemoryCache.get(entity.id);
    if (!spatialMemory) {
      throw new Error('SpatialMemory component missing from cache');
    }

    const memories = this.episodicMemoryCache.get(entity.id);
    if (!memories) {
      throw new Error('EpisodicMemory component missing from cache');
    }

    // Track how many memories we've processed
    const lastProcessed = this.lastProcessedMemoryCount.get(entity.id) ?? 0;

    // EARLY EXIT: No new memories to process
    if (memories.length <= lastProcessed) {
      return;
    }

    // Process new memories (slice is necessary here - creates minimal allocations)
    const newMemories = memories.slice(lastProcessed);

    for (const memory of newMemories) {
      this._indexResourceMemoryOptimized(memory, spatialMemory, currentTick);
    }

    this.lastProcessedMemoryCount.set(entity.id, memories.length);
  }

  /**
   * OPTIMIZED: Index a resource-related memory using lookup tables and zero allocations
   */
  private _indexResourceMemoryOptimized(memory: EpisodicMemory, spatialMemory: SpatialMemoryComponent, currentTick: number): void {
    // EARLY EXIT: Check event type using O(1) Set lookup
    if (!this.validEventTypes.has(memory.eventType)) {
      return;
    }

    // Extract resource type and position (inlined for performance)
    const resourceType = this._extractResourceTypeOptimized(memory);
    if (!resourceType) {
      return; // No valid resource type found
    }

    // ZERO ALLOCATIONS: Reuse working object for position
    if (!this._extractPositionOptimized(memory)) {
      return; // Invalid position
    }

    const tick = memory.timestamp ?? currentTick;

    // Record in spatial memory (uses workingPosition, no new allocation)
    try {
      spatialMemory.recordResourceLocation(resourceType, this.workingPosition, tick);
    } catch (error) {
      // Log but don't throw - some memories may have invalid data
      // This is acceptable as it's a best-effort indexing system
      console.warn(`Failed to index resource memory: ${error}`);
    }
  }

  /**
   * OPTIMIZED: Extract resource type using precomputed Set for O(1) lookups
   * Returns null if no valid resource found
   */
  private _extractResourceTypeOptimized(memory: EpisodicMemory): ResourceType | null {
    const description = memory.summary ?? '';
    const lowerDesc = description.toLowerCase();

    // O(1) checks using Set - iterate through valid types only (4 iterations max)
    for (const resource of this.validResourceTypes) {
      if (lowerDesc.includes(resource)) {
        return resource;
      }
    }

    return null;
  }

  /**
   * ZERO ALLOCATIONS: Extract position into reusable working object
   * Returns true if valid position extracted, false otherwise
   */
  private _extractPositionOptimized(memory: EpisodicMemory): boolean {
    // Try location property from EpisodicMemory
    if (memory.location &&
        typeof memory.location.x === 'number' &&
        typeof memory.location.y === 'number') {
      // Reuse working object - zero allocations
      this.workingPosition.x = memory.location.x;
      this.workingPosition.y = memory.location.y;
      return true;
    }

    return false;
  }

  /**
   * OPTIMIZED: Query spatial memory for nearest resource using cached components
   * Exposed for AI system (external API - maintains compatibility)
   */
  queryNearestResource(
    entity: Entity,
    resourceType: ResourceType,
    currentTick: number
  ): { position: { x: number; y: number }; confidence: number } | null {
    // Try cache first (O(1) lookup)
    let spatialMemory: SpatialMemoryComponent | null | undefined = this.spatialMemoryCache.get(entity.id);

    // Fallback to component lookup if not cached (rare - only for first query)
    if (!spatialMemory) {
      spatialMemory = getSpatialMemory(entity);
      if (!spatialMemory) {
        return null;
      }
      // Update cache for future queries
      this.spatialMemoryCache.set(entity.id, spatialMemory);
    }

    // Get agent position for distance ranking
    const agentPosition = getPosition(entity);

    // Query memories (spatial memory component handles the heavy lifting)
    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition ?? undefined,
      1 // Just get the best one
    );

    // EARLY EXIT: No results
    if (results.length === 0) {
      return null;
    }

    const best = results[0];
    if (!best) {
      return null;
    }

    // Return reference to existing position object (no allocation)
    return {
      position: best.position,
      confidence: best.confidence,
    };
  }

  /**
   * OPTIMIZED: Query all known resource locations using cached components
   * For planning/exploration - exposed API maintains compatibility
   */
  queryAllResources(
    entity: Entity,
    resourceType: ResourceType,
    currentTick: number,
    limit?: number
  ): Array<{ position: { x: number; y: number }; confidence: number }> {
    // Try cache first (O(1) lookup)
    let spatialMemory: SpatialMemoryComponent | null | undefined = this.spatialMemoryCache.get(entity.id);

    // Fallback to component lookup if not cached
    if (!spatialMemory) {
      spatialMemory = getSpatialMemory(entity);
      if (!spatialMemory) {
        return [];
      }
      // Update cache for future queries
      this.spatialMemoryCache.set(entity.id, spatialMemory);
    }

    // Get agent position
    const agentPosition = getPosition(entity);

    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition ?? undefined,
      limit
    );

    // Map is necessary here to transform ResourceLocationMemory to expected format
    // This is the external API contract, so we maintain compatibility
    return results.map((r: ResourceLocationMemory) => ({
      position: r.position,
      confidence: r.confidence,
    }));
  }
}

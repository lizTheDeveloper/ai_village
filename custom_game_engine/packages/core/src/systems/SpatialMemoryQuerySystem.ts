import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { ResourceType } from '../components/ResourceComponent.js';
import type { SpatialMemoryComponent, ResourceLocationMemory } from '../components/SpatialMemoryComponent.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { getPosition, getSpatialMemory, getEpisodicMemory } from '../utils/componentHelpers.js';

/**
 * SpatialMemoryQuerySystem synchronizes between EpisodicMemory and SpatialMemory
 * Extracts resource location memories and indexes them for spatial queries
 */
export class SpatialMemoryQuerySystem extends BaseSystem {
  public readonly id: SystemId = 'spatial_memory_query';
  public readonly priority: number = 105; // After MemoryFormation, before BeliefFormation
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 20; // Every 1 second - memory indexing can be batched

  // Future: Add event bus support for memory indexing events
  private lastProcessedMemoryCount: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    // Get entities with both spatial and episodic memory
    const memoryEntities = ctx.activeEntities.filter(e =>
      e.components.has(CT.SpatialMemory) &&
      e.components.has(CT.EpisodicMemory)
    );

    for (const entity of memoryEntities) {
      try {
        this._syncMemories(entity, ctx.tick);
      } catch (error) {
        throw new Error(`SpatialMemoryQuerySystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  /**
   * Synchronize episodic memories with spatial memory index
   */
  private _syncMemories(entity: Entity, currentTick: number): void {
    const spatialMemory = getSpatialMemory(entity);
    if (!spatialMemory) {
      throw new Error('SpatialMemory component missing');
    }

    const episodicMemory = getEpisodicMemory(entity);
    if (!episodicMemory) {
      throw new Error('EpisodicMemory component missing');
    }

    const memories = episodicMemory.episodicMemories;

    // Track how many memories we've processed
    const lastProcessed = this.lastProcessedMemoryCount.get(entity.id) ?? 0;

    if (memories.length <= lastProcessed) {
      return; // No new memories
    }

    // Process new memories
    const newMemories = memories.slice(lastProcessed);

    for (const memory of newMemories) {
      this._indexResourceMemory(memory, spatialMemory, currentTick);
    }

    this.lastProcessedMemoryCount.set(entity.id, memories.length);
  }

  /**
   * Index a resource-related memory into spatial memory
   */
  private _indexResourceMemory(memory: EpisodicMemory, spatialMemory: SpatialMemoryComponent, currentTick: number): void {
    // Check if memory contains resource location information
    if (!this._isResourceLocationMemory(memory)) {
      return;
    }

    const resourceType = this._extractResourceType(memory);
    const position = this._extractPosition(memory);
    const tick = memory.timestamp ?? currentTick;

    if (!resourceType || !position) {
      return; // Missing required information
    }

    // Validate before recording
    if (position.x === undefined || position.y === undefined) {
      return;
    }

    // Record in spatial memory
    try {
      spatialMemory.recordResourceLocation(resourceType, position, tick);
    } catch (error) {
      // Log but don't throw - some memories may have invalid data
      // This is acceptable as it's a best-effort indexing system
      console.warn(`Failed to index resource memory: ${error}`);
    }
  }

  /**
   * Check if memory contains resource location info
   */
  private _isResourceLocationMemory(memory: EpisodicMemory): boolean {
    const validTypes = [
      'resource:gathered',
      'resource:seen',
      'resource_location',
      'vision:resource',
    ];

    return validTypes.includes(memory.eventType);
  }

  /**
   * Extract resource type from memory
   */
  private _extractResourceType(memory: EpisodicMemory): ResourceType | null {
    // Try description parsing
    const description = memory.summary ?? '';
    const validResources: ResourceType[] = ['food', 'wood', 'stone', 'water'];

    for (const resource of validResources) {
      if (description.toLowerCase().includes(resource)) {
        return resource;
      }
    }

    return null;
  }

  /**
   * Extract position from memory
   */
  private _extractPosition(memory: EpisodicMemory): { x: number; y: number } | null {
    // Try location property from EpisodicMemory
    if (memory.location && typeof memory.location.x === 'number' && typeof memory.location.y === 'number') {
      return { x: memory.location.x, y: memory.location.y };
    }

    return null;
  }

  /**
   * Query spatial memory for nearest resource (exposed for AI system)
   */
  queryNearestResource(
    entity: Entity,
    resourceType: ResourceType,
    currentTick: number
  ): { position: { x: number; y: number }; confidence: number } | null {
    const spatialMemory = getSpatialMemory(entity);
    if (!spatialMemory) {
      return null;
    }

    // Get agent position for distance ranking
    const agentPosition = getPosition(entity);

    // Query memories
    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition ?? undefined,
      1 // Just get the best one
    );

    if (results.length === 0) {
      return null;
    }

    const best = results[0];
    if (!best) {
      return null;
    }

    return {
      position: best.position,
      confidence: best.confidence,
    };
  }

  /**
   * Query all known resource locations (for planning/exploration)
   */
  queryAllResources(
    entity: Entity,
    resourceType: ResourceType,
    currentTick: number,
    limit?: number
  ): Array<{ position: { x: number; y: number }; confidence: number }> {
    const spatialMemory = getSpatialMemory(entity);
    if (!spatialMemory) {
      return [];
    }

    // Get agent position
    const agentPosition = getPosition(entity);

    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition ?? undefined,
      limit
    );

    return results.map((r: ResourceLocationMemory) => ({
      position: r.position,
      confidence: r.confidence,
    }));
  }
}

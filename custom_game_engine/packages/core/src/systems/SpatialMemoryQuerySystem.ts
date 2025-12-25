import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { ResourceType } from '../components/ResourceComponent.js';

/**
 * SpatialMemoryQuerySystem synchronizes between EpisodicMemory and SpatialMemory
 * Extracts resource location memories and indexes them for spatial queries
 */
export class SpatialMemoryQuerySystem implements System {
  public readonly id: SystemId = 'spatial_memory_query';
  public readonly priority: number = 105; // After MemoryFormation, before BeliefFormation
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Future: Add event bus support for memory indexing events
  private lastProcessedMemoryCount: Map<string, number> = new Map();

  initialize(_world: World, _eventBus: EventBus): void {
    // Future: Subscribe to memory formation events
  }

  update(_world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Get entities with both spatial and episodic memory
    const memoryEntities = entities.filter(e =>
      e.components.has('SpatialMemory') &&
      e.components.has('EpisodicMemory')
    );

    for (const entity of memoryEntities) {
      try {
        this._syncMemories(entity, currentTick);
      } catch (error) {
        throw new Error(`SpatialMemoryQuerySystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  /**
   * Synchronize episodic memories with spatial memory index
   */
  private _syncMemories(entity: Entity, currentTick: number): void {
    const impl = entity as EntityImpl;

    const spatialMemory = impl.getComponent('SpatialMemory') as any;
    if (!spatialMemory) {
      throw new Error('SpatialMemory component missing');
    }

    const episodicMemory = impl.getComponent('EpisodicMemory') as any;
    if (!episodicMemory) {
      throw new Error('EpisodicMemory component missing');
    }

    const memories = episodicMemory.memories ?? [];

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
  private _indexResourceMemory(memory: any, spatialMemory: any, currentTick: number): void {
    // Check if memory contains resource location information
    if (!this._isResourceLocationMemory(memory)) {
      return;
    }

    const resourceType = this._extractResourceType(memory);
    const position = this._extractPosition(memory);
    const tick = memory.tick ?? currentTick;

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
  private _isResourceLocationMemory(memory: any): boolean {
    const validTypes = [
      'resource:gathered',
      'resource:seen',
      'resource_location',
      'vision:resource',
    ];

    return validTypes.includes(memory.type);
  }

  /**
   * Extract resource type from memory
   */
  private _extractResourceType(memory: any): ResourceType | null {
    // Try direct property
    if (memory.resourceType) {
      return memory.resourceType as ResourceType;
    }

    // Try data object
    if (memory.data?.resourceType) {
      return memory.data.resourceType as ResourceType;
    }

    // Try description parsing (less reliable)
    const description = memory.description ?? '';
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
  private _extractPosition(memory: any): { x: number; y: number } | null {
    // Try direct property
    if (memory.position && typeof memory.position.x === 'number' && typeof memory.position.y === 'number') {
      return { x: memory.position.x, y: memory.position.y };
    }

    // Try location property
    if (memory.location && typeof memory.location.x === 'number' && typeof memory.location.y === 'number') {
      return { x: memory.location.x, y: memory.location.y };
    }

    // Try data object
    if (memory.data?.position && typeof memory.data.position.x === 'number' && typeof memory.data.position.y === 'number') {
      return { x: memory.data.position.x, y: memory.data.position.y };
    }

    if (memory.data?.location && typeof memory.data.location.x === 'number' && typeof memory.data.location.y === 'number') {
      return { x: memory.data.location.x, y: memory.data.location.y };
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
    const impl = entity as EntityImpl;

    if (!impl.hasComponent('SpatialMemory')) {
      return null;
    }

    const spatialMemory = impl.getComponent('SpatialMemory') as any;
    if (!spatialMemory) return null;

    // Get agent position for distance ranking
    let agentPosition: { x: number; y: number } | undefined;
    if (impl.hasComponent('Position')) {
      agentPosition = impl.getComponent('Position') as any;
    }

    // Query memories
    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition,
      1 // Just get the best one
    );

    if (results.length === 0) {
      return null;
    }

    const best = results[0];
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
    const impl = entity as EntityImpl;

    if (!impl.hasComponent('SpatialMemory')) {
      return [];
    }

    const spatialMemory = impl.getComponent('SpatialMemory') as any;
    if (!spatialMemory) return [];

    // Get agent position
    let agentPosition: { x: number; y: number } | undefined;
    if (impl.hasComponent('Position')) {
      agentPosition = impl.getComponent('Position') as any;
    }

    const results = spatialMemory.queryResourceLocations(
      resourceType,
      currentTick,
      agentPosition,
      limit
    );

    return results.map((r: any) => ({
      position: r.position,
      confidence: r.confidence,
    }));
  }
}

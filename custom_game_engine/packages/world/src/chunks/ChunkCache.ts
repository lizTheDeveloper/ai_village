/**
 * ChunkCache - Per-chunk entity indexing for spatial queries
 *
 * Maintains indexes of entities within each chunk for fast spatial lookups.
 * Only indexes ALWAYS and PROXIMITY simulation mode entities (not PASSIVE).
 *
 * Integration with SimulationScheduler:
 * - ALWAYS entities (agents, buildings): Always in index
 * - PROXIMITY entities (plants, animals): Only when on-screen
 * - PASSIVE entities (resources, items): NOT INDEXED (event-driven only)
 *
 * Cache invalidation:
 * - Lazy: Mark chunk dirty when entities move
 * - Rebuild: Happens on next query or every N ticks (throttled)
 */

import type { EntityId } from '@ai-village/core';
import type { ComponentType } from '@ai-village/core';
import type { TerrainFeature } from '../terrain/TerrainFeatureAnalyzer.js';

/**
 * Per-chunk entity index and statistics
 */
export interface ChunkCache {
  /** Chunk coordinates */
  readonly chunkX: number;
  readonly chunkY: number;

  /**
   * Entity indexes by component type
   * Only contains ALWAYS and PROXIMITY entities (not PASSIVE)
   *
   * Example: {
   *   'agent': Set(['agent1', 'agent2']),
   *   'building': Set(['building1']),
   *   'plant': Set(['plant1', 'plant2', 'plant3'])
   * }
   */
  entityIndex: Map<ComponentType, Set<EntityId>>;

  /**
   * Aggregated statistics (updated when cache rebuilt)
   * Useful for quick queries without iterating entities
   */
  stats: ChunkCacheStats;

  /**
   * Terrain features detected in this chunk
   * null = not yet analyzed (lazy initialization)
   * Analyzed on first access by VisionProcessor
   */
  terrainFeatures: TerrainFeature[] | null;

  /**
   * Game tick when terrain was last analyzed
   * Used for cache expiry (re-analyze after 12000 ticks = 10 minutes)
   */
  terrainAnalyzedAt: number;

  /**
   * Cache invalidation flag
   * Set to true when entities move in/out of chunk or terrain changes
   * Cleared when cache is rebuilt
   */
  dirty: boolean;

  /**
   * Last update tick
   * Used for throttling cache rebuilds
   */
  lastUpdate: number;
}

/**
 * Chunk statistics for quick queries
 */
export interface ChunkCacheStats {
  /** Total entities in this chunk (ALWAYS + PROXIMITY) */
  totalEntities: number;

  /** Count by simulation mode */
  simulationModes: {
    /** ALWAYS entities (agents, buildings, deities) */
    always: number;
    /** PROXIMITY entities (visible plants, animals) */
    proximity: number;
    /** PASSIVE entities (NOT INDEXED - always 0) */
    passive: number;
  };

  /** Count by entity type (for common queries) */
  entityTypes: {
    agents: number;
    buildings: number;
    plants: number;
    animals: number;
  };

  /**
   * Building type counts for O(1) lookups (e.g., campfire detection)
   * Map<buildingType, count>
   * Example: { 'campfire': 1, 'workbench': 2 }
   */
  buildingTypes: Map<string, number>;

  /**
   * Pending builds - agents currently building specific types
   * Map<buildingType, count>
   * Example: { 'campfire': 1 } = one agent is building a campfire
   */
  pendingBuilds: Map<string, number>;
}

/**
 * Create an empty chunk cache
 */
export function createChunkCache(chunkX: number, chunkY: number): ChunkCache {
  return {
    chunkX,
    chunkY,
    entityIndex: new Map(),
    stats: {
      totalEntities: 0,
      simulationModes: {
        always: 0,
        proximity: 0,
        passive: 0,
      },
      entityTypes: {
        agents: 0,
        buildings: 0,
        plants: 0,
        animals: 0,
      },
      buildingTypes: new Map(),
      pendingBuilds: new Map(),
    },
    terrainFeatures: null, // Lazy initialization - analyzed on first access
    terrainAnalyzedAt: 0,
    dirty: true, // Start dirty, will be built on first query
    lastUpdate: 0,
  };
}

/**
 * Add entity to chunk cache index
 *
 * @param cache - Chunk cache
 * @param entityId - Entity ID
 * @param componentType - Primary component type (agent, building, plant, etc.)
 */
export function addToChunkCache(
  cache: ChunkCache,
  entityId: EntityId,
  componentType: ComponentType
): void {
  let entities = cache.entityIndex.get(componentType);
  if (!entities) {
    entities = new Set();
    cache.entityIndex.set(componentType, entities);
  }
  entities.add(entityId);

  // Mark dirty for stats recalculation
  cache.dirty = true;
}

/**
 * Remove entity from chunk cache index
 *
 * @param cache - Chunk cache
 * @param entityId - Entity ID
 * @param componentType - Primary component type
 */
export function removeFromChunkCache(
  cache: ChunkCache,
  entityId: EntityId,
  componentType: ComponentType
): void {
  const entities = cache.entityIndex.get(componentType);
  if (entities) {
    entities.delete(entityId);
    if (entities.size === 0) {
      cache.entityIndex.delete(componentType);
    }
  }

  // Mark dirty for stats recalculation
  cache.dirty = true;
}

/**
 * Get all entities of a specific component type in chunk
 *
 * @param cache - Chunk cache
 * @param componentType - Component type to query
 * @returns Set of entity IDs (empty set if none)
 */
export function getEntitiesInChunk(
  cache: ChunkCache,
  componentType: ComponentType
): ReadonlySet<EntityId> {
  return cache.entityIndex.get(componentType) || new Set();
}

/**
 * Get all entities in chunk (all component types)
 *
 * @param cache - Chunk cache
 * @returns Array of all entity IDs in chunk
 */
export function getAllEntitiesInChunk(cache: ChunkCache): EntityId[] {
  const allEntities: EntityId[] = [];
  for (const entities of cache.entityIndex.values()) {
    allEntities.push(...entities);
  }
  return allEntities;
}

/**
 * Clear chunk cache (remove all entities)
 *
 * @param cache - Chunk cache
 */
export function clearChunkCache(cache: ChunkCache): void {
  cache.entityIndex.clear();
  cache.stats = {
    totalEntities: 0,
    simulationModes: {
      always: 0,
      proximity: 0,
      passive: 0,
    },
    entityTypes: {
      agents: 0,
      buildings: 0,
      plants: 0,
      animals: 0,
    },
    buildingTypes: new Map(),
    pendingBuilds: new Map(),
  };
  cache.dirty = false;
}

/**
 * Recalculate chunk statistics
 * Call this after adding/removing entities or when dirty flag is set
 *
 * @param cache - Chunk cache
 * @param world - World instance (needed to query entity components and simulation modes)
 */
export function recalculateChunkStats(
  cache: ChunkCache,
  world?: {
    getEntity(id: string): { id: string; components: Map<string, unknown> } | undefined;
    simulationScheduler?: {
      isAlwaysActive?(entity: { id: string; components: Map<string, unknown> }): boolean;
    };
  }
): void {
  let totalEntities = 0;
  const entityTypes = {
    agents: 0,
    buildings: 0,
    plants: 0,
    animals: 0,
  };

  // Clear previous Maps
  const buildingTypes = new Map<string, number>();
  const pendingBuilds = new Map<string, number>();

  // Track actual simulation modes by querying SimulationScheduler
  const simulationModeCounts = {
    always: 0,
    proximity: 0,
    passive: 0, // PASSIVE entities are not indexed, so this should always be 0
  };

  for (const [componentType, entities] of cache.entityIndex) {
    totalEntities += entities.size;

    // Count by entity type (based on component)
    if (componentType === 'agent') {
      entityTypes.agents += entities.size;

      // If world provided, check for agents building specific types
      if (world) {
        for (const entityId of entities) {
          const entity = world.getEntity(entityId);
          if (!entity) continue;

          const agentComp = entity.components.get('agent') as { behavior: string; behaviorState?: { buildingType?: string } } | undefined;
          if (agentComp?.behavior === 'build' && agentComp.behaviorState?.buildingType) {
            const buildingType = agentComp.behaviorState.buildingType;
            pendingBuilds.set(buildingType, (pendingBuilds.get(buildingType) || 0) + 1);
          }
        }
      }
    } else if (componentType === 'building') {
      entityTypes.buildings += entities.size;

      // If world provided, count by building type for O(1) lookups
      if (world) {
        for (const entityId of entities) {
          const entity = world.getEntity(entityId);
          if (!entity) continue;

          const buildingComp = entity.components.get('building') as { buildingType?: string } | undefined;
          if (buildingComp?.buildingType) {
            const buildingType = buildingComp.buildingType;
            buildingTypes.set(buildingType, (buildingTypes.get(buildingType) || 0) + 1);
          }
        }
      }
    } else if (componentType === 'plant') {
      entityTypes.plants += entities.size;
    } else if (componentType === 'animal') {
      entityTypes.animals += entities.size;
    }
  }

  // Query actual simulation modes from SimulationScheduler
  // This provides accurate simulation mode counts instead of assumptions
  if (world?.simulationScheduler?.isAlwaysActive) {
    // Count entities by their actual simulation mode
    for (const [_, entities] of cache.entityIndex) {
      for (const entityId of entities) {
        const entity = world.getEntity(entityId);
        if (!entity) continue;

        // Check if entity is ALWAYS mode using SimulationScheduler
        const isAlways = world.simulationScheduler.isAlwaysActive(entity);
        if (isAlways) {
          simulationModeCounts.always++;
        } else {
          // Not ALWAYS means PROXIMITY (PASSIVE entities are not indexed)
          simulationModeCounts.proximity++;
        }
      }
    }
  } else {
    // Fallback: Use component-based heuristics if SimulationScheduler not available
    // This ensures backward compatibility with tests or environments without scheduler
    simulationModeCounts.always = entityTypes.agents + entityTypes.buildings;
    simulationModeCounts.proximity = entityTypes.plants + entityTypes.animals;
  }

  cache.stats = {
    totalEntities,
    simulationModes: simulationModeCounts,
    entityTypes,
    buildingTypes,
    pendingBuilds,
  };

  cache.dirty = false;
}

/**
 * Check if chunk cache needs rebuilding
 *
 * @param cache - Chunk cache
 * @param currentTick - Current game tick
 * @param rebuildInterval - Ticks between rebuilds (default: 20 = 1 second)
 * @returns True if cache should be rebuilt
 */
export function shouldRebuildChunkCache(
  cache: ChunkCache,
  currentTick: number,
  rebuildInterval: number = 20
): boolean {
  // Always rebuild if dirty
  if (cache.dirty) return true;

  // Rebuild if interval elapsed
  const ticksSinceUpdate = currentTick - cache.lastUpdate;
  return ticksSinceUpdate >= rebuildInterval;
}

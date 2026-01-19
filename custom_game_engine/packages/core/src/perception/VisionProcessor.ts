/**
 * VisionProcessor - Handles visual perception for agents
 *
 * This processor detects nearby entities (resources, plants, agents) within
 * an agent's vision range and updates the VisionComponent and MemoryComponent.
 *
 * Enhanced with:
 * - Tiered vision system (close/area/distant) to manage context size
 * - Terrain feature detection based on geomorphometry research
 *
 * Tiered Vision (1 tile = 1 meter, humans = 2 tiles tall):
 * - Close range (~10m): Detailed perception, full context in prompts
 * - Area range (~50m): Entity detection, summarized in prompts
 * - Distant range (~200m): Landmarks only, navigation context
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import { VISION_TIERS } from '../components/VisionComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import { SpatialMemoryComponent, addSpatialMemory } from '../components/SpatialMemoryComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import type {
  TerrainFeature,
  TerrainAnalyzer,
  TerrainCache,
  TerrainDescriptionCacheStatic,
} from '../types/TerrainTypes.js';

/**
 * Limits for entities per tier to prevent context bloat.
 * These determine max entities included in agent prompts.
 */
const TIER_LIMITS = {
  /** Max entities in close range (detailed in prompt) */
  CLOSE: 10,
  /** Max entities in area range (summarized in prompt) */
  AREA: 50,
  /** Max landmarks in distant range */
  DISTANT: 20,
} as const;

/**
 * Terrain services injected at runtime from @ai-village/world.
 * Using let to allow injection after module load.
 */
let terrainAnalyzer: TerrainAnalyzer | null = null;
let terrainCache: TerrainCache | null = null;
let terrainDescriptionCacheStatic: TerrainDescriptionCacheStatic | null = null;

/**
 * Chunk spatial query service injected at runtime from @ai-village/world.
 * Used for efficient spatial entity queries.
 */
let chunkSpatialQuery: any | null = null; // ChunkSpatialQuery from @ai-village/world

/**
 * Inject terrain services from @ai-village/world at runtime.
 * Called by the application bootstrap to avoid circular dependencies.
 */
export function injectTerrainServices(
  analyzer: TerrainAnalyzer,
  cache: TerrainCache,
  descriptionCache: TerrainDescriptionCacheStatic
): void {
  terrainAnalyzer = analyzer;
  terrainCache = cache;
  terrainDescriptionCacheStatic = descriptionCache;
}

/**
 * Inject chunk spatial query service from @ai-village/world.
 * Called by the application bootstrap.
 */
export function injectChunkSpatialQuery(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
}

/**
 * Entity seen at a specific distance tier.
 */
export interface TieredEntity {
  id: string;
  distance: number;
  tier: 'close' | 'area' | 'distant';
}

/**
 * Vision processing result with tiered awareness.
 */
export interface VisionResult {
  // Close range - detailed perception (for context)
  nearbyResources: TieredEntity[];
  nearbyPlants: TieredEntity[];
  nearbyAgents: TieredEntity[];

  // Area range - tactical awareness (counts for context)
  seenResources: string[];
  seenPlants: string[];
  seenAgents: string[];

  // Distant range - landmarks only
  distantLandmarks: string[];

  // Summary counts for efficient context building
  counts: {
    closeResources: number;
    closeAgents: number;
    closePlants: number;
    areaResources: number;
    areaAgents: number;
    areaPlants: number;
    distantLandmarks: number;
  };

  /** Natural language description of nearby terrain features */
  terrainDescription: string;
  /** Detected terrain features (peaks, cliffs, lakes, etc.) */
  terrainFeatures: TerrainFeature[];
}

/**
 * VisionProcessor Class
 *
 * Usage:
 * ```typescript
 * const visionProcessor = new VisionProcessor();
 *
 * // In system update loop
 * visionProcessor.process(entity, world);
 * ```
 */
export class VisionProcessor {
  /**
   * Process vision for an entity with tiered awareness.
   *
   * Tiers:
   * - Close range (closeRange, default 10m): Full detail, included in prompt
   * - Area range (range, default 50m): Detected, summarized in prompt
   * - Distant range (distantRange, default 200m): Landmarks only
   */
  process(entity: EntityImpl, world: World): VisionResult {
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

    const emptyResult: VisionResult = {
      nearbyResources: [],
      nearbyPlants: [],
      nearbyAgents: [],
      seenResources: [],
      seenPlants: [],
      seenAgents: [],
      distantLandmarks: [],
      counts: {
        closeResources: 0,
        closeAgents: 0,
        closePlants: 0,
        areaResources: 0,
        areaAgents: 0,
        areaPlants: 0,
        distantLandmarks: 0,
      },
      terrainDescription: '',
      terrainFeatures: [],
    };

    if (!vision || !spatialMemory) {
      return emptyResult;
    }

    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) {
      return emptyResult;
    }

    // Get vision ranges (with defaults)
    const closeRange = vision.closeRange ?? VISION_TIERS.CLOSE;
    const areaRange = vision.range ?? VISION_TIERS.AREA;
    const distantRange = vision.distantRange ?? VISION_TIERS.DISTANT;

    // Tiered detection results
    const nearbyResources: TieredEntity[] = [];
    const nearbyPlants: TieredEntity[] = [];
    const nearbyAgents: TieredEntity[] = [];
    const seenResourceIds: string[] = [];
    const seenAgentIds: string[] = [];
    const seenPlantIds: string[] = [];
    const distantLandmarks: string[] = [];

    // Detect resources with tiered awareness
    if (vision.canSeeResources) {
      this.detectResourcesTiered(
        world, position, spatialMemory,
        closeRange, areaRange,
        nearbyResources, seenResourceIds
      );
    }

    // Detect plants with tiered awareness
    this.detectPlantsTiered(
      world, position, spatialMemory,
      closeRange, areaRange,
      nearbyPlants, seenPlantIds
    );

    // Detect agents with tiered awareness
    if (vision.canSeeAgents) {
      this.detectAgentsTiered(
        entity, world, position, spatialMemory,
        closeRange, areaRange,
        nearbyAgents, seenAgentIds
      );
    }

    // Detect terrain features using distant range
    const { features, description } = this.detectTerrainFeatures(
      entity,
      world,
      position,
      { ...vision, range: distantRange }, // Use distant range for terrain
      spatialMemory
    );

    // Extract landmark IDs from terrain features
    for (const feature of features.slice(0, TIER_LIMITS.DISTANT)) {
      if (feature.type === 'peak' || feature.type === 'cliff' || feature.type === 'lake') {
        distantLandmarks.push(`${feature.type}_${Math.floor(feature.x)}_${Math.floor(feature.y)}`);
      }
    }

    // Update vision component with tiered results
    entity.updateComponent<VisionComponent>(ComponentType.Vision, (current) => ({
      ...current,
      seenAgents: seenAgentIds.slice(0, TIER_LIMITS.AREA),
      seenResources: seenResourceIds.slice(0, TIER_LIMITS.AREA),
      seenPlants: seenPlantIds.slice(0, TIER_LIMITS.AREA),
      nearbyAgents: nearbyAgents.slice(0, TIER_LIMITS.CLOSE).map(e => e.id),
      nearbyResources: nearbyResources.slice(0, TIER_LIMITS.CLOSE).map(e => e.id),
      distantLandmarks: distantLandmarks.slice(0, TIER_LIMITS.DISTANT),
      terrainDescription: description,
    }));

    return {
      nearbyResources: nearbyResources.slice(0, TIER_LIMITS.CLOSE),
      nearbyPlants: nearbyPlants.slice(0, TIER_LIMITS.CLOSE),
      nearbyAgents: nearbyAgents.slice(0, TIER_LIMITS.CLOSE),
      seenResources: seenResourceIds.slice(0, TIER_LIMITS.AREA),
      seenPlants: seenPlantIds.slice(0, TIER_LIMITS.AREA),
      seenAgents: seenAgentIds.slice(0, TIER_LIMITS.AREA),
      distantLandmarks: distantLandmarks.slice(0, TIER_LIMITS.DISTANT),
      counts: {
        closeResources: nearbyResources.length,
        closeAgents: nearbyAgents.length,
        closePlants: nearbyPlants.length,
        areaResources: seenResourceIds.length,
        areaAgents: seenAgentIds.length,
        areaPlants: seenPlantIds.length,
        distantLandmarks: distantLandmarks.length,
      },
      terrainDescription: description,
      terrainFeatures: features,
    };
  }

  /**
   * Detect resources with tiered awareness.
   *
   * OPTIMIZATION: Resources are PASSIVE mode entities (SimulationScheduler).
   * They should NOT be actively scanned every tick!
   *
   * Previous implementation: Queried ALL resources globally (3,500+ entities)
   * - 50 agents × 3,500 resources × 20 TPS = 3.5M distance checks per second
   *
   * New implementation: Resources discovered passively
   * - Resources added to SpatialMemory when agent moves near them
   * - Agents query their memory for known resource locations
   * - Targeting systems use memory, not active vision scans
   *
   * TODO: Implement passive resource discovery in MovementSystem
   * For now, this method does nothing (resources not included in vision)
   */
  private detectResourcesTiered(
    world: World,
    position: PositionComponent,
    spatialMemory: SpatialMemoryComponent,
    closeRange: number,
    areaRange: number,
    nearbyResources: TieredEntity[],
    seenResourceIds: string[]
  ): void {
    // DISABLED: Resources are PASSIVE - don't scan them actively
    // Resources will be discovered through passive proximity detection
    // and stored in SpatialMemory for later retrieval

    // Leave arrays empty - targeting systems should use SpatialMemory instead
  }

  /**
   * Detect plants with tiered awareness.
   *
   * OPTIMIZATION: Uses ChunkSpatialQuery instead of global query.
   * - Previous: Queried ALL plants globally (~100-500 plants)
   * - New: Queries only plants in relevant chunks (~10-50 plants)
   * - Performance: 10-50× reduction in entities checked
   */
  private detectPlantsTiered(
    world: World,
    position: PositionComponent,
    spatialMemory: SpatialMemoryComponent,
    closeRange: number,
    areaRange: number,
    nearbyPlants: TieredEntity[],
    seenPlantIds: string[]
  ): void {
    // Use chunk spatial query if available, otherwise fall back to global query
    if (chunkSpatialQuery) {
      // Get plants in area range using chunk-based filtering
      const plantsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        areaRange,
        [ComponentType.Plant]
      );

      // Process plants by distance tier
      for (const { entity: plantEntity, distance } of plantsInRadius) {
        const plantImpl = plantEntity as EntityImpl;
        const plant = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!plant || !plantPos) continue;

        if (distance <= closeRange) {
          // Close range - detailed awareness
          nearbyPlants.push({ id: plantEntity.id, distance, tier: 'close' });
          seenPlantIds.push(plantEntity.id);

          addSpatialMemory(
            spatialMemory,
            {
              type: 'plant_location',
              x: plantPos.x,
              y: plantPos.y,
              entityId: plantEntity.id,
              metadata: {
                speciesId: plant.speciesId,
                stage: plant.stage,
                hasSeeds: plant.seedsProduced > 0,
                hasFruit: (plant.fruitCount || 0) > 0,
              },
            },
            world.tick,
            100
          );
        } else {
          // Area range - tactical awareness
          seenPlantIds.push(plantEntity.id);

          addSpatialMemory(
            spatialMemory,
            {
              type: 'plant_location',
              x: plantPos.x,
              y: plantPos.y,
              entityId: plantEntity.id,
              metadata: { speciesId: plant.speciesId, stage: plant.stage },
            },
            world.tick,
            60
          );
        }
      }
    } else {
      // Fallback: Chunk-based iteration (for tests or when ChunkSpatialQuery unavailable)
      // Uses world.getEntitiesInChunk() which is O(nearby) instead of O(all entities)
      const CHUNK_SIZE = 32;
      const chunkX = Math.floor(position.x / CHUNK_SIZE);
      const chunkY = Math.floor(position.y / CHUNK_SIZE);
      const chunkRange = Math.ceil(areaRange / CHUNK_SIZE);

      for (let dx = -chunkRange; dx <= chunkRange; dx++) {
        for (let dy = -chunkRange; dy <= chunkRange; dy++) {
          const entityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

          for (const entityId of entityIds) {
            const plantEntity = world.getEntity(entityId);
            if (!plantEntity) continue;

            const plantImpl = plantEntity as EntityImpl;
            const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
            const plant = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);

            if (!plantPos || !plant) continue;

            const distance = this.distance(position, plantPos);

            if (distance <= closeRange) {
              nearbyPlants.push({ id: plantEntity.id, distance, tier: 'close' });
              seenPlantIds.push(plantEntity.id);

              addSpatialMemory(
                spatialMemory,
                {
                  type: 'plant_location',
                  x: plantPos.x,
                  y: plantPos.y,
                  entityId: plantEntity.id,
                  metadata: {
                    speciesId: plant.speciesId,
                    stage: plant.stage,
                    hasSeeds: plant.seedsProduced > 0,
                    hasFruit: (plant.fruitCount || 0) > 0,
                  },
                },
                world.tick,
                100
              );
            } else if (distance <= areaRange) {
              seenPlantIds.push(plantEntity.id);

              addSpatialMemory(
                spatialMemory,
                {
                  type: 'plant_location',
                  x: plantPos.x,
                  y: plantPos.y,
                  entityId: plantEntity.id,
                  metadata: { speciesId: plant.speciesId, stage: plant.stage },
                },
                world.tick,
                60
              );
            }
          }
        }
      }

      nearbyPlants.sort((a, b) => a.distance - b.distance);
    }
  }

  /**
   * Detect agents with tiered awareness.
   *
   * OPTIMIZATION: Uses ChunkSpatialQuery instead of global query.
   * - Previous: Queried ALL agents globally (~20-50 agents)
   * - New: Queries only agents in relevant chunks (~5-15 agents)
   * - Performance: 3-10× reduction in entities checked
   */
  private detectAgentsTiered(
    entity: EntityImpl,
    world: World,
    position: PositionComponent,
    spatialMemory: SpatialMemoryComponent,
    closeRange: number,
    areaRange: number,
    nearbyAgents: TieredEntity[],
    seenAgentIds: string[]
  ): void {
    // Use chunk spatial query if available, otherwise fall back to global query
    if (chunkSpatialQuery) {
      // Get agents in area range using chunk-based filtering
      const agentsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        areaRange,
        [ComponentType.Agent],
        {
          // Exclude self
          excludeIds: new Set([entity.id]),
        }
      );

      // Process agents by distance tier (already sorted by distance)
      for (const { entity: otherAgent, distance } of agentsInRadius) {
        const otherPos = (otherAgent as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
        if (!otherPos) continue;

        if (distance <= closeRange) {
          // Close range - can interact, full detail in context
          nearbyAgents.push({ id: otherAgent.id, distance, tier: 'close' });
          seenAgentIds.push(otherAgent.id);

          addSpatialMemory(
            spatialMemory,
            {
              type: 'agent_seen',
              x: otherPos.x,
              y: otherPos.y,
              entityId: otherAgent.id,
            },
            world.tick,
            100
          );
        } else {
          // Area range - can see, summarized in context
          seenAgentIds.push(otherAgent.id);

          addSpatialMemory(
            spatialMemory,
            {
              type: 'agent_seen',
              x: otherPos.x,
              y: otherPos.y,
              entityId: otherAgent.id,
            },
            world.tick,
            40
          );
        }
      }
    } else {
      // Fallback: Chunk-based iteration (for tests or when ChunkSpatialQuery unavailable)
      // Uses world.getEntitiesInChunk() which is O(nearby) instead of O(all entities)
      const CHUNK_SIZE = 32;
      const chunkX = Math.floor(position.x / CHUNK_SIZE);
      const chunkY = Math.floor(position.y / CHUNK_SIZE);
      const chunkRange = Math.ceil(areaRange / CHUNK_SIZE);

      for (let dx = -chunkRange; dx <= chunkRange; dx++) {
        for (let dy = -chunkRange; dy <= chunkRange; dy++) {
          const entityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

          for (const entityId of entityIds) {
            if (entityId === entity.id) continue;

            const otherAgent = world.getEntity(entityId);
            if (!otherAgent) continue;

            const otherImpl = otherAgent as EntityImpl;
            if (!otherImpl.hasComponent(ComponentType.Agent)) continue;

            const otherPos = otherImpl.getComponent<PositionComponent>(ComponentType.Position);
            if (!otherPos) continue;

            const distance = this.distance(position, otherPos);

            if (distance <= closeRange) {
              nearbyAgents.push({ id: otherAgent.id, distance, tier: 'close' });
              seenAgentIds.push(otherAgent.id);

              addSpatialMemory(
                spatialMemory,
                {
                  type: 'agent_seen',
                  x: otherPos.x,
                  y: otherPos.y,
                  entityId: otherAgent.id,
                },
                world.tick,
                100
              );
            } else if (distance <= areaRange) {
              seenAgentIds.push(otherAgent.id);

              addSpatialMemory(
                spatialMemory,
                {
                  type: 'agent_seen',
                  x: otherPos.x,
                  y: otherPos.y,
                  entityId: otherAgent.id,
                },
                world.tick,
                40
              );
            }
          }
        }
      }

      nearbyAgents.sort((a, b) => a.distance - b.distance);
    }
  }

  /**
   * Detect terrain features (peaks, cliffs, lakes, valleys, etc.).
   *
   * Uses research-based geomorphometry algorithms:
   * - TPI (Topographic Position Index) for feature classification
   * - Slope analysis for cliffs (>30° per US Army FM 3-25.26)
   * - Flood fill for water body detection
   *
   * Features are cached per sector (32x32 tiles) to avoid expensive re-computation.
   *
   * Only describes terrain in the direction the agent is moving/facing (forward cone).
   *
   * Stores significant terrain features in spatial memory for navigation and landmarks.
   *
   * @param entity Observer entity
   * @param world World instance
   * @param position Observer position
   * @param vision Vision component
   * @param spatialMemory Spatial memory component
   * @returns Features array and natural language description
   */
  private detectTerrainFeatures(
    entity: EntityImpl,
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    spatialMemory: SpatialMemoryComponent
  ): { features: TerrainFeature[]; description: string } {
    // Get tile accessor function from world
    const worldWithTerrain = world as {
      getTileAt?: (x: number, y: number) => any;
      getEntity?: (id: string) => any;
    };

    if (!worldWithTerrain.getTileAt) {
      return { features: [], description: '' };
    }

    // Skip terrain analysis if services not injected
    if (!terrainDescriptionCacheStatic || !terrainCache || !terrainAnalyzer) {
      return { features: [], description: '' };
    }

    // Get all chunks that intersect with vision range
    const chunks = terrainDescriptionCacheStatic.getChunksInRadius(
      position.x,
      position.y,
      vision.range
    );

    // Collect features from all chunks (using cache when available)
    const allFeatures: TerrainFeature[] = [];

    for (const { chunkX, chunkY } of chunks) {
      // Try to get from cache first
      let chunkFeatures = terrainCache!.get(chunkX, chunkY, world.tick);

      if (!chunkFeatures) {
        // Cache miss - analyze this chunk
        // Each chunk is 32x32 tiles (CHUNK_SIZE), centered on chunk * CHUNK_SIZE + 16
        const chunkCenterX = chunkX * 32 + 16;
        const chunkCenterY = chunkY * 32 + 16;
        const chunkRadius = 32; // Analyze full chunk plus some overlap

        chunkFeatures = terrainAnalyzer!.analyzeArea(
          worldWithTerrain.getTileAt.bind(worldWithTerrain),
          chunkCenterX,
          chunkCenterY,
          chunkRadius
        );

        // Cache the results
        terrainCache!.set(chunkX, chunkY, chunkFeatures, world.tick);
      }

      // Add features from this chunk that are within vision range
      for (const feature of chunkFeatures) {
        const dx = feature.x - position.x;
        const dy = feature.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= vision.range) {
          allFeatures.push(feature);
        }
      }
    }

    // Filter features to only those in the forward direction (120° cone)
    // Get agent's facing direction from velocity or last movement
    const velocity = entity.components.get('velocity') as { vx: number; vy: number } | undefined;

    let facingAngle = 0; // Default to east if no velocity
    if (velocity && (velocity.vx !== 0 || velocity.vy !== 0)) {
      facingAngle = Math.atan2(velocity.vy, velocity.vx);
    }

    // Filter features to forward 120° cone
    const forwardFeatures = allFeatures.filter(f => {
      const dx = f.x - position.x;
      const dy = f.y - position.y;
      const angleToFeature = Math.atan2(dy, dx);

      // Calculate angle difference
      let angleDiff = angleToFeature - facingAngle;
      // Normalize to -π to π
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Keep features within 120° forward cone (±60° from facing direction)
      return Math.abs(angleDiff) < (120 * Math.PI / 180) / 2;
    });

    // Generate natural language description for LLM agents (only forward features)
    const description = terrainAnalyzer!.describeNearby(
      forwardFeatures,
      position.x,
      position.y,
      vision.range
    );

    const features = forwardFeatures;

    // Store significant terrain features as landmarks in spatial memory
    // Only store major features (peaks, cliffs, lakes) to avoid memory clutter
    const significantTypes = new Set(['peak', 'cliff', 'lake', 'ridge', 'valley']);

    for (const feature of features) {
      if (!significantTypes.has(feature.type)) continue;
      if (feature.distance && feature.distance > vision.range) continue;

      // Store terrain landmark
      addSpatialMemory(
        spatialMemory,
        {
          type: 'terrain_landmark',
          x: feature.x,
          y: feature.y,
          metadata: {
            featureType: feature.type,
            description: feature.description,
            elevation: feature.elevation,
            size: feature.size,
          },
        },
        world.tick,
        200 // Higher importance for landmarks (persist longer)
      );
    }

    return { features, description };
  }

  /**
   * Calculate distance between two positions.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const visionProcessor = new VisionProcessor();

/**
 * Process vision for an entity.
 */
export function processVision(entity: Entity, world: World): VisionResult {
  return visionProcessor.process(entity as EntityImpl, world);
}

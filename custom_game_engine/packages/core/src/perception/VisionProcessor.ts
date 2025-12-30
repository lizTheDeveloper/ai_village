/**
 * VisionProcessor - Handles visual perception for agents
 *
 * This processor detects nearby entities (resources, plants, agents) within
 * an agent's vision range and updates the VisionComponent and MemoryComponent.
 *
 * Enhanced with terrain feature detection based on geomorphometry research.
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
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
 * Terrain services injected at runtime from @ai-village/world.
 * Using let to allow injection after module load.
 */
let terrainAnalyzer: TerrainAnalyzer | null = null;
let terrainCache: TerrainCache | null = null;
let terrainDescriptionCacheStatic: TerrainDescriptionCacheStatic | null = null;

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
 * Vision processing result
 */
export interface VisionResult {
  seenResources: string[];
  seenPlants: string[];
  seenAgents: string[];
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
   * Process vision for an entity, detecting nearby entities and updating components.
   */
  process(entity: EntityImpl, world: World): VisionResult {
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

    if (!vision || !spatialMemory) {
      return {
        seenResources: [],
        seenPlants: [],
        seenAgents: [],
        terrainDescription: '',
        terrainFeatures: [],
      };
    }

    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) {
      return {
        seenResources: [],
        seenPlants: [],
        seenAgents: [],
        terrainDescription: '',
        terrainFeatures: [],
      };
    }

    const seenResourceIds: string[] = [];
    const seenAgentIds: string[] = [];
    const seenPlantIds: string[] = [];

    // Detect nearby resources (mutates spatialMemory in place)
    if (vision.canSeeResources) {
      this.detectResources(world, position, vision, spatialMemory, seenResourceIds);
    }

    // Detect nearby plants (mutates spatialMemory in place)
    this.detectPlants(world, position, vision, spatialMemory, seenPlantIds);

    // Detect nearby agents (mutates spatialMemory in place)
    if (vision.canSeeAgents) {
      this.detectAgents(entity, world, position, vision, spatialMemory, seenAgentIds);
    }

    // Detect terrain features (peaks, cliffs, lakes, etc.)
    const { features, description } = this.detectTerrainFeatures(
      world,
      position,
      vision,
      spatialMemory
    );

    // Update vision component with currently seen entities and terrain
    entity.updateComponent<VisionComponent>(ComponentType.Vision, (current) => ({
      ...current,
      seenAgents: seenAgentIds,
      seenResources: seenResourceIds,
      seenPlants: seenPlantIds,
      terrainDescription: description,
    }));

    return {
      seenResources: seenResourceIds,
      seenPlants: seenPlantIds,
      seenAgents: seenAgentIds,
      terrainDescription: description,
      terrainFeatures: features,
    };
  }

  /**
   * Detect nearby resources within vision range.
   * Mutates spatialMemory in place.
   */
  private detectResources(
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    spatialMemory: SpatialMemoryComponent,
    seenResourceIds: string[]
  ): void {
    const resources = world.query().with(ComponentType.Resource).with(ComponentType.Position).executeEntities();

    for (const resource of resources) {
      const resourceImpl = resource as EntityImpl;
      const resourcePos = resourceImpl.getComponent<PositionComponent>(ComponentType.Position);
      const resourceComp = resourceImpl.getComponent<ResourceComponent>(ComponentType.Resource);

      if (!resourcePos || !resourceComp) continue;

      const distance = this.distance(position, resourcePos);

      if (distance <= vision.range && resourceComp.amount > 0) {
        // Track this resource in vision
        seenResourceIds.push(resource.id);

        // Remember this resource location
        addSpatialMemory(
          spatialMemory,
          {
            type: 'resource_location',
            x: resourcePos.x,
            y: resourcePos.y,
            entityId: resource.id,
            metadata: { resourceType: resourceComp.resourceType },
          },
          world.tick,
          80
        );
      }
    }
  }

  /**
   * Detect nearby plants within vision range.
   * Mutates spatialMemory in place.
   */
  private detectPlants(
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    spatialMemory: SpatialMemoryComponent,
    seenPlantIds: string[]
  ): void {
    const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();

    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
      const plant = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);

      if (!plantPos || !plant) continue;

      const distance = this.distance(position, plantPos);

      if (distance <= vision.range) {
        // Track this plant in vision
        seenPlantIds.push(plantEntity.id);

        // Remember this plant location
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
          80
        );
      }
    }
  }

  /**
   * Detect nearby agents within vision range.
   * Mutates spatialMemory in place.
   */
  private detectAgents(
    entity: EntityImpl,
    world: World,
    position: PositionComponent,
    vision: VisionComponent,
    spatialMemory: SpatialMemoryComponent,
    seenAgentIds: string[]
  ): void {
    const agents = world.query().with(ComponentType.Agent).with(ComponentType.Position).executeEntities();

    for (const otherAgent of agents) {
      if (otherAgent.id === entity.id) continue;

      const otherPos = (otherAgent as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
      if (!otherPos) continue;

      const distance = this.distance(position, otherPos);

      if (distance <= vision.range) {
        // Track this agent in vision
        seenAgentIds.push(otherAgent.id);

        // Remember this agent sighting
        addSpatialMemory(
          spatialMemory,
          {
            type: 'agent_seen',
            x: otherPos.x,
            y: otherPos.y,
            entityId: otherAgent.id,
          },
          world.tick,
          60
        );
      }
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
   * @param world World instance
   * @param position Observer position
   * @param vision Vision component
   * @param spatialMemory Spatial memory component
   * @returns Features array and natural language description
   */
  private detectTerrainFeatures(
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

    // Get all sectors that intersect with vision range
    const sectors = terrainDescriptionCacheStatic.getSectorsInRadius(
      position.x,
      position.y,
      vision.range
    );

    // Collect features from all sectors (using cache when available)
    const allFeatures: TerrainFeature[] = [];

    for (const { sectorX, sectorY } of sectors) {
      // Try to get from cache first
      let sectorFeatures = terrainCache!.get(sectorX, sectorY, world.tick);

      if (!sectorFeatures) {
        // Cache miss - analyze this sector
        // Each sector is 32x32 tiles, centered on sector * 32
        const sectorCenterX = sectorX * 32 + 16;
        const sectorCenterY = sectorY * 32 + 16;
        const sectorRadius = 32; // Analyze full sector plus some overlap

        sectorFeatures = terrainAnalyzer!.analyzeArea(
          worldWithTerrain.getTileAt.bind(worldWithTerrain),
          sectorCenterX,
          sectorCenterY,
          sectorRadius
        );

        // Cache the results
        terrainCache!.set(sectorX, sectorY, sectorFeatures, world.tick);
      }

      // Add features from this sector that are within vision range
      for (const feature of sectorFeatures) {
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
    const entity = worldWithTerrain.getEntity ? worldWithTerrain.getEntity((position as any).entityId) : null;
    const velocity = entity?.components.get('velocity') as { vx: number; vy: number } | undefined;

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

/**
 * PlacementScorer - Intelligent building placement scoring
 *
 * This service combines multiple layers of information to score potential
 * building locations:
 *
 * 1. World Layers (from MapKnowledge + terrain):
 *    - Path avoidance (don't build on worn paths)
 *    - Resource abundance (build near resources)
 *    - Terrain fertility (for farms)
 *    - Water proximity
 *    - Crowding (avoid or seek based on building type)
 *
 * 2. Agent Layers (from agent components):
 *    - Familiarity (how well agent knows the area)
 *    - Positive memories (emotionally pleasant locations)
 *    - Home proximity (convenience)
 *    - Personal resource knowledge
 *
 * 3. Zone Layers (from ZoneManager):
 *    - Zone affinity (match building to zone type)
 *    - Zone restrictions (wilderness, restricted)
 *
 * 4. Hard Constraints:
 *    - Terrain requirements (grass, dirt, etc.)
 *    - No overlapping buildings
 *    - Minimum accessibility (adjacent open tiles)
 *
 * Usage:
 * ```typescript
 * const scorer = new PlacementScorer(world);
 * const best = scorer.findBestPlacement(agent, 'storage-chest', 10);
 * if (best) {
 *   // Place building at best.x, best.y
 * }
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingType } from '../components/BuildingComponent.js';
import type { ExplorationStateComponent } from '../components/ExplorationStateComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { getMapKnowledge, worldToSector, type AreaResourceType } from '../navigation/MapKnowledge.js';
import { getZoneManager } from '../navigation/ZoneManager.js';
import { getPosition } from '../utils/componentHelpers.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Terrain types the world can have
 */
type TerrainType = 'grass' | 'dirt' | 'sand' | 'stone' | 'water' | 'deep_water' | 'forest';

/**
 * A scored placement candidate
 */
export interface PlacementCandidate {
  x: number;
  y: number;
  score: number;
  reasons: string[]; // Human-readable reasons for score
}

/**
 * Constraint that must be satisfied for placement
 */
export type PlacementConstraint =
  | { type: 'terrain'; allowed: TerrainType[] }
  | { type: 'terrain_forbidden'; forbidden: TerrainType[] }
  | { type: 'min_fertility'; value: number }
  | { type: 'no_path_traffic'; maxTraffic: number }
  | { type: 'prefer_high_traffic'; minTraffic: number }
  | { type: 'near_water'; maxDistance: number }
  | { type: 'near_storage'; maxDistance: number }
  | { type: 'min_accessibility'; value: number } // Adjacent open tiles
  | { type: 'min_crowding'; value: number }; // Minimum agents in sector

/**
 * Weight configuration for utility scoring
 */
export interface PlacementWeights {
  // World layers
  fertility?: number;
  waterProximity?: number;
  pathAvoidance?: number;
  crowding?: number;
  resourceAbundance?: number;

  // Agent layers
  homeProximity?: number;
  familiarity?: number;
  positiveMemories?: number;
  knownResources?: number;

  // Zone layers
  zoneAffinity?: number;
}

// ============================================================================
// Building Configuration
// ============================================================================

/**
 * Hard constraints for each building type
 * If any constraint fails, the tile is not viable
 */
export const BUILDING_CONSTRAINTS: Partial<Record<BuildingType, PlacementConstraint[]>> = {
  'workbench': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
    { type: 'no_path_traffic', maxTraffic: 50 },
  ],
  'storage-chest': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'stone'] },
    { type: 'no_path_traffic', maxTraffic: 100 },
    { type: 'min_accessibility', value: 2 },
  ],
  'storage-box': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'stone'] },
    { type: 'no_path_traffic', maxTraffic: 100 },
  ],
  'campfire': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'stone', 'sand'] },
    { type: 'terrain_forbidden', forbidden: ['water', 'deep_water', 'forest'] },
  ],
  'tent': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
    { type: 'no_path_traffic', maxTraffic: 30 },
  ],
  'well': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
    { type: 'near_water', maxDistance: 8 },
  ],
  'lean-to': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'forest'] },
  ],
  'bed': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
    { type: 'no_path_traffic', maxTraffic: 20 },
  ],
  'bedroll': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'sand'] },
  ],
  'forge': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'stone'] },
    { type: 'no_path_traffic', maxTraffic: 50 },
  ],
  'workshop': [
    { type: 'terrain', allowed: ['grass', 'dirt', 'stone'] },
    { type: 'no_path_traffic', maxTraffic: 30 },
    { type: 'near_storage', maxDistance: 10 },
  ],
  'barn': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
  ],
  'farm_shed': [
    { type: 'terrain', allowed: ['grass', 'dirt'] },
    { type: 'min_fertility', value: 20 },
  ],
};

/**
 * Utility weights for each building type
 * Higher weight = more important factor in scoring
 */
export const BUILDING_UTILITY_WEIGHTS: Partial<Record<BuildingType, PlacementWeights>> = {
  'workbench': {
    pathAvoidance: 0.5,
    homeProximity: 0.4,
    familiarity: 0.3,
    zoneAffinity: 1.0,
  },
  'storage-chest': {
    pathAvoidance: 0.3,
    homeProximity: 0.7,
    resourceAbundance: 0.5,
    familiarity: 0.3,
    zoneAffinity: 1.0,
  },
  'storage-box': {
    pathAvoidance: 0.3,
    homeProximity: 0.6,
    familiarity: 0.2,
    zoneAffinity: 1.0,
  },
  'campfire': {
    crowding: 0.5, // Prefer where agents gather (social building)
    pathAvoidance: -0.2, // Slight preference for accessible areas
    homeProximity: 0.4,
    positiveMemories: 0.3,
    zoneAffinity: 1.0,
  },
  'tent': {
    pathAvoidance: 0.6,
    homeProximity: 0.3,
    positiveMemories: 0.4,
    familiarity: 0.3,
    zoneAffinity: 1.0,
  },
  'well': {
    waterProximity: 1.0,
    homeProximity: 0.3,
    pathAvoidance: 0.2,
    zoneAffinity: 0.8,
  },
  'lean-to': {
    pathAvoidance: 0.4,
    familiarity: 0.3,
    zoneAffinity: 1.0,
  },
  'bed': {
    pathAvoidance: 0.8,
    homeProximity: 0.5,
    positiveMemories: 0.3,
    zoneAffinity: 1.0,
  },
  'bedroll': {
    pathAvoidance: 0.5,
    familiarity: 0.4,
    zoneAffinity: 0.8,
  },
  'forge': {
    pathAvoidance: 0.4,
    knownResources: 0.6, // Near stone/iron
    zoneAffinity: 1.0,
  },
  'workshop': {
    pathAvoidance: 0.3,
    homeProximity: 0.4,
    knownResources: 0.5,
    zoneAffinity: 1.0,
  },
  'barn': {
    pathAvoidance: 0.2,
    homeProximity: 0.3,
    zoneAffinity: 1.0,
  },
  'farm_shed': {
    fertility: 0.8,
    waterProximity: 0.5,
    pathAvoidance: 0.3,
    zoneAffinity: 1.0,
  },
};

/**
 * Resource types relevant for each building
 */
const BUILDING_RESOURCE_AFFINITY: Partial<Record<BuildingType, AreaResourceType[]>> = {
  'forge': ['stone'],
  'workshop': ['wood', 'stone'],
  'farm_shed': ['food'],
  'well': ['water'],
};

// ============================================================================
// PlacementScorer Class
// ============================================================================

interface WorldWithTerrain extends World {
  getTerrainAt?(x: number, y: number): TerrainType | null;
  getTileData?(x: number, y: number): { fertility?: number; moisture?: number } | null;
}

export class PlacementScorer {
  private world: WorldWithTerrain;
  private mapKnowledge = getMapKnowledge();
  private zoneManager = getZoneManager();

  constructor(world: World) {
    this.world = world as WorldWithTerrain;
  }

  /**
   * Score a single tile for building placement
   * @returns Score (higher = better), or null if constraints fail
   */
  scoreTile(
    agent: EntityImpl,
    buildingType: BuildingType,
    x: number,
    y: number
  ): PlacementCandidate | null {
    const reasons: string[] = [];

    // 1. Check hard constraints first
    const constraints = BUILDING_CONSTRAINTS[buildingType] ?? [];
    for (const constraint of constraints) {
      if (!this.checkConstraint(constraint, x, y, agent)) {
        return null; // Constraint failed
      }
    }

    // Check no overlapping buildings
    if (this.hasOverlappingBuilding(x, y)) {
      return null;
    }

    // 2. Calculate utility score from layers
    const weights = BUILDING_UTILITY_WEIGHTS[buildingType] ?? {};
    let score = 0;

    // World layers
    if (weights.fertility) {
      const fertility = this.getFertility(x, y);
      const contribution = fertility * weights.fertility;
      score += contribution;
      if (contribution > 5) reasons.push(`fertile soil (+${contribution.toFixed(0)})`);
    }

    if (weights.waterProximity) {
      const waterScore = this.getWaterProximity(x, y);
      const contribution = waterScore * weights.waterProximity;
      score += contribution;
      if (contribution > 5) reasons.push(`near water (+${contribution.toFixed(0)})`);
    }

    if (weights.pathAvoidance) {
      const pathScore = this.getPathAvoidance(x, y);
      const contribution = pathScore * weights.pathAvoidance;
      score += contribution;
      if (contribution < -10) reasons.push(`on path (${contribution.toFixed(0)})`);
    }

    if (weights.crowding) {
      const crowdingScore = this.getCrowding(x, y);
      const contribution = crowdingScore * weights.crowding;
      score += contribution;
      if (contribution > 5) reasons.push(`gathering spot (+${contribution.toFixed(0)})`);
    }

    if (weights.resourceAbundance) {
      const resourceTypes = BUILDING_RESOURCE_AFFINITY[buildingType] ?? [];
      let resourceScore = 0;
      for (const rt of resourceTypes) {
        resourceScore += this.getResourceAbundance(x, y, rt);
      }
      const contribution = resourceScore * weights.resourceAbundance;
      score += contribution;
      if (contribution > 5) reasons.push(`near resources (+${contribution.toFixed(0)})`);
    }

    // Agent layers
    if (weights.homeProximity) {
      const homeScore = this.getHomeProximity(agent, x, y);
      const contribution = homeScore * weights.homeProximity;
      score += contribution;
      if (contribution > 5) reasons.push(`near home (+${contribution.toFixed(0)})`);
    }

    if (weights.familiarity) {
      const familiarityScore = this.getFamiliarity(agent, x, y);
      const contribution = familiarityScore * weights.familiarity;
      score += contribution;
      if (contribution > 3) reasons.push(`familiar area (+${contribution.toFixed(0)})`);
    }

    if (weights.positiveMemories) {
      const memoryScore = this.getPositiveMemories(agent, x, y);
      const contribution = memoryScore * weights.positiveMemories;
      score += contribution;
      if (contribution > 3) reasons.push(`good memories (+${contribution.toFixed(0)})`);
    }

    if (weights.knownResources) {
      const resourceTypes = BUILDING_RESOURCE_AFFINITY[buildingType] ?? [];
      let knownScore = 0;
      for (const rt of resourceTypes) {
        knownScore += this.getKnownResources(agent, x, y, rt);
      }
      const contribution = knownScore * weights.knownResources;
      score += contribution;
      if (contribution > 5) reasons.push(`known resources nearby (+${contribution.toFixed(0)})`);
    }

    // Zone layers
    if (weights.zoneAffinity) {
      const zoneScore = this.getZoneAffinity(x, y, buildingType);
      const contribution = zoneScore * weights.zoneAffinity;

      // Zone can completely block placement
      if (contribution === -Infinity) {
        return null;
      }

      score += contribution;
      if (contribution > 50) reasons.push(`in designated zone (+${contribution.toFixed(0)})`);
      if (contribution < -20) reasons.push(`wrong zone type (${contribution.toFixed(0)})`);
    } else {
      // Even without weight, check zone restrictions
      const zoneScore = this.getZoneAffinity(x, y, buildingType);
      if (zoneScore === -Infinity) {
        return null;
      }
    }

    return { x, y, score, reasons };
  }

  /**
   * Find the best placement location for a building
   * @param agent - The agent placing the building
   * @param buildingType - Type of building to place
   * @param searchRadius - Radius in tiles to search around agent
   * @returns Best placement candidate, or null if none found
   */
  findBestPlacement(
    agent: EntityImpl,
    buildingType: BuildingType,
    searchRadius: number = 10
  ): PlacementCandidate | null {
    const position = agent.getComponent<PositionComponent>('position');
    if (!position) return null;

    const candidates: PlacementCandidate[] = [];

    // Score tiles in radius around agent
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const x = Math.floor(position.x) + dx;
        const y = Math.floor(position.y) + dy;

        const candidate = this.scoreTile(agent, buildingType, x, y);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] ?? null;
  }

  /**
   * Find top N placement candidates
   */
  findTopPlacements(
    agent: EntityImpl,
    buildingType: BuildingType,
    searchRadius: number = 10,
    count: number = 5
  ): PlacementCandidate[] {
    const position = agent.getComponent<PositionComponent>('position');
    if (!position) return [];

    const candidates: PlacementCandidate[] = [];

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const x = Math.floor(position.x) + dx;
        const y = Math.floor(position.y) + dy;

        const candidate = this.scoreTile(agent, buildingType, x, y);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, count);
  }

  // ==========================================================================
  // Constraint Checking
  // ==========================================================================

  private checkConstraint(
    constraint: PlacementConstraint,
    x: number,
    y: number,
    _agent: EntityImpl
  ): boolean {
    switch (constraint.type) {
      case 'terrain': {
        const terrain = this.world.getTerrainAt?.(x, y);
        if (!terrain) return false;
        return constraint.allowed.includes(terrain as TerrainType);
      }

      case 'terrain_forbidden': {
        const terrain = this.world.getTerrainAt?.(x, y);
        if (!terrain) return true; // Unknown terrain passes
        return !constraint.forbidden.includes(terrain as TerrainType);
      }

      case 'min_fertility': {
        const fertility = this.getFertility(x, y);
        return fertility >= constraint.value;
      }

      case 'no_path_traffic': {
        const traffic = this.getPathTraffic(x, y);
        return traffic <= constraint.maxTraffic;
      }

      case 'prefer_high_traffic': {
        const traffic = this.getPathTraffic(x, y);
        return traffic >= constraint.minTraffic;
      }

      case 'near_water': {
        const waterProx = this.getWaterProximity(x, y);
        return waterProx > 0; // Any water proximity is good enough
      }

      case 'near_storage': {
        const storageBuildings = this.world.query()
          .with('building')
          .with('inventory')
          .with('position')
          .executeEntities();

        for (const storage of storageBuildings) {
          const sPos = getPosition(storage);
          if (!sPos) continue;

          const dist = Math.sqrt((sPos.x - x) ** 2 + (sPos.y - y) ** 2);
          if (dist <= constraint.maxDistance) {
            return true;
          }
        }
        return false;
      }

      case 'min_accessibility': {
        // Count adjacent open tiles
        let openCount = 0;
        const adjacents = [
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        ];

        for (const adj of adjacents) {
          const terrain = this.world.getTerrainAt?.(x + adj.dx, y + adj.dy);
          if (terrain && terrain !== 'water' && terrain !== 'deep_water') {
            if (!this.hasOverlappingBuilding(x + adj.dx, y + adj.dy)) {
              openCount++;
            }
          }
        }
        return openCount >= constraint.value;
      }

      case 'min_crowding': {
        const { sectorX, sectorY } = worldToSector(x, y);
        const sector = this.mapKnowledge.getSector(sectorX, sectorY);
        return sector.currentOccupancy >= constraint.value;
      }

      default:
        return true;
    }
  }

  private hasOverlappingBuilding(x: number, y: number): boolean {
    const buildings = this.world.query()
      .with('building')
      .with('position')
      .executeEntities();

    for (const building of buildings) {
      const bPos = getPosition(building);
      if (bPos && Math.abs(bPos.x - x) < 2 && Math.abs(bPos.y - y) < 2) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // World Layer Getters
  // ==========================================================================

  private getFertility(x: number, y: number): number {
    const tileData = this.world.getTileData?.(x, y);
    return tileData?.fertility ?? 50; // Default moderate fertility
  }

  private getWaterProximity(x: number, y: number): number {
    // Check nearby tiles for water
    const searchRadius = 5;
    let minDist = Infinity;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const terrain = this.world.getTerrainAt?.(x + dx, y + dy);
        if (terrain === 'water' || terrain === 'deep_water') {
          const dist = Math.sqrt(dx * dx + dy * dy);
          minDist = Math.min(minDist, dist);
        }
      }
    }

    if (minDist === Infinity) return 0;
    return Math.max(0, 100 - minDist * 20);
  }

  private getPathTraffic(x: number, y: number): number {
    const { sectorX, sectorY } = worldToSector(x, y);
    const sector = this.mapKnowledge.getSector(sectorX, sectorY);

    let totalTraffic = 0;
    for (const [, traffic] of sector.pathTraffic) {
      totalTraffic += traffic;
    }

    return totalTraffic;
  }

  private getPathAvoidance(x: number, y: number): number {
    const traffic = this.getPathTraffic(x, y);
    // High traffic = negative score (want to avoid)
    return -traffic * 0.1;
  }

  private getCrowding(x: number, y: number): number {
    const { sectorX, sectorY } = worldToSector(x, y);
    const sector = this.mapKnowledge.getSector(sectorX, sectorY);
    return sector.currentOccupancy * 10;
  }

  private getResourceAbundance(x: number, y: number, resourceType: AreaResourceType): number {
    const { sectorX, sectorY } = worldToSector(x, y);
    const sector = this.mapKnowledge.getSector(sectorX, sectorY);
    return sector.resourceAbundance.get(resourceType) ?? 0;
  }

  // ==========================================================================
  // Agent Layer Getters
  // ==========================================================================

  private getHomeProximity(agent: EntityImpl, x: number, y: number): number {
    const exploration = agent.getComponent<ExplorationStateComponent>('exploration_state');
    const homeBase = exploration?.homeBase;

    if (!homeBase) {
      // No home base - use agent's current position
      const pos = agent.getComponent<PositionComponent>('position');
      if (!pos) return 0;

      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      return Math.max(0, 50 - dist);
    }

    const dist = Math.sqrt((homeBase.x - x) ** 2 + (homeBase.y - y) ** 2);
    return Math.max(0, 100 - dist * 2);
  }

  private getFamiliarity(agent: EntityImpl, x: number, y: number): number {
    const exploration = agent.getComponent<ExplorationStateComponent>('exploration_state');
    if (!exploration) return 0;

    const sector = exploration.worldToSector({ x, y });
    const sectorInfo = exploration.getSectorInfo(sector.x, sector.y);

    if (!sectorInfo) return 0;

    // More visits = more familiar
    return Math.min(30, sectorInfo.explorationCount * 5);
  }

  private getPositiveMemories(agent: EntityImpl, x: number, y: number): number {
    const memory = agent.getComponent<EpisodicMemoryComponent>('episodic_memory');
    if (!memory) return 0;

    let score = 0;
    const searchRadius = 5;

    for (const m of memory.episodicMemories) {
      if (!m.location) continue;

      const dist = Math.sqrt((m.location.x - x) ** 2 + (m.location.y - y) ** 2);
      if (dist > searchRadius) continue;

      // Positive memories add to score, weighted by importance
      if (m.emotionalValence > 0) {
        score += m.emotionalValence * m.importance * 10;
      }
    }

    return score;
  }

  private getKnownResources(
    agent: EntityImpl,
    x: number,
    y: number,
    resourceType: string
  ): number {
    const spatialMem = agent.getComponent<SpatialMemoryComponent>('spatial_memory');
    if (!spatialMem) return 0;

    let score = 0;
    const searchRadius = 8;

    // Query memories for this resource type
    const memories = spatialMem.queryResourceLocations(resourceType as any);

    for (const m of memories) {
      const dist = Math.sqrt((m.position.x - x) ** 2 + (m.position.y - y) ** 2);
      if (dist <= searchRadius) {
        score += m.confidence * 20;
      }
    }

    return score;
  }

  // ==========================================================================
  // Zone Layer Getters
  // ==========================================================================

  private getZoneAffinity(x: number, y: number, buildingType: BuildingType): number {
    return this.zoneManager.getZonePlacementScore(x, y, buildingType);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a PlacementScorer for the given world
 */
export function createPlacementScorer(world: World): PlacementScorer {
  return new PlacementScorer(world);
}

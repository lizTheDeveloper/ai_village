/**
 * MapKnowledge - World-level knowledge stored in the map itself
 *
 * This system stores stigmergic (ant-trail-like) knowledge that emerges from
 * agent behavior and is shared implicitly through the environment:
 *
 * 1. Worn Paths - Traffic counts that create pathfinding preferences
 * 2. Resource Areas - Region-level resource knowledge (not individual entities)
 * 3. Crowd Density - Where agents cluster (for dispersion)
 *
 * This is the "Dwarf Fortress" approach: the map knows things, agents query it.
 * Agents don't each maintain their own copy of world knowledge.
 *
 * Key insight: Agents share "berries up north" not "berries at (45, 32)".
 * The map knows regions; agents reason about areas.
 */

// Sector size: 16x16 tiles (coarser than tiles, finer than chunks)
export const SECTOR_SIZE = 16;

/**
 * Cardinal + ordinal directions for path edges
 */
export type Direction = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const DIRECTIONS: Direction[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

/**
 * Resource types that can be tracked at area level
 */
export type AreaResourceType = 'food' | 'wood' | 'stone' | 'water' | 'minerals';

/**
 * A sector is a 16x16 region of the map with aggregate knowledge
 */
export interface Sector {
  /** Sector coordinates (not world coordinates) */
  readonly x: number;
  readonly y: number;

  /** Traffic count to each neighboring sector (worn paths) */
  pathTraffic: Map<Direction, number>;

  /** Resource abundance by type (0-100 scale, decays over time) */
  resourceAbundance: Map<AreaResourceType, number>;

  /** Last tick this sector was visited by any agent */
  lastVisited: number;

  /** Number of agents currently in this sector */
  currentOccupancy: number;

  /** Whether this sector has been explored by anyone */
  explored: boolean;

  /** Human-readable name if assigned (e.g., "north forest", "river bend") */
  areaName?: string;

  // ============================================================================
  // Terrain data for elevation-based pathfinding
  // ============================================================================

  /** Average elevation of tiles in this sector (0 = sea level) */
  averageElevation: number;

  /** Minimum elevation in sector (for cliff detection) */
  minElevation: number;

  /** Maximum elevation in sector (for peak detection) */
  maxElevation: number;

  /** Ratio of water tiles in this sector (0-1, 1 = all water) */
  waterRatio: number;

  /** Whether terrain data has been calculated for this sector */
  terrainCalculated: boolean;
}

/**
 * Create a new empty sector
 */
function createSector(sectorX: number, sectorY: number): Sector {
  return {
    x: sectorX,
    y: sectorY,
    pathTraffic: new Map(),
    resourceAbundance: new Map(),
    lastVisited: -1,
    currentOccupancy: 0,
    explored: false,
    // Terrain data - defaults to sea level, no water
    averageElevation: 0,
    minElevation: 0,
    maxElevation: 0,
    waterRatio: 0,
    terrainCalculated: false,
  };
}

/**
 * Get sector key for Map storage
 */
export function getSectorKey(sectorX: number, sectorY: number): string {
  return `${sectorX},${sectorY}`;
}

/**
 * Convert world coordinates to sector coordinates
 */
export function worldToSector(worldX: number, worldY: number): { sectorX: number; sectorY: number } {
  return {
    sectorX: Math.floor(worldX / SECTOR_SIZE),
    sectorY: Math.floor(worldY / SECTOR_SIZE),
  };
}

/**
 * Convert sector coordinates to world center
 */
export function sectorToWorld(sectorX: number, sectorY: number): { worldX: number; worldY: number } {
  return {
    worldX: sectorX * SECTOR_SIZE + SECTOR_SIZE / 2,
    worldY: sectorY * SECTOR_SIZE + SECTOR_SIZE / 2,
  };
}

/**
 * Get direction from one sector to an adjacent sector
 */
function getDirection(fromX: number, fromY: number, toX: number, toY: number): Direction | null {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (dx === 0 && dy === -1) return 'n';
  if (dx === 1 && dy === -1) return 'ne';
  if (dx === 1 && dy === 0) return 'e';
  if (dx === 1 && dy === 1) return 'se';
  if (dx === 0 && dy === 1) return 's';
  if (dx === -1 && dy === 1) return 'sw';
  if (dx === -1 && dy === 0) return 'w';
  if (dx === -1 && dy === -1) return 'nw';

  return null; // Not adjacent
}

/**
 * Get opposite direction
 */
function oppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    n: 's',
    ne: 'sw',
    e: 'w',
    se: 'nw',
    s: 'n',
    sw: 'ne',
    w: 'e',
    nw: 'se',
  };
  return opposites[dir];
}

/**
 * Get neighbor sector coordinates for a direction
 */
function getNeighborCoords(sectorX: number, sectorY: number, dir: Direction): { x: number; y: number } {
  const offsets: Record<Direction, { dx: number; dy: number }> = {
    n: { dx: 0, dy: -1 },
    ne: { dx: 1, dy: -1 },
    e: { dx: 1, dy: 0 },
    se: { dx: 1, dy: 1 },
    s: { dx: 0, dy: 1 },
    sw: { dx: -1, dy: 1 },
    w: { dx: -1, dy: 0 },
    nw: { dx: -1, dy: -1 },
  };
  const offset = offsets[dir];
  return { x: sectorX + offset.dx, y: sectorY + offset.dy };
}

/**
 * MapKnowledge - World-level knowledge store
 *
 * Usage:
 * ```typescript
 * const mapKnowledge = new MapKnowledge();
 *
 * // Agent moves between sectors - record traffic
 * mapKnowledge.recordTraversal(fromX, fromY, toX, toY, tick);
 *
 * // Agent finds resources - record at area level
 * mapKnowledge.recordResourceSighting(worldX, worldY, 'food', abundance, tick);
 *
 * // Query: "Where's food?"
 * const areas = mapKnowledge.findResourceAreas('food', agentX, agentY, maxDistance);
 *
 * // Query: "Best path to sector (5, 3)?"
 * const pathWeight = mapKnowledge.getPathWeight(fromSectorX, fromSectorY, direction);
 * ```
 */
export class MapKnowledge {
  private sectors: Map<string, Sector> = new Map();

  /**
   * Decay rate for path traffic (per decay() call, typically every 100 ticks).
   * 0.001 = half-life of ~700 decay calls = ~70000 ticks = ~1 hour at 20 TPS.
   * Paths fade slowly over an in-game day, but constant traffic keeps them fresh.
   */
  private readonly trafficDecayRate = 0.001;

  /** Decay rate for resource abundance (per tick) */
  private readonly resourceDecayRate = 0.002;

  /** Maximum traffic value (0-1 normalized like pheromone intensity) */
  private readonly maxTraffic = 1.0;

  /** Traffic increment per traversal (2 people walking through = fresh path) */
  private readonly trafficIncrement = 0.5;

  /**
   * Get or create a sector
   */
  getSector(sectorX: number, sectorY: number): Sector {
    const key = getSectorKey(sectorX, sectorY);
    let sector = this.sectors.get(key);
    if (!sector) {
      sector = createSector(sectorX, sectorY);
      this.sectors.set(key, sector);
    }
    return sector;
  }

  /**
   * Record an agent traversing from one sector to another.
   * This creates/reinforces worn paths.
   */
  recordTraversal(fromWorldX: number, fromWorldY: number, toWorldX: number, toWorldY: number, tick: number): void {
    const from = worldToSector(fromWorldX, fromWorldY);
    const to = worldToSector(toWorldX, toWorldY);

    // Only record if crossing sector boundary
    if (from.sectorX === to.sectorX && from.sectorY === to.sectorY) {
      // Same sector - just update visit time
      const sector = this.getSector(from.sectorX, from.sectorY);
      sector.lastVisited = tick;
      return;
    }

    // Record traversal in both directions (bidirectional path)
    const direction = getDirection(from.sectorX, from.sectorY, to.sectorX, to.sectorY);
    if (!direction) return; // Not adjacent

    // Increment traffic from -> to (0-1 normalized pheromone)
    const fromSector = this.getSector(from.sectorX, from.sectorY);
    const currentTraffic = fromSector.pathTraffic.get(direction) ?? 0;
    fromSector.pathTraffic.set(direction, Math.min(currentTraffic + this.trafficIncrement, this.maxTraffic));
    fromSector.lastVisited = tick;

    // Increment traffic to -> from (paths are bidirectional)
    const toSector = this.getSector(to.sectorX, to.sectorY);
    const reverseDirection = oppositeDirection(direction);
    const reverseTraffic = toSector.pathTraffic.get(reverseDirection) ?? 0;
    toSector.pathTraffic.set(reverseDirection, Math.min(reverseTraffic + this.trafficIncrement, this.maxTraffic));
    toSector.lastVisited = tick;
    toSector.explored = true;
  }

  /**
   * Record a resource sighting at area level.
   * Called when any agent sees resources - the map "learns" where resources are.
   */
  recordResourceSighting(
    worldX: number,
    worldY: number,
    resourceType: AreaResourceType,
    abundance: number,
    tick: number
  ): void {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const sector = this.getSector(sectorX, sectorY);

    // Update abundance (weighted average with new sighting)
    const current = sector.resourceAbundance.get(resourceType) ?? 0;
    const updated = current * 0.7 + abundance * 0.3; // Smooth update
    sector.resourceAbundance.set(resourceType, Math.min(100, updated));

    sector.lastVisited = tick;
    sector.explored = true;
  }

  /**
   * Record resource depletion (agent found nothing where expected)
   */
  recordResourceDepletion(worldX: number, worldY: number, resourceType: AreaResourceType, tick: number): void {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const sector = this.getSector(sectorX, sectorY);

    // Reduce abundance significantly
    const current = sector.resourceAbundance.get(resourceType) ?? 0;
    sector.resourceAbundance.set(resourceType, current * 0.3);
    sector.lastVisited = tick;
  }

  /**
   * Update agent occupancy in a sector
   */
  updateOccupancy(worldX: number, worldY: number, delta: number): void {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const sector = this.getSector(sectorX, sectorY);
    sector.currentOccupancy = Math.max(0, sector.currentOccupancy + delta);
  }

  /**
   * Update terrain data for a sector from tile information.
   * Called during terrain generation or when a sector is first visited.
   *
   * @param sectorX - Sector X coordinate
   * @param sectorY - Sector Y coordinate
   * @param tiles - Array of tile data with elevation and terrain type
   */
  updateSectorTerrain(
    sectorX: number,
    sectorY: number,
    tiles: Array<{ elevation: number; terrain: string }>
  ): void {
    const sector = this.getSector(sectorX, sectorY);

    if (tiles.length === 0) return;

    let totalElevation = 0;
    let minElev = Infinity;
    let maxElev = -Infinity;
    let waterCount = 0;

    for (const tile of tiles) {
      totalElevation += tile.elevation;
      minElev = Math.min(minElev, tile.elevation);
      maxElev = Math.max(maxElev, tile.elevation);
      if (tile.terrain === 'water') {
        waterCount++;
      }
    }

    sector.averageElevation = totalElevation / tiles.length;
    sector.minElevation = minElev;
    sector.maxElevation = maxElev;
    sector.waterRatio = waterCount / tiles.length;
    sector.terrainCalculated = true;
  }

  /**
   * Calculate elevation cost for moving between sectors.
   * Uphill is harder (positive cost), downhill is easier (negative/zero cost).
   *
   * @param fromElevation - Starting sector elevation
   * @param toElevation - Destination sector elevation
   * @returns Cost modifier (0-1 range, higher = harder)
   */
  private calculateElevationCost(fromElevation: number, toElevation: number): number {
    const elevationDiff = toElevation - fromElevation;

    if (elevationDiff <= 0) {
      // Downhill or flat - no extra cost (actually slightly easier)
      // Going downhill reduces cost by up to 0.1
      return Math.max(-0.1, elevationDiff * 0.02);
    }

    // Uphill - each level of elevation adds cost
    // 1 level up = 0.05 cost, 5 levels up = 0.25 cost, 10 levels = 0.5 cost
    return Math.min(0.5, elevationDiff * 0.05);
  }

  /**
   * Get path weight for pathfinding (no goal - exploration mode).
   * Used when wandering without a specific destination.
   *
   * Factors:
   * - Traffic (worn paths are easier)
   * - Elevation (uphill is harder, downhill is easier)
   * - Water (mostly water = very high cost / impassable)
   */
  getPathWeight(sectorX: number, sectorY: number, direction: Direction): number {
    const sector = this.getSector(sectorX, sectorY);
    const traffic = sector.pathTraffic.get(direction) ?? 0;

    // Get neighbor sector for elevation comparison
    const neighbor = getNeighborCoords(sectorX, sectorY, direction);
    const neighborSector = this.getSector(neighbor.x, neighbor.y);

    // Water blocking: sectors that are mostly water are nearly impassable
    if (neighborSector.terrainCalculated && neighborSector.waterRatio > 0.7) {
      return 10.0; // Very high cost - effectively blocked
    }

    // Base cost from traffic (worn paths)
    // traffic 0 → cost 1.0 (no path)
    // traffic 0.5 → cost 0.75
    // traffic 1.0 → cost 0.5 (well-worn path)
    const freshnessBonus = traffic * 0.5;
    let baseCost = 1.0 - freshnessBonus;

    // Add elevation cost if terrain data is available
    if (sector.terrainCalculated && neighborSector.terrainCalculated) {
      const elevationCost = this.calculateElevationCost(
        sector.averageElevation,
        neighborSector.averageElevation
      );
      baseCost += elevationCost;
    }

    // Partial water adds some cost (wading through shallow water)
    if (neighborSector.terrainCalculated && neighborSector.waterRatio > 0.3) {
      baseCost += neighborSector.waterRatio * 0.5;
    }

    return Math.max(0.1, baseCost);
  }

  /**
   * Get path weight with goal alignment factored in.
   *
   * Key insight: Goal direction ALWAYS wins over path freshness, but only barely.
   * This means agents will take small detours onto worn paths, but never
   * circuitous routes. Direct line to goal beats even the freshest path.
   *
   * Factors:
   * - Goal alignment (55% weight) - moving toward goal
   * - Path freshness (30% weight) - worn paths are easier
   * - Elevation (15% weight) - uphill is harder
   * - Water blocking - mostly water = impassable
   *
   * @param sectorX - Current sector X
   * @param sectorY - Current sector Y
   * @param direction - Direction of travel
   * @param goalX - Goal sector X
   * @param goalY - Goal sector Y
   * @returns Path weight (lower = better)
   */
  getPathWeightWithGoal(
    sectorX: number,
    sectorY: number,
    direction: Direction,
    goalX: number,
    goalY: number
  ): number {
    const sector = this.getSector(sectorX, sectorY);
    const traffic = sector.pathTraffic.get(direction) ?? 0;

    // Get neighbor coords in this direction
    const neighbor = getNeighborCoords(sectorX, sectorY, direction);
    const neighborSector = this.getSector(neighbor.x, neighbor.y);

    // Water blocking: sectors that are mostly water are nearly impassable
    if (neighborSector.terrainCalculated && neighborSector.waterRatio > 0.7) {
      return 10.0; // Very high cost - effectively blocked
    }

    // Calculate how well this direction aligns with goal
    // Distance from current to goal
    const currentDistSq = (goalX - sectorX) ** 2 + (goalY - sectorY) ** 2;
    // Distance from neighbor to goal
    const neighborDistSq = (goalX - neighbor.x) ** 2 + (goalY - neighbor.y) ** 2;

    // Goal alignment: 1.0 if moving closer, 0.0 if moving away
    // Normalize to 0-1 range
    let goalAlignment = 0.5;
    if (currentDistSq > 0) {
      const improvement = currentDistSq - neighborDistSq;
      // improvement > 0 means getting closer
      // Max improvement is ~2 (diagonal move toward goal)
      goalAlignment = Math.min(1.0, Math.max(0.0, 0.5 + improvement / 4));
    }

    // Calculate elevation penalty (0 to 0.15)
    let elevationPenalty = 0;
    if (sector.terrainCalculated && neighborSector.terrainCalculated) {
      const elevationCost = this.calculateElevationCost(
        sector.averageElevation,
        neighborSector.averageElevation
      );
      // Scale to 0-0.15 range (15% of total weight)
      elevationPenalty = Math.max(0, elevationCost * 0.3);
    }

    // Combine: 30% freshness, 55% goal alignment
    // Remaining ~15% is elevation penalty
    const freshnessBonus = traffic * 0.30; // 0 to 0.30
    const alignmentBonus = goalAlignment * 0.55; // 0 to 0.55
    const totalBonus = freshnessBonus + alignmentBonus - elevationPenalty;

    // Partial water adds cost
    let waterCost = 0;
    if (neighborSector.terrainCalculated && neighborSector.waterRatio > 0.3) {
      waterCost = neighborSector.waterRatio * 0.3;
    }

    // Base cost 1.0, reduced by combined bonus, increased by water
    return Math.max(0.1, 1.0 - totalBonus + waterCost);
  }

  /**
   * Find sectors with a specific resource type.
   * Returns sectors sorted by abundance × proximity score.
   */
  findResourceAreas(
    resourceType: AreaResourceType,
    fromWorldX: number,
    fromWorldY: number,
    maxSectors: number = 5
  ): Array<{ sectorX: number; sectorY: number; abundance: number; distance: number; direction: string }> {
    const from = worldToSector(fromWorldX, fromWorldY);
    const results: Array<{
      sectorX: number;
      sectorY: number;
      abundance: number;
      distance: number;
      direction: string;
    }> = [];

    for (const [, sector] of this.sectors) {
      const abundance = sector.resourceAbundance.get(resourceType) ?? 0;
      if (abundance < 10) continue; // Ignore very low abundance

      const dx = sector.x - from.sectorX;
      const dy = sector.y - from.sectorY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate cardinal direction
      const direction = this.getCardinalDirection(dx, dy);

      results.push({
        sectorX: sector.x,
        sectorY: sector.y,
        abundance,
        distance,
        direction,
      });
    }

    // Sort by abundance / distance (prefer abundant and close)
    results.sort((a, b) => {
      const scoreA = a.abundance / (1 + a.distance);
      const scoreB = b.abundance / (1 + b.distance);
      return scoreB - scoreA;
    });

    return results.slice(0, maxSectors);
  }

  /**
   * Get human-readable cardinal direction
   */
  private getCardinalDirection(dx: number, dy: number): string {
    if (dx === 0 && dy === 0) return 'here';

    const angle = Math.atan2(dy, dx);
    const degrees = ((angle * 180) / Math.PI + 360) % 360;

    if (degrees >= 337.5 || degrees < 22.5) return 'east';
    if (degrees >= 22.5 && degrees < 67.5) return 'southeast';
    if (degrees >= 67.5 && degrees < 112.5) return 'south';
    if (degrees >= 112.5 && degrees < 157.5) return 'southwest';
    if (degrees >= 157.5 && degrees < 202.5) return 'west';
    if (degrees >= 202.5 && degrees < 247.5) return 'northwest';
    if (degrees >= 247.5 && degrees < 292.5) return 'north';
    return 'northeast';
  }

  /**
   * Get area description for an agent at a position.
   * This is what agents can "know" about an area.
   */
  describeArea(worldX: number, worldY: number): string {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const sector = this.getSector(sectorX, sectorY);

    if (!sector.explored) {
      return 'unexplored area';
    }

    const parts: string[] = [];

    // Add area name if available
    if (sector.areaName) {
      parts.push(sector.areaName);
    }

    // Describe resources
    for (const [type, abundance] of sector.resourceAbundance) {
      if (abundance >= 60) {
        parts.push(`abundant ${type}`);
      } else if (abundance >= 30) {
        parts.push(`some ${type}`);
      }
    }

    // Describe crowding
    if (sector.currentOccupancy >= 5) {
      parts.push('crowded');
    } else if (sector.currentOccupancy >= 2) {
      parts.push('a few others nearby');
    }

    if (parts.length === 0) {
      return 'explored area, nothing notable';
    }

    return parts.join(', ');
  }

  /**
   * Name an area (can be done by agents or world gen)
   */
  nameArea(worldX: number, worldY: number, name: string): void {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const sector = this.getSector(sectorX, sectorY);
    sector.areaName = name;
  }

  /**
   * Decay all values over time (call periodically, e.g., every 100 ticks)
   * With 0.02 decay rate, traffic halves in ~35 ticks (under 2 seconds).
   * This prevents "sinkhole" accumulation near frequently visited destinations.
   */
  decay(tick: number): void {
    for (const [, sector] of this.sectors) {
      // Decay traffic (0-1 normalized, delete when < 1% intensity)
      for (const [dir, traffic] of sector.pathTraffic) {
        const decayed = traffic * (1 - this.trafficDecayRate);
        if (decayed < 0.01) {
          sector.pathTraffic.delete(dir);
        } else {
          sector.pathTraffic.set(dir, decayed);
        }
      }

      // Decay resource abundance (faster for old sightings)
      for (const [type, abundance] of sector.resourceAbundance) {
        const age = tick - sector.lastVisited;
        const decayMultiplier = age > 500 ? 2 : 1; // Faster decay for stale info
        const decayed = abundance * (1 - this.resourceDecayRate * decayMultiplier);
        if (decayed < 5) {
          sector.resourceAbundance.delete(type);
        } else {
          sector.resourceAbundance.set(type, decayed);
        }
      }
    }
  }

  /**
   * Get all explored sectors (for visualization/debugging)
   */
  getExploredSectors(): Sector[] {
    return Array.from(this.sectors.values()).filter((s) => s.explored);
  }

  /**
   * Get crowded sectors (for dispersion)
   */
  getCrowdedSectors(threshold: number = 3): Sector[] {
    return Array.from(this.sectors.values()).filter((s) => s.currentOccupancy >= threshold);
  }

  /**
   * Get best direction to explore from a position.
   * Prefers unexplored sectors, avoids crowded ones and water.
   */
  getBestExplorationDirection(worldX: number, worldY: number): Direction | null {
    const { sectorX, sectorY } = worldToSector(worldX, worldY);
    const currentSector = this.getSector(sectorX, sectorY);

    let bestDir: Direction | null = null;
    let bestScore = -Infinity;

    for (const dir of DIRECTIONS) {
      const neighbor = getNeighborCoords(sectorX, sectorY, dir);
      const neighborSector = this.sectors.get(getSectorKey(neighbor.x, neighbor.y));

      let score = 0;

      // Avoid water-heavy sectors
      if (neighborSector?.terrainCalculated && neighborSector.waterRatio > 0.7) {
        score -= 200; // Strong penalty for water
      }

      if (!neighborSector || !neighborSector.explored) {
        // Unexplored = high priority
        score += 100;
      } else {
        // Explored - consider other factors
        // Prefer less crowded
        score -= neighborSector.currentOccupancy * 10;

        // Prefer worn paths slightly (easier travel)
        // Traffic is now 0-1, so multiply by 10 for meaningful contribution
        const traffic = neighborSector.pathTraffic.get(oppositeDirection(dir)) ?? 0;
        score += traffic * 10;

        // Penalize uphill, prefer downhill/flat
        if (currentSector.terrainCalculated && neighborSector.terrainCalculated) {
          const elevationDiff = neighborSector.averageElevation - currentSector.averageElevation;
          score -= elevationDiff * 2; // Uphill = negative score, downhill = bonus
        }

        // Partial water penalty
        if (neighborSector.terrainCalculated && neighborSector.waterRatio > 0.3) {
          score -= neighborSector.waterRatio * 20;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  /**
   * Serialize for save/load
   */
  serialize(): object {
    const sectorsData: Array<{
      x: number;
      y: number;
      pathTraffic: Array<[Direction, number]>;
      resourceAbundance: Array<[AreaResourceType, number]>;
      lastVisited: number;
      explored: boolean;
      areaName?: string;
      // Terrain data
      averageElevation: number;
      minElevation: number;
      maxElevation: number;
      waterRatio: number;
      terrainCalculated: boolean;
    }> = [];

    for (const [, sector] of this.sectors) {
      sectorsData.push({
        x: sector.x,
        y: sector.y,
        pathTraffic: Array.from(sector.pathTraffic.entries()),
        resourceAbundance: Array.from(sector.resourceAbundance.entries()),
        lastVisited: sector.lastVisited,
        explored: sector.explored,
        areaName: sector.areaName,
        // Terrain data
        averageElevation: sector.averageElevation,
        minElevation: sector.minElevation,
        maxElevation: sector.maxElevation,
        waterRatio: sector.waterRatio,
        terrainCalculated: sector.terrainCalculated,
      });
    }

    return { sectors: sectorsData };
  }

  /**
   * Deserialize from save
   */
  static deserialize(data: { sectors: Array<any> }): MapKnowledge {
    const mapKnowledge = new MapKnowledge();

    for (const sectorData of data.sectors) {
      const sector = createSector(sectorData.x, sectorData.y);
      sector.pathTraffic = new Map(sectorData.pathTraffic);
      sector.resourceAbundance = new Map(sectorData.resourceAbundance);
      sector.lastVisited = sectorData.lastVisited;
      sector.explored = sectorData.explored;
      sector.areaName = sectorData.areaName;
      sector.currentOccupancy = 0; // Reset on load
      // Terrain data (with fallbacks for saves without terrain data)
      sector.averageElevation = sectorData.averageElevation ?? 0;
      sector.minElevation = sectorData.minElevation ?? 0;
      sector.maxElevation = sectorData.maxElevation ?? 0;
      sector.waterRatio = sectorData.waterRatio ?? 0;
      sector.terrainCalculated = sectorData.terrainCalculated ?? false;

      mapKnowledge.sectors.set(getSectorKey(sector.x, sector.y), sector);
    }

    return mapKnowledge;
  }
}

// ============================================================================
// Singleton for world-level access
// ============================================================================

let globalMapKnowledge: MapKnowledge | null = null;

/**
 * Get the global MapKnowledge instance.
 * Creates one if it doesn't exist.
 */
export function getMapKnowledge(): MapKnowledge {
  if (!globalMapKnowledge) {
    globalMapKnowledge = new MapKnowledge();
  }
  return globalMapKnowledge;
}

/**
 * Set the global MapKnowledge (e.g., when loading a save)
 */
export function setMapKnowledge(mapKnowledge: MapKnowledge): void {
  globalMapKnowledge = mapKnowledge;
}

/**
 * Reset the global MapKnowledge (e.g., for new game)
 */
export function resetMapKnowledge(): void {
  globalMapKnowledge = new MapKnowledge();
}

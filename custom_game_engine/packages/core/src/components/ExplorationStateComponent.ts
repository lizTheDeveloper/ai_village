import { ComponentBase } from '../ecs/Component.js';
import type { ResourceType } from './ResourceComponent.js';

export interface SectorInfo {
  readonly x: number; // Sector coordinates (not world coordinates)
  readonly y: number;
  readonly lastExplored: number; // Tick
  readonly explorationCount: number;
  readonly resourcesFound: ResourceType[];
}

export interface FrontierSector {
  readonly x: number;
  readonly y: number;
  readonly priority: number; // 0-1
}

/**
 * ExplorationStateComponent tracks explored territory and manages exploration algorithms
 * Uses 16x16 tile sectors for efficient coverage tracking
 */
export class ExplorationStateComponent extends ComponentBase {
  public readonly type = 'ExplorationState';
  private readonly _sectorSize: number = 16; // Tiles per sector
  private _exploredSectors: Map<string, SectorInfo> = new Map();
  private _explorationRadius: number = 64; // Default 4 sectors
  private _spiralState?: {
    homeBase: { x: number; y: number };
    step: number;
    direction: number; // 0=E, 1=N, 2=W, 3=S
    stepSize: number;
    stepsInDirection: number;
  };

  constructor() {
    super();
  }

  /**
   * Mark a sector as explored
   * @throws Error for invalid inputs
   */
  markSectorExplored(sectorX: number, sectorY: number, tick: number): void {
    if (!Number.isFinite(sectorX) || !Number.isFinite(sectorY)) {
      throw new Error('markSectorExplored requires valid finite sector coordinates');
    }

    if (sectorX < 0 || sectorY < 0) {
      throw new Error('Sector coordinates must be non-negative');
    }

    if (tick < 0) {
      throw new Error('markSectorExplored requires non-negative tick value');
    }

    const key = this._getSectorKey(sectorX, sectorY);
    const existing = this._exploredSectors.get(key);

    if (existing) {
      // Update existing sector
      this._exploredSectors.set(key, {
        ...existing,
        lastExplored: tick,
        explorationCount: existing.explorationCount + 1,
      });
    } else {
      // New sector
      this._exploredSectors.set(key, {
        x: sectorX,
        y: sectorY,
        lastExplored: tick,
        explorationCount: 1,
        resourcesFound: [],
      });
    }
  }

  /**
   * Check if a sector has been explored
   */
  isSectorExplored(sectorX: number, sectorY: number): boolean {
    const key = this._getSectorKey(sectorX, sectorY);
    return this._exploredSectors.has(key);
  }

  /**
   * Check if a sector should be revisited (>500 ticks since last visit)
   */
  shouldRevisitSector(sectorX: number, sectorY: number, currentTick: number): boolean {
    const key = this._getSectorKey(sectorX, sectorY);
    const sector = this._exploredSectors.get(key);

    if (!sector) {
      return true; // Never explored, should visit
    }

    const timeSinceExplored = currentTick - sector.lastExplored;
    return timeSinceExplored > 500; // Allow revisit after 500 ticks
  }

  /**
   * Get frontier sectors (unexplored adjacent to explored)
   */
  getFrontierSectors(): FrontierSector[] {
    const frontier: FrontierSector[] = [];
    const checked = new Set<string>();

    // Check all explored sectors for unexplored neighbors
    for (const sector of this._exploredSectors.values()) {
      const neighbors = [
        { x: sector.x - 1, y: sector.y },     // West
        { x: sector.x + 1, y: sector.y },     // East
        { x: sector.x, y: sector.y - 1 },     // North
        { x: sector.x, y: sector.y + 1 },     // South
        { x: sector.x - 1, y: sector.y - 1 }, // NW
        { x: sector.x + 1, y: sector.y - 1 }, // NE
        { x: sector.x - 1, y: sector.y + 1 }, // SW
        { x: sector.x + 1, y: sector.y + 1 }, // SE
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.y < 0) continue;

        const key = this._getSectorKey(neighbor.x, neighbor.y);
        if (!this._exploredSectors.has(key) && !checked.has(key)) {
          checked.add(key);
          frontier.push({
            x: neighbor.x,
            y: neighbor.y,
            priority: 0.8, // High priority for frontier
          });
        }
      }
    }

    return frontier;
  }

  /**
   * Record a resource found in a sector
   */
  recordResourceFound(sectorX: number, sectorY: number, resourceType: ResourceType, tick: number): void {
    const key = this._getSectorKey(sectorX, sectorY);
    const sector = this._exploredSectors.get(key);

    if (!sector) {
      // Mark sector as explored first
      this.markSectorExplored(sectorX, sectorY, tick);
      const newSector = this._exploredSectors.get(key);
      if (newSector) {
        this._exploredSectors.set(key, {
          ...newSector,
          resourcesFound: [resourceType],
        });
      }
    } else {
      // Add resource if not already recorded
      if (!sector.resourcesFound.includes(resourceType)) {
        this._exploredSectors.set(key, {
          ...sector,
          resourcesFound: [...sector.resourcesFound, resourceType],
        });
      }
    }
  }

  /**
   * Get sector information
   */
  getSectorInfo(sectorX: number, sectorY: number): SectorInfo | undefined {
    const key = this._getSectorKey(sectorX, sectorY);
    return this._exploredSectors.get(key);
  }

  /**
   * Set exploration radius (in tiles)
   * @throws Error for invalid radius
   */
  setExplorationRadius(radius: number): void {
    if (radius < 0) {
      throw new Error('Exploration radius must be non-negative');
    }
    this._explorationRadius = radius;
  }

  /**
   * Get exploration radius (in tiles)
   */
  getExplorationRadius(): number {
    return this._explorationRadius;
  }

  /**
   * Update exploration radius based on settlement size
   */
  updateExplorationRadius(settlementSize: number): void {
    // Base radius of 64 tiles, increases with settlement
    // Formula: 64 + sqrt(settlementSize) * 8
    const baseRadius = 64;
    const scaledRadius = baseRadius + Math.sqrt(settlementSize) * 8;
    this._explorationRadius = Math.max(this._explorationRadius, scaledRadius);
  }

  /**
   * Initialize spiral exploration from home base
   */
  initializeSpiral(homeBase: { x: number; y: number }): void {
    this._spiralState = {
      homeBase,
      step: 0,
      direction: 0, // Start moving East
      stepSize: 1,
      stepsInDirection: 0,
    };
  }

  /**
   * Get next position in spiral pattern
   * @throws Error if spiral not initialized
   */
  getNextSpiralPosition(): { x: number; y: number } | undefined {
    if (!this._spiralState) {
      throw new Error('Spiral exploration not initialized. Call initializeSpiral() first');
    }

    const { homeBase, direction, stepSize, stepsInDirection } = this._spiralState;

    // Calculate offset based on direction
    const offsets = [
      { x: 1, y: 0 },  // East
      { x: 0, y: -1 }, // North
      { x: -1, y: 0 }, // West
      { x: 0, y: 1 },  // South
    ];

    const offset = offsets[direction];
    if (!offset) {
      throw new Error(`Invalid direction: ${direction}`);
    }
    const currentStep = this._spiralState.step;

    // Calculate position
    const position = {
      x: homeBase.x + offset.x * (stepsInDirection + 1) * this._sectorSize,
      y: homeBase.y + offset.y * (stepsInDirection + 1) * this._sectorSize,
    };

    // Update spiral state
    const newStepsInDirection = stepsInDirection + 1;

    if (newStepsInDirection >= stepSize) {
      // Change direction
      const newDirection = (direction + 1) % 4;
      const newStepSize = (newDirection % 2 === 0) ? stepSize + 1 : stepSize;

      this._spiralState = {
        ...this._spiralState,
        step: currentStep + 1,
        direction: newDirection,
        stepSize: newStepSize,
        stepsInDirection: 0,
      };
    } else {
      this._spiralState = {
        ...this._spiralState,
        step: currentStep + 1,
        stepsInDirection: newStepsInDirection,
      };
    }

    return position;
  }

  /**
   * Reset spiral state to start over
   */
  resetSpiral(): void {
    if (this._spiralState) {
      this._spiralState = {
        ...this._spiralState,
        step: 0,
        direction: 0,
        stepSize: 1,
        stepsInDirection: 0,
      };
    }
  }

  /**
   * Get total number of explored sectors
   */
  getExploredSectorCount(): number {
    return this._exploredSectors.size;
  }

  /**
   * Calculate exploration coverage (0-1)
   */
  getExplorationCoverage(): number {
    const radiusInSectors = Math.ceil(this._explorationRadius / this._sectorSize);
    const totalSectors = (radiusInSectors * 2 + 1) ** 2;
    return Math.min(1.0, this._exploredSectors.size / totalSectors);
  }

  /**
   * Get sector priority for exploration
   */
  getSectorPriority(sectorX: number, sectorY: number, currentTick?: number): number {
    const sector = this.getSectorInfo(sectorX, sectorY);

    // Unexplored sectors have high priority
    if (!sector) {
      // Check if it's a frontier sector
      const frontier = this.getFrontierSectors();
      const isFrontier = frontier.some(f => f.x === sectorX && f.y === sectorY);
      return isFrontier ? 0.8 : 0.5;
    }

    // Recently explored have low priority
    if (currentTick !== undefined) {
      const timeSince = currentTick - sector.lastExplored;
      if (timeSince < 500) {
        return 0.1;
      }
    }

    // Sectors with known resources have medium priority for revisit
    if (sector.resourcesFound.length > 0) {
      return 0.6;
    }

    return 0.3; // Default low priority for explored sectors
  }

  /**
   * Generate sector key for map storage
   */
  private _getSectorKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Convert world position to sector coordinates
   */
  worldToSector(worldPos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x / this._sectorSize),
      y: Math.floor(worldPos.y / this._sectorSize),
    };
  }

  /**
   * Convert sector coordinates to world position (center of sector)
   */
  sectorToWorld(sector: { x: number; y: number }): { x: number; y: number } {
    return {
      x: sector.x * this._sectorSize + this._sectorSize / 2,
      y: sector.y * this._sectorSize + this._sectorSize / 2,
    };
  }
}
